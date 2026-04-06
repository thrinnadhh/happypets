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
import {
  fetchSavedAddressesFromSupabase,
  quoteDeliveryInSupabase,
  reverseGeocodeLocationInSupabase,
  searchDeliveryAddressesInSupabase,
} from "@/lib/supabase";
import {
  LatLng,
  buildLocationQuery,
  extractStructuredLocation,
  getDefaultIndiaCenter,
} from "@/lib/tomtom";
import { DeliveryAddressSuggestion, DeliveryQuote, SavedAddress } from "@/types";

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

function validateCheckoutFields(
  address: string,
  city: string,
  pincode: string,
  mobileNumber: string,
  deliveryTime: string,
): Partial<Record<"address" | "city" | "pincode" | "mobileNumber" | "deliveryTime", string>> {
  const errors: Partial<Record<"address" | "city" | "pincode" | "mobileNumber" | "deliveryTime", string>> = {};

  if (!address.trim()) {
    errors.address = "Delivery address is required.";
  }

  if (!city.trim()) {
    errors.city = "City is required.";
  }

  if (!/^\d{6}$/.test(pincode.trim())) {
    errors.pincode = "Pincode must be exactly 6 digits.";
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
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedAddressesError, setSavedAddressesError] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<DeliveryAddressSuggestion[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddressSuggestion | null>(null);
  const [searchingAddresses, setSearchingAddresses] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState("");
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [deliveryQuoteError, setDeliveryQuoteError] = useState("");
  const [quotingDelivery, setQuotingDelivery] = useState(false);
  const [mapError, setMapError] = useState("");
  const [resolvingMapPin, setResolvingMapPin] = useState(false);
  const [locatingCurrentPosition, setLocatingCurrentPosition] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [couponError, setCouponError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutNotice, setCheckoutNotice] = useState("");
  const [cartActionError, setCartActionError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const visibleSavedAddresses = useMemo(() => savedAddresses.slice(0, 3), [savedAddresses]);

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
  const selectedCartKey = useMemo(
    () =>
      items
        .filter((item) => item.selected)
        .map((item) => `${item.id}:${item.quantity}:${item.product.shopId ?? ""}`)
        .sort()
        .join("|"),
    [items],
  );
  const structuredQuery = useMemo(
    () =>
      buildLocationQuery({
        addressLine: selectedAddress?.address ?? addressQuery,
        city: selectedAddress?.city ?? city,
        pincode: selectedAddress?.pincode ?? pincode,
      }),
    [addressQuery, city, pincode, selectedAddress],
  );
  const checkoutAddress = deliveryQuote?.normalizedAddress ?? structuredQuery;
  const checkoutFieldErrors = validateCheckoutFields(checkoutAddress, city, pincode, mobileNumber, deliveryTime);
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
    let cancelled = false;

    const loadSavedAddresses = async (): Promise<void> => {
      try {
        const nextAddresses = await fetchSavedAddressesFromSupabase();
        if (!cancelled) {
          setSavedAddresses(nextAddresses);
          setSavedAddressesError("");
        }
      } catch (issue) {
        if (!cancelled) {
          setSavedAddresses([]);
          setSavedAddressesError(issue instanceof Error ? issue.message : "Unable to load saved addresses.");
        }
      }
    };

    void loadSavedAddresses();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const normalizedQuery = structuredQuery.trim();
    const isSelectedAddress =
      Boolean(selectedAddress) &&
      normalizedQuery ===
        buildLocationQuery({
          addressLine: selectedAddress?.address ?? "",
          city: selectedAddress?.city ?? "",
          pincode: selectedAddress?.pincode ?? "",
        });

    if (!normalizedQuery || normalizedQuery.length < 5 || isSelectedAddress || hasMultiShopSelection) {
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
  }, [hasMultiShopSelection, selectedAddress, structuredQuery]);

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

  const handleCityInputChange = (value: string): void => {
    setCity(value);
    setSelectedAddress(null);
    setAddressSuggestions([]);
    setDeliveryQuote(null);
    setAddressSearchError("");
    setDeliveryQuoteError("");
    setMapError("");
  };

  const handlePincodeInputChange = (value: string): void => {
    setPincode(value.replace(/\D/g, "").slice(0, 6));
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
    setCity(suggestion.city);
    setPincode(suggestion.pincode);
    setAddressSuggestions([]);
    setAddressSearchError("");
    setDeliveryQuote(null);
    setDeliveryQuoteError("");
    setMapError("");
  };

  const handleSelectSavedAddress = (savedAddress: SavedAddress): void => {
    setAddressQuery([savedAddress.addressLine1, savedAddress.addressLine2].filter(Boolean).join(", "));
    setCity(savedAddress.city);
    setPincode(savedAddress.pincode);
    setMobileNumber(savedAddress.phone);
    setSelectedAddress(
      savedAddress.latitude != null && savedAddress.longitude != null
        ? {
            id: `saved-${savedAddress.id}`,
            address: savedAddress.formattedAddress,
            secondaryText: savedAddress.label,
            city: savedAddress.city,
            pincode: savedAddress.pincode,
            latitude: savedAddress.latitude,
            longitude: savedAddress.longitude,
          }
        : null,
    );
    setAddressSuggestions([]);
    setDeliveryQuote(null);
    setAddressSearchError("");
    setDeliveryQuoteError("");
    setMapError("");
  };

  const handleUseCurrentLocation = async (): Promise<void> => {
    if (!("geolocation" in navigator)) {
      setMapError("This browser does not support current location.");
      return;
    }

    setLocatingCurrentPosition(true);
    setMapError("");
    setAddressSearchError("");
    setDeliveryQuote(null);
    setDeliveryQuoteError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        try {
          await handlePickCustomerLocation(nextPosition);
        } catch {
          setSelectedAddress({
            id: `gps-${nextPosition.lat}-${nextPosition.lng}`,
            address: "Current location",
            secondaryText: "Location captured from browser",
            city,
            pincode,
            latitude: nextPosition.lat,
            longitude: nextPosition.lng,
          });
        } finally {
          setLocatingCurrentPosition(false);
        }
      },
      (issue) => {
        const errorMessage =
          issue.code === issue.PERMISSION_DENIED
            ? "Location permission was denied."
            : issue.code === issue.POSITION_UNAVAILABLE
            ? "Current location is unavailable right now."
            : issue.code === issue.TIMEOUT
            ? "Current location request timed out."
            : "Unable to read your current location.";
        setMapError(errorMessage);
        setLocatingCurrentPosition(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 60_000,
      },
    );
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
      city,
      pincode,
      latitude: position.lat,
      longitude: position.lng,
    });

    try {
      const result = await reverseGeocodeLocationInSupabase(position);
      setSelectedAddress({
        id: `map-${result.latitude}-${result.longitude}`,
        address: result.address,
        secondaryText: "Selected from map",
        city: result.city,
        pincode: result.pincode,
        latitude: result.latitude,
        longitude: result.longitude,
      });
      setAddressQuery(result.address);
      setCity(result.city);
      setPincode(result.pincode);
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

    const addressToQuote = structuredQuery;
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
        city,
        pincode,
        latitude: quote.destinationLat,
        longitude: quote.destinationLng,
      });
      const structuredQuote = extractStructuredLocation({
        address: quote.normalizedAddress,
        city,
        pincode,
      });
      setAddressQuery(structuredQuote.addressLine);
      setCity(structuredQuote.city);
      setPincode(structuredQuote.pincode);
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
        city,
        pincode,
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
    <PageTransition className="min-h-screen bg-page">
      <Navbar />
      <main className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <section className="card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Cart & Checkout</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink">🛒 Review Your Basket</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Update quantities, apply a coupon, and confirm delivery details in one flow.
          </p>
          {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
          {cartActionError ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{cartActionError}</p> : null}
        </section>

        {items.length ? (
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-3">
              {items.map((item) => {
                const discountedPrice = calculateDiscountedPrice(item.product.price, item.product.discount);
                const itemTotal = discountedPrice * item.quantity;
                const itemBusy = busyItemId === item.id;
                const itemExpired = isProductExpired(item.product.expiryDate);
                const itemOutOfStock = item.product.quantity <= 0;
                const quantityAtLimit = item.quantity >= item.product.quantity;

                return (
                  <motion.article key={item.id} whileHover={{ y: -2 }} className="card grid gap-4 p-4 md:grid-cols-[100px_1fr]">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-24 w-full rounded-xl object-cover"
                    />
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                            {item.product.brand}
                          </p>
                          <Link to={`/product/${item.productId}`} className="mt-1 inline-block text-lg font-extrabold text-ink hover:text-brand-700">
                            {item.product.name}
                          </Link>
                          <p className="text-xs text-muted">
                            {item.product.weight} · {item.product.packetCount} pack
                          </p>
                          {itemExpired ? (
                            <p className="mt-1 text-xs font-bold text-red-600">⚠️ Expired</p>
                          ) : itemOutOfStock ? (
                            <p className="mt-1 text-xs font-bold text-red-600">⚠️ Out of stock</p>
                          ) : (
                            <p className="mt-1 text-xs text-muted">{item.product.quantity} available</p>
                          )}
                          <p className="text-xs font-semibold text-ink">Item total: {formatInr(itemTotal)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-extrabold text-ink">{formatInr(discountedPrice)}</p>
                          {item.product.discount ? (
                            <p className="text-xs text-muted line-through">{formatInr(item.product.price)}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() => void handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            disabled={itemBusy || item.quantity <= 1}
                            className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-ink transition hover:bg-brand-50 disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="min-w-[36px] text-center text-sm font-bold text-ink">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => void handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={itemBusy || itemExpired || itemOutOfStock || quantityAtLimit}
                            className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-ink transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>

                        {item.product.isSample ? (
                          <button
                            type="button"
                            onClick={() => void handleToggleSelected(item.id)}
                            disabled={itemBusy}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                              item.selected
                                ? "border-brand-400 bg-brand-50 text-brand-700"
                                : "border-gray-200 bg-white text-muted"
                            }`}
                          >
                            {item.selected ? "✅ Sample Selected" : "Select Sample"}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void handleRemoveItem(item.id)}
                          disabled={itemBusy}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                        >
                          {itemBusy ? "Working…" : "Remove"}
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </section>

            <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
              <section className="card p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">🎟️ Coupon</p>
                <form onSubmit={handleCouponSubmit} className="mt-3 space-y-3">
                  <input
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                    className="input"
                    placeholder="Enter coupon code"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn-primary">
                      Apply
                    </button>
                    {coupon ? (
                      <button type="button" onClick={clearCoupon} className="btn-secondary">
                        Clear
                      </button>
                    ) : null}
                  </div>
                </form>
                {coupon ? (
                  <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                    ✅ {coupon.code} · Saved {formatInr(coupon.discountAmount)}
                  </p>
                ) : null}
                {couponError ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{couponError}</p> : null}
              </section>

              <section className="card p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">📋 Order Summary</p>
                <div className="mt-3 space-y-2 text-sm text-muted">
                  <div className="flex items-center justify-between">
                    <span>Selected items</span>
                    <span className="font-semibold text-ink">{selectedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-ink">{formatInr(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Coupon discount</span>
                    <span className="font-semibold text-green-600">− {formatInr(discountAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Delivery</span>
                    <span className="font-semibold text-ink">{deliveryQuote ? formatInr(deliveryQuote.deliveryFeeInr) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-brand-100 pt-2 text-base font-extrabold text-ink">
                    <span>Total</span>
                    <span>{formatInr(payableTotal)}</span>
                  </div>
                </div>
              </section>

              <section className="card p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">🚚 Checkout Details</p>
                <form onSubmit={handlePlaceOrder} className="mt-3 space-y-4">
                  <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
                    <p className="text-sm font-bold text-ink">Delivery Information</p>
                    <p className="mt-1 text-xs text-muted">Add the essentials so the order can be placed without delays.</p>
                  </div>

                  {visibleSavedAddresses.length ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-bold text-ink">Saved Addresses</p>
                      <p className="mt-0.5 text-xs text-muted">Reuse a previous delivery address.</p>
                      <div className="mt-3 space-y-2">
                        {visibleSavedAddresses.map((savedAddress) => (
                          <button
                            key={savedAddress.id}
                            type="button"
                            onClick={() => handleSelectSavedAddress(savedAddress)}
                            className="w-full rounded-xl border border-transparent bg-white px-4 py-3 text-left transition hover:border-brand-200 hover:bg-brand-50"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-ink">{savedAddress.label}</p>
                              {savedAddress.isDefault ? (
                                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">Default</span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-xs text-muted">{savedAddress.formattedAddress}</p>
                            <p className="text-[10px] text-muted">{savedAddress.phone}</p>
                          </button>
                        ))}
                      </div>
                      {savedAddressesError ? <p className="mt-2 text-xs text-red-500">{savedAddressesError}</p> : null}
                    </div>
                  ) : savedAddressesError ? (
                    <p className="text-xs text-red-500">{savedAddressesError}</p>
                  ) : null}

                  <label className="field">
                    <span>Delivery address</span>
                    <input
                      value={addressQuery}
                      onChange={(event) => handleAddressInputChange(event.target.value)}
                      className="input"
                      placeholder="House / flat, street, area, landmark"
                      required
                    />
                    {checkoutFieldErrors.address ? <p className="text-xs text-rose-500">{checkoutFieldErrors.address}</p> : null}
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="field">
                      <span>City</span>
                      <input
                        value={city}
                        onChange={(event) => handleCityInputChange(event.target.value)}
                        className="input"
                        placeholder="Tirupati"
                      />
                      {checkoutFieldErrors.city ? <p className="text-xs text-rose-500">{checkoutFieldErrors.city}</p> : null}
                    </label>

                    <label className="field">
                      <span>Pincode</span>
                      <input
                        value={pincode}
                        onChange={(event) => handlePincodeInputChange(event.target.value)}
                        className="input"
                        inputMode="numeric"
                        placeholder="517502"
                      />
                      {checkoutFieldErrors.pincode ? <p className="text-xs text-rose-500">{checkoutFieldErrors.pincode}</p> : null}
                    </label>
                  </div>

                  {searchingAddresses ? <p className="text-xs text-muted">Searching addresses…</p> : null}
                  {addressSearchError ? <p className="text-xs text-red-500">{addressSearchError}</p> : null}
                  {addressSuggestions.length ? (
                    <div className="space-y-1 rounded-xl border border-brand-100 bg-white p-2">
                      {addressSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onClick={() => handleSelectAddress(suggestion)}
                          className="w-full rounded-lg border border-transparent bg-gray-50 px-3 py-2.5 text-left transition hover:border-brand-200 hover:bg-brand-50"
                        >
                          <p className="text-sm font-semibold text-ink">{suggestion.address}</p>
                          {suggestion.secondaryText ? (
                            <p className="text-xs text-muted">{suggestion.secondaryText}</p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-brand-100 bg-brand-50/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-ink">📍 Refine Delivery Pin</p>
                        <p className="mt-0.5 text-xs text-muted">
                          Click or drag the pin to lock your exact delivery spot.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { void handleUseCurrentLocation(); }}
                        disabled={locatingCurrentPosition}
                        className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50"
                      >
                        {locatingCurrentPosition ? "Locating…" : "Use My Location"}
                      </button>
                    </div>
                    {resolvingMapPin ? <p className="mt-1 text-xs text-muted">Resolving pin…</p> : null}
                    <div className="mt-3 space-y-2">
                      <PinLocationMap
                        center={mapCenter}
                        marker={currentMapPosition}
                        onPick={(position) => { void handlePickCustomerLocation(position); }}
                      />
                      <p className="text-[10px] text-muted">Location resolved securely via backend — no browser map key required.</p>
                    </div>
                    {mapError ? <p className="mt-2 text-xs text-red-500">{mapError}</p> : null}
                  </div>

                  <div className="rounded-xl border border-brand-100 bg-brand-50/30 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-ink">🏍️ Delivery Quote</p>
                        <p className="text-xs text-muted">Calculate delivery fee from the fulfilling shop.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleQuoteDelivery()}
                        disabled={quotingDelivery || !structuredQuery.trim() || hasMultiShopSelection}
                        className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50"
                      >
                        {quotingDelivery ? "Calculating…" : "Calculate Delivery"}
                      </button>
                    </div>
                    {selectedAddress ? (
                      <p className="mt-2 text-xs text-muted">
                        📌 {selectedAddress.address}{selectedAddress.secondaryText ? ` (${selectedAddress.secondaryText})` : ""}
                      </p>
                    ) : null}
                    {deliveryQuote ? (
                      <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-700">
                        <p className="font-bold">✅ Delivery fee: {formatInr(deliveryQuote.deliveryFeeInr)}</p>
                        <p>{formatDistance(deliveryQuote.distanceMeters)} away · approx. {formatDuration(deliveryQuote.durationSeconds)}</p>
                      </div>
                    ) : null}
                    {deliveryQuoteError ? <p className="mt-2 text-xs text-red-500">{deliveryQuoteError}</p> : null}
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

                  {error ? <p className="text-xs text-red-500">{error}</p> : null}
                  {hasMultiShopSelection ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">⚠️ Select items from a single shop before checkout.</p>
                  ) : null}
                  {invalidSelectedItems.length ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">⚠️ Remove expired or out-of-stock items before checkout.</p>
                  ) : null}
                  {checkoutNotice ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{checkoutNotice}</p> : null}
                  {checkoutError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{checkoutError}</p> : null}
                  <div className="rounded-xl border border-brand-100 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-ink">Amount Payable</p>
                        <p className="text-xs text-muted">Includes delivery after quote confirmation</p>
                      </div>
                      <p className="text-2xl font-extrabold text-ink">{formatInr(payableTotal)}</p>
                    </div>
                    <button disabled={!canSubmitCheckout} className="btn-primary mt-4 w-full justify-center py-3 text-base disabled:cursor-not-allowed disabled:opacity-50">
                      {placingOrder ? "Processing…" : "🛒 Place Order"}
                    </button>
                  </div>
                </form>
              </section>
            </aside>
          </div>
        ) : (
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            description="Products added from the storefront will show up here with quantity controls, coupon handling, and checkout."
          />
        )}
      </main>
    </PageTransition>
  );
}
