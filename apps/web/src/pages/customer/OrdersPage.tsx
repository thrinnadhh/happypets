import { PageTransition } from "@/components/common/PageTransition";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { Navbar } from "@/components/layout/Navbar";
import { useCart } from "@/contexts/CartContext";
import { formatInr } from "@/lib/commerce";
import { OrderRecord } from "@/types";

function paymentBadgeCopy(paymentStatus: OrderRecord["paymentStatus"]): {
  label: string;
  className: string;
} {
  switch (paymentStatus) {
    case "paid":
      return {
        label: "Paid",
        className: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      };
    case "pending":
      return {
        label: "Pending payment",
        className: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
      };
    case "failed":
      return {
        label: "Payment failed",
        className: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
      };
    case "refunded":
      return {
        label: "Refunded",
        className: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
      };
    default:
      return {
        label: "Pending payment",
        className: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
      };
  }
}

export function OrdersPage(): JSX.Element {
  const { orders, ordersLoading } = useCart();

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <Navbar />
      <main className="mx-auto flex max-w-[1500px] flex-col gap-8 px-4 py-6 md:px-6 md:py-8">
        <section className="card p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Orders</p>
          <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Order history</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Review previous orders, delivery details, and current fulfillment status from your HappyPets account.
          </p>
        </section>

        {ordersLoading ? (
          <Loader label="Loading order history..." />
        ) : orders.length ? (
          <section className="space-y-5">
            {orders.map((order) => {
              const paymentBadge = paymentBadgeCopy(order.paymentStatus);

              return (
              <article key={order.id} className="card p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">
                      {order.orderNumber}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <h2 className="font-heading text-3xl font-semibold capitalize text-ink">{order.status}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentBadge.className}`}>
                        {paymentBadge.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {new Date(order.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold text-ink">{formatInr(order.totalPrice)}</p>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={`${order.id}-${item.productId}`} className="flex items-center gap-4 rounded-[24px] bg-[#fbf7ef] p-4">
                        <img src={item.image} alt={item.name} className="h-16 w-16 rounded-[18px] object-cover" />
                        <div className="flex-1">
                          <p className="font-semibold text-ink">{item.name}</p>
                          <p className="text-sm text-slate-500">
                            Qty {item.quantity} • {formatInr(item.totalPrice)}
                          </p>
                        </div>
                        {item.isSample ? (
                          <span className="rounded-full bg-[#17324a] px-3 py-1 text-xs font-semibold text-white">
                            Sample
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[26px] bg-[#faf5ea] p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Delivery details</p>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{order.address}</p>
                    <p className="mt-3 text-sm text-slate-600">{order.mobileNumber}</p>
                    <p className="mt-3 text-sm text-slate-600">Preferred date & time: {order.deliveryTime}</p>
                  </div>
                </div>
              </article>
            );
            })}
          </section>
        ) : (
          <EmptyState
            title="No orders yet"
            description="Once you complete checkout, your past orders will show up here with item snapshots and delivery details."
          />
        )}
      </main>
    </PageTransition>
  );
}
