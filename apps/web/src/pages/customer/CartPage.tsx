import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { PageTransition } from "@/components/common/PageTransition";
import { Navbar } from "@/components/layout/Navbar";
import { useCart } from "@/contexts/CartContext";
import { calculateDiscountedPrice, formatInr } from "@/lib/commerce";

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
  const [address, setAddress] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [couponError, setCouponError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  const selectedCount = useMemo(() => items.filter((item) => item.selected).length, [items]);

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
    setPlacingOrder(true);
    setCheckoutError("");

    try {
      await placeOrder({ address, mobileNumber, deliveryTime });
      navigate("/orders");
    } catch (issue) {
      setCheckoutError(issue instanceof Error ? issue.message : "Unable to complete payment.");
    } finally {
      setPlacingOrder(false);
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
        </section>

        {items.length ? (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-4">
              {items.map((item) => {
                const discountedPrice = calculateDiscountedPrice(item.product.price, item.product.discount);

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
                          <h2 className="mt-2 font-heading text-3xl font-semibold text-ink">
                            {item.product.name}
                          </h2>
                          <p className="mt-2 text-sm text-slate-500">
                            {item.product.weight} • {item.product.packetCount} pack
                          </p>
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
                            onClick={() => void updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-ink transition hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="min-w-[44px] text-center text-base font-semibold text-ink">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-ink transition hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>

                        {item.product.isSample ? (
                          <button
                            type="button"
                            onClick={() => void toggleSelected(item.id)}
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
                          onClick={() => void removeItem(item.id)}
                          className="rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </section>

            <aside className="space-y-5">
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
                  <div className="flex items-center justify-between border-t border-[#eadfce] pt-3 text-base font-semibold text-ink">
                    <span>Total</span>
                    <span>{formatInr(total)}</span>
                  </div>
                </div>
              </section>

              <section className="card p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Checkout details</p>
                <form onSubmit={handlePlaceOrder} className="mt-4 space-y-4">
                  <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className="input min-h-[120px]"
                    placeholder="Delivery address"
                    required
                  />
                  <input
                    value={mobileNumber}
                    onChange={(event) => setMobileNumber(event.target.value)}
                    className="input"
                    placeholder="Mobile number"
                    required
                  />
                  <input
                    value={deliveryTime}
                    onChange={(event) => setDeliveryTime(event.target.value)}
                    className="input"
                    placeholder="Preferred delivery time"
                    required
                  />
                  {error ? <p className="text-sm text-rose-500">{error}</p> : null}
                  {checkoutError ? <p className="text-sm text-rose-500">{checkoutError}</p> : null}
                  <button disabled={placingOrder || !selectedCount} className="primary-button w-full justify-center">
                    {placingOrder ? "Opening Razorpay..." : "Pay with Razorpay"}
                  </button>
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
