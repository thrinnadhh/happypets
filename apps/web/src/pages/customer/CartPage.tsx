import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { PinLocationMap } from "@/components/maps/PinLocationMap";
import { PageTransition } from "@/components/common/PageTransition";
import { Navbar } from "@/components/layout/Navbar";
import { useCart } from "@/contexts/CartContext";
import { calculateDiscountedPrice, formatInr, isProductExpired } from "@/lib/commerce";
import { quoteDeliveryInSupabase, searchDeliveryAddressesInSupabase } from "@/lib/supabase";
import { LatLng, getDefaultIndiaCenter, hasTomTomPublicKey, reverseGeocodeTomTom } from "@/lib/tomtom";
import { DeliveryAddressSuggestion, DeliveryQuote } from "@/types";

function mapCheckoutIssue(issue: unknown): { error: string; notice: string } {
  const message = issue instanceof Error ? issue.message : "Unable to complete payment.";

  if (message.toLowerCase().includes("authorized but not captured")) {
    return {
      error: "",
      notice: "Payment pending. Your payment was authorized, but it has not been captured yet.",
    };
  }

  return {
    error: message,
    notice: "",
  };
}

function toDateTimeLocalMinValue(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDistance(distanceMeters: number): string {
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatDuration(durationSeconds: number): string {
  const roundedMinutes = Math.max(Math.round(durationSeconds / 60), 1);
  if (roundedMinutes < 60) {
    return `${roundedMinutes} min`;
  }

  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function validateCheckoutFields(address: string, mobileNumber: string, deliveryTime: string): Partial<Record<"address" | "mobileNumber" | "deliveryTime", string>> {
  const errors: Partial<Record<"address" | "mobileNumber" | "deliveryTime", string>> = {};

  if (!address.trim()) {
    errors.address = "Delivery address is required.";
  }

  if (!/^\d{10}$/.test(mobileNumber.trim())) {
    errors.mobileNumber = "Mobile number must be exactly 10 digits.";
  }

  const deliveryDate = new Date(deliveryTime);
  if (!deliveryTime || Number.isNaN(deliveryDate.getTime()) || deliveryDate.getTime() <= Date.now()) {
    errors.deliveryTime = "Delivery time must be in the future.";
  }

  return errors;
}

export function CartPage(): JSX.Element {
  const navigate = useNavigate();
  const {
    items,
    loading,
    error,
    coupon,
    subtotal,
    total,
    discountAmount,
    updateQuantity,
    removeItem,
    toggleSelected,
    applyCoupon,
    clearCoupon,
    placeOrder,
  } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<DeliveryAddressSuggestion[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddressSuggestion | null>(null);
  const [searchingAddresses, setSearchingAddresses] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState("");
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [deliveryQuoteError, setDeliveryQuoteError] = useState("");
  const [quotingDelivery, setQuotingDelivery] = useState(false);
  const [mapError, setMapError] = useState("");
  const [resolvingMapPin, setResolvingMapPin] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [couponError, setCouponError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutNotice, setCheckoutNotice] = useState("");
  const [cartActionError, setCartActionError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const selectedCount = useMemo(() => items.filter((item) => item.selected).length, [items]);
  const selectedShopIds = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .filter((item) => item.selected)
            .map((item) => item.product.shopId)
            .filter((shopId): shopId is string => Boolean(shopId)),
        ),
      ),
    [items],
  );
  const hasMultiShopSelection = selectedShopIds.length > 1;
  const canShowMap = hasTomTomPublicKey();
  const selectedCartKey = useMemo(
    () =>
      items
        .filter((item) => item.selected)
        .map((item) => `${item.id}:${item.quantity}:${item.product.shopId ?? ""}`)
        .sort()
        .join("|"),
    [items],
  );
  const checkoutAddress = deliveryQuote?.normalizedAddress ?? selectedAddress?.address ?? addressQuery;
  const checkoutFieldErrors = validateCheckoutFields(checkoutAddress, mobileNumber, deliveryTime);
  const invalidSelectedItems = items.filter((item) => {
    if (!item.selected) {
      return false;
    }

    return item.product.quantity <= 0 || item.quantity > item.product.quantity || isProductExpired(item.product.expiryDate);
  });
  const payableTotal = total + (deliveryQuote?.deliveryFeeInr ?? 0);
  const currentMapPosition: LatLng | null = useMemo(() => {
    if (deliveryQuote) {
      return {
        lat: deliveryQuote.destinationLat,
        lng: deliveryQuote.destinationLng,
      };
    }

    if (selectedAddress) {
      return {
        lat: selectedAddress.latitude,
        lng: selectedAddress.longitude,
      };
    }

    return null;
  }, [deliveryQuote, selectedAddress]);
  const mapCenter = currentMapPosition ?? getDefaultIndiaCenter();
  const canSubmitCheckout =
    !placingOrder &&
    !quotingDelivery &&
    selectedCount > 0 &&
    !hasMultiShopSelection &&
    !invalidSelectedItems.length &&
    Object.keys(checkoutFieldErrors).length === 0 &&
    Boolean(deliveryQuote);

  useEffect(() => {
    const normalizedQuery = addressQuery.trim();

    if (!normalizedQuery || normalizedQuery.length < 5 || selectedAddress?.address === normalizedQuery || hasMultiShopSelection) {
      setAddressSuggestions([]);
      setSearchingAddresses(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setSearchingAddresses(true);
        setAddressSearchError("");
        const suggestions = await searchDeliveryAddressesInSupabase(normalizedQuery);
        if (!cancelled) {
      setAddressSuggestions(suggestions);
        }
      } catch (issue) {
        if (!cancelled) {
          setAddressSuggestions([]);
          setAddressSearchError(issue instanceof Error ? issue.message : "Unable to search addresses.");
        }
      } finally {
        if (!cancelled) {
          setSearchingAddresses(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [addressQuery, hasMultiShopSelection, selectedAddress?.address]);

  useEffect(() => {
    if (deliveryQuote) {
      setDeliveryQuote(null);
      setDeliveryQuoteError("Cart changed. Recalculate the delivery fee.");
    }
  }, [selectedCartKey]);

  const handleAddressInputChange = (value: string): void => {
    setAddressQuery(value);
    setSelectedAddress(null);
    setAddressSuggestions([]);
    setDeliveryQuote(null);
    setAddressSearchError("");
    setDeliveryQuoteError("");
    setMapError("");
  };

  const handleSelectAddress = (suggestion: DeliveryAddressSuggestion): void => {
    setSelectedAddress(suggestion);
    setAddressQuery(suggestion.address);
    setAddressSuggestions([]);
    setAddressSearchError("");
    setDeliveryQuote(null);
    setDeliveryQuoteError("");
    setMapError("");
  };

  const handlePickCustomerLocation = async (position: LatLng): Promise<void> => {
    setResolvingMapPin(true);
    setMapError("");
    setAddressSearchError("");
    setDeliveryQuote(null);
    setDeliveryQuoteError("");
    setAddressSuggestions([]);
    setSelectedAddress({
      id: `map-${position.lat}-${position.lng}`,
      address: addressQuery.trim() || "Selected map pin",
      secondaryText: "Resolving selected pin...",
      latitude: position.lat,
      longitude: position.lng,
    });

    try {
      const result = await reverseGeocodeTomTom(position);
      setSelectedAddress({
        id: `map-${result.latitude}-${result.longitude}`,
        address: result.address,
        secondaryText: "Selected from map",
        latitude: result.latitude,
        longitude: result.longitude,
      });
      setAddressQuery(result.address);
    } catch (issue) {
      setMapError(issue instanceof Error ? issue.message : "Unable to resolve the selected map pin.");
    } finally {
      setResolvingMapPin(false);
    }
  };

  const handleQuoteDelivery = async (): Promise<void> => {
    if (hasMultiShopSelection) {
      setDeliveryQuoteError("Select items from a single shop before calculating delivery.");
      return;
    }

    const addressToQuote = selectedAddress?.address ?? addressQuery.trim();
    if (!addressToQuote) {
      setDeliveryQuoteError("Select a delivery address first.");
      return;
    }

    setQuotingDelivery(true);
    setDeliveryQuoteError("");

    try {
      const quote = await quoteDeliveryInSupabase({
        address: addressToQuote,
        destinationLat: selectedAddress?.latitude,
        destinationLng: selectedAddress?.longitude,
      });
      setDeliveryQuote(quote);
      setSelectedAddress({
        id: `quote-${quote.deliveryQuoteId}`,
        address: quote.normalizedAddress,
        secondaryText: "",
        latitude: quote.destinationLat,
        longitude: quote.destinationLng,
      });
      setAddressQuery(quote.normalizedAddress);
      setAddressSuggestions([]);
      setAddressSearchError("");
    } catch (issue) {
      setDeliveryQuote(null);
      setDeliveryQuoteError(issue instanceof Error ? issue.message : "Unable to calculate the delivery fee.");
    } finally {
      setQuotingDelivery(false);
    }
  };

  const handleCouponSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setCouponError("");

    try {
      const applied = await applyCoupon(couponCode);
      if (!applied) {
        setCouponError("Coupon not found or no longer active.");
      }
    } catch (issue) {
      setCouponError(issue instanceof Error ? issue.message : "Unable to apply coupon.");
    }
  };

  const handlePlaceOrder = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (invalidSelectedItems.length) {
      setCheckoutNotice("");
      setCheckoutError("Remove expired or out-of-stock items before checkout.");
      return;
    }

    if (Object.keys(checkoutFieldErrors).length) {
      setCheckoutNotice("");
      setCheckoutError(Object.values(checkoutFieldErrors)[0] ?? "Please fix the checkout details.");
      return;
    }

    if (hasMultiShopSelection) {
      setCheckoutNotice("");
      setCheckoutError("Select items from one shop only before checkout.");
      return;
    }

    if (!deliveryQuote) {
      setCheckoutNotice("");
      setCheckoutError("Calculate the delivery fee before checkout.");
      return;
    }

    setPlacingOrder(true);
    setCheckoutError("");
    setCheckoutNotice("");

    try {
      await placeOrder({
        address: deliveryQuote.normalizedAddress,
        mobileNumber,
        deliveryTime,
        deliveryQuoteId: deliveryQuote.deliveryQuoteId,
        destinationLat: deliveryQuote.destinationLat,
        destinationLng: deliveryQuote.destinationLng,
      });
      navigate("/customer/home");
    } catch (issue) {
      const result = mapCheckoutIssue(issue);
      setCheckoutError(result.error);
      setCheckoutNotice(result.notice);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleUpdateQuantity = async (cartItemId: string, quantity: number): Promise<void> => {
    setBusyItemId(cartItemId);
    setCartActionError("");

    try {
      await updateQuantity(cartItemId, quantity);
    } catch (issue) {
      setCartActionError(issue instanceof Error ? issue.message : "Unable to update quantity.");
    } finally {
      setBusyItemId((current) => (current === cartItemId ? null : current));
    }
  };

  const handleRemoveItem = async (cartItemId: string): Promise<void> => {
    setBusyItemId(cartItemId);
    setCartActionError("");

    try {
      await removeItem(cartItemId);
    } catch (issue) {
      setCartActionError(issue instanceof Error ? issue.message : "Unable to remove item.");
    } finally {
      setBusyItemId((current) => (current === cartItemId ? null : current));
    }
  };

  const handleToggleSelected = async (cartItemId: string): Promise<void> => {
    setBusyItemId(cartItemId);
    setCartActionError("");

    try {
      await toggleSelected(cartItemId);
    } catch (issue) {
      setCartActionError(issue instanceof Error ? issue.message : "Unable to update sample selection.");
    } finally {
      setBusyItemId((current) => (current === cartItemId ? null : current));
    }
  };

  if (loading) {
    return <Loader label="Loading cart..." />;
  }

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <Navbar />
      <main className="mx-auto flex max-w-[1500px] flex-col gap-8 px-4 py-6 md:px-6 md:py-8">
        <section className="card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Cart & Checkout</p>
          <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Review your basket</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Update quantities, choose which sample items to include, apply a coupon, and confirm delivery details in one flow.
          </p>
          {error ? <p className="mt-4 text-sm text-rose-500">{error}</p> : null}
          {cartActionError ? <p className="mt-2 text-sm text-rose-500">{cartActionError}</p> : null}
        </section>

        {items.length ? (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-4">
              {items.map((item) => {
                const discountedPrice = calculateDiscountedPrice(item.product.price, item.product.discount);
                const itemTotal = discountedPrice * item.quantity;
                const itemBusy = busyItemId === item.id;
                const itemExpired = isProductExpired(item.product.expiryDate);
                const itemOutOfStock = item.product.quantity <= 0;
                const quantityAtLimit = item.quantity >= item.product.quantity;

                return (
                  <motion.article key={item.id} whileHover={{ y: -3 }} className="card grid gap-4 p-5 md:grid-cols-[120px_1fr]">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-28 w-full rounded-[24px] object-cover"
                    />
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                            {item.product.brand}
                          </p>
                          <Link to={`/product/${item.productId}`} className="mt-2 inline-block font-heading text-3xl font-semibold text-ink">
                            {item.product.name}
                          </Link>
                          <p className="mt-2 text-sm text-slate-500">
                            {item.product.weight} • {item.product.packetCount} pack
                          </p>
                          {itemExpired ? (
                            <p className="mt-2 text-sm font-semibold text-rose-600">Expired</p>
                          ) : itemOutOfStock ? (
                            <p className="mt-2 text-sm font-semibold text-rose-600">Out of stock</p>
                          ) : (
                            <p className="mt-2 text-sm text-slate-500">{item.product.quantity} available</p>
                          )}
                          <p className="mt-2 text-sm font-semibold text-slate-700">Item total: {formatInr(itemTotal)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-semibold text-ink">{formatInr(discountedPrice)}</p>
                          {item.product.discount ? (
                            <p className="text-sm text-slate-400 line-through">{formatInr(item.product.price)}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center rounded-full border border-[#e8dfd1] bg-white p-1 shadow-soft">
                          <button
                            type="button"
                            onClick={() => void handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            disabled={itemBusy || item.quantity <= 1}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-ink transition hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="min-w-[44px] text-center text-base font-semibold text-ink">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => void handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={itemBusy || itemExpired || itemOutOfStock || quantityAtLimit}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-ink transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>

                        {item.product.isSample ? (
                          <button
                            type="button"
                            onClick={() => void handleToggleSelected(item.id)}
                            disabled={itemBusy}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                              item.selected
                                ? "border-brand-300 bg-brand-100 text-brand-700"
                                : "border-[#e7d9c3] bg-white text-slate-500"
                            }`}
                          >
                            {item.selected ? "Sample Selected" : "Select Sample"}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void handleRemoveItem(item.id)}
                          disabled={itemBusy}
                          className="rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600"
                        >
                          {itemBusy ? "Working..." : "Remove"}
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </section>

            <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <section className="card p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Coupon</p>
                <form onSubmit={handleCouponSubmit} className="mt-4 space-y-3">
                  <input
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                    className="input"
                    placeholder="Enter coupon code"
                  />
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className="primary-button">
                      Apply Coupon
                    </button>
                    {coupon ? (
                      <button type="button" onClick={clearCoupon} className="soft-button">
                        Clear
                      </button>
                    ) : null}
                  </div>
                </form>
                {coupon ? (
                  <p className="mt-3 text-sm text-emerald-600">
                    {coupon.code} applied. Savings: {formatInr(coupon.discountAmount)}
                  </p>
                ) : null}
                {couponError ? <p className="mt-3 text-sm text-rose-500">{couponError}</p> : null}
              </section>

              <section className="card p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Summary</p>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Selected items</span>
                    <span>{selectedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>{formatInr(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Coupon discount</span>
                    <span>- {formatInr(discountAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Delivery</span>
                    <span>{deliveryQuote ? formatInr(deliveryQuote.deliveryFeeInr) : "Calculate"}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#eadfce] pt-3 text-base font-semibold text-ink">
                    <span>Total</span>
                    <span>{formatInr(payableTotal)}</span>
                  </div>
                </div>
              </section>

              <section className="card p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Checkout details</p>
                <form onSubmit={handlePlaceOrder} className="mt-4 space-y-4">
                  <div className="rounded-[26px] border border-[#eadfce] bg-[#fcfaf6] p-4">
                    <p className="text-sm font-medium text-ink">Delivery information</p>
                    <p className="mt-1 text-sm text-slate-500">Add the essentials so the order can be placed without delays.</p>
                  </div>

                  <label className="field">
                    <span>Delivery address</span>
                    <input
                      value={addressQuery}
                      onChange={(event) => handleAddressInputChange(event.target.value)}
                      className="input"
                      placeholder="Search house / flat, street, area, landmark"
                      required
                    />
                    {checkoutFieldErrors.address ? <p className="text-xs text-rose-500">{checkoutFieldErrors.address}</p> : null}
                  </label>

                  {searchingAddresses ? <p className="text-xs text-slate-500">Searching TomTom addresses...</p> : null}
                  {addressSearchError ? <p className="text-xs text-rose-500">{addressSearchError}</p> : null}
                  {addressSuggestions.length ? (
                    <div className="space-y-2 rounded-[24px] border border-[#eadfce] bg-white p-3">
                      {addressSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => handleSelectAddress(suggestion)}
                          className="w-full rounded-[18px] border border-transparent bg-[#fcfaf6] px-4 py-3 text-left transition hover:border-brand-200 hover:bg-brand-50"
                        >
                          <p className="text-sm font-semibold text-ink">{suggestion.address}</p>
                          {suggestion.secondaryText ? (
                            <p className="mt-1 text-xs text-slate-500">{suggestion.secondaryText}</p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="rounded-[24px] border border-[#eadfce] bg-[#fcfaf6] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-ink">Refine delivery pin</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Search first, then click or drag the pin on the map to lock the exact delivery spot.
                        </p>
                      </div>
                      {resolvingMapPin ? <p className="text-xs text-slate-500">Resolving pin...</p> : null}
                    </div>
                    {canShowMap ? (
                      <div className="mt-4 space-y-3">
                        <PinLocationMap
                          center={mapCenter}
                          marker={currentMapPosition}
                          onPick={(position) => {
                            void handlePickCustomerLocation(position);
                          }}
                        />
                        <p className="text-xs text-slate-500">
                          Click anywhere on the map or drag the marker to improve routing accuracy.
                        </p>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-amber-700">
                        Add `VITE_TOMTOM_API_KEY` or `NEXT_PUBLIC_TOMTOM_API_KEY` to enable in-browser map pinning.
                      </p>
                    )}
                    {mapError ? <p className="mt-3 text-xs text-rose-500">{mapError}</p> : null}
                  </div>

                  <div className="rounded-[24px] border border-[#eadfce] bg-[#fcfaf6] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-ink">Delivery quote</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Select an address, then calculate the delivery fee from the fulfilling shop.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleQuoteDelivery()}
                        disabled={quotingDelivery || !addressQuery.trim() || hasMultiShopSelection}
                        className="soft-button disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {quotingDelivery ? "Calculating..." : "Calculate delivery"}
                      </button>
                    </div>
                    {selectedAddress ? (
                      <p className="mt-4 text-sm text-slate-600">Selected address: {selectedAddress.address}</p>
                    ) : null}
                    {deliveryQuote ? (
                      <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <p className="font-semibold">Delivery fee: {formatInr(deliveryQuote.deliveryFeeInr)}</p>
                        <p className="mt-1">
                          {formatDistance(deliveryQuote.distanceMeters)} away • approx. {formatDuration(deliveryQuote.durationSeconds)}
                        </p>
                      </div>
                    ) : null}
                    {deliveryQuoteError ? <p className="mt-3 text-sm text-rose-500">{deliveryQuoteError}</p> : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="field">
                      <span>Mobile number</span>
                      <input
                        value={mobileNumber}
                        onChange={(event) => setMobileNumber(event.target.value)}
                        className="input"
                        placeholder="10-digit phone number"
                        required
                      />
                      {checkoutFieldErrors.mobileNumber ? <p className="text-xs text-rose-500">{checkoutFieldErrors.mobileNumber}</p> : null}
                    </label>

                    <label className="field">
                      <span>Preferred date & time</span>
                      <input
                        value={deliveryTime}
                        onChange={(event) => setDeliveryTime(event.target.value)}
                        className="input"
                        type="datetime-local"
                        min={toDateTimeLocalMinValue()}
                        required
                      />
                      {checkoutFieldErrors.deliveryTime ? <p className="text-xs text-rose-500">{checkoutFieldErrors.deliveryTime}</p> : null}
                    </label>
                  </div>

                  {error ? <p className="text-sm text-rose-500">{error}</p> : null}
                  {hasMultiShopSelection ? (
                    <p className="text-sm text-rose-500">Selected items must come from a single shop before checkout.</p>
                  ) : null}
                  {invalidSelectedItems.length ? (
                    <p className="text-sm text-rose-500">Remove expired or out-of-stock items before checkout.</p>
                  ) : null}
                  {checkoutNotice ? <p className="text-sm text-amber-700">{checkoutNotice}</p> : null}
                  {checkoutError ? <p className="text-sm text-rose-500">{checkoutError}</p> : null}
                  <div className="rounded-[24px] border border-[#eadfce] bg-white/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-ink">Amount payable</p>
                        <p className="mt-1 text-sm text-slate-500">Includes delivery after quote confirmation</p>
                      </div>
                      <p className="text-2xl font-semibold text-ink">{formatInr(payableTotal)}</p>
                    </div>
                    <button disabled={!canSubmitCheckout} className="primary-button mt-4 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">
                      {placingOrder ? "Opening Razorpay..." : "Pay with Razorpay"}
                    </button>
                  </div>
                </form>
              </section>
            </aside>
          </div>
        ) : (
          <EmptyState
            title="Your cart is empty"
            description="Products added from the storefront will show up here with quantity controls, coupon handling, and checkout."
            action={
              <Link to="/customer/home" className="primary-button">
                Continue shopping
              </Link>
            }
          />
        )}
      </main>
    </PageTransition>
  );
}
