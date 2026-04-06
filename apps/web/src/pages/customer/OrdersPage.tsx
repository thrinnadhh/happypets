import { PageTransition } from "@/components/common/PageTransition";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { Navbar } from "@/components/layout/Navbar";
import { useCart } from "@/contexts/CartContext";
import { formatInr } from "@/lib/commerce";
import { OrderRecord } from "@/types";

function paymentBadge(status: OrderRecord["paymentStatus"]): { label: string; cls: string } {
  switch (status) {
    case "paid":     return { label: "✅ Paid",            cls: "bg-green-50 text-green-700 ring-1 ring-green-200" };
    case "pending":  return { label: "⏳ Pending",          cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" };
    case "failed":   return { label: "❌ Failed",           cls: "bg-red-50 text-red-700 ring-1 ring-red-200" };
    case "refunded": return { label: "↩️ Refunded",        cls: "bg-gray-100 text-gray-700 ring-1 ring-gray-200" };
    default:         return { label: "⏳ Pending payment",  cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" };
  }
}

export function OrdersPage(): JSX.Element {
  const { orders, ordersLoading } = useCart();

  return (
    <PageTransition className="min-h-screen bg-page">
      <Navbar />
      <main className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <section className="card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">History</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink">My Orders 📦</h1>
          <p className="mt-2 text-sm text-muted">
            Review past orders, delivery info, and fulfilment status.
          </p>
        </section>

        {ordersLoading ? (
          <Loader label="Loading order history…" />
        ) : orders.length ? (
          <section className="space-y-4">
            {orders.map((order) => {
              const badge = paymentBadge(order.paymentStatus);
              return (
                <article key={order.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                        {order.orderNumber}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-extrabold capitalize text-ink">{order.status}</h2>
                        <span className={`rounded-full px-3 py-0.5 text-xs font-bold ring-inset ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {new Date(order.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <p className="text-2xl font-extrabold text-ink">{formatInr(order.totalPrice)}</p>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={`${order.id}-${item.productId}`} className="flex items-center gap-3 rounded-xl bg-brand-50/40 p-3">
                          <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-ink">{item.name}</p>
                            <p className="text-xs text-muted">Qty {item.quantity} · {formatInr(item.totalPrice)}</p>
                          </div>
                          {item.isSample && (
                            <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white">Sample</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl bg-brand-50/50 p-4 xl:w-56">
                      <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Delivery</p>
                      <p className="mt-2 text-xs leading-6 text-muted">{order.address}</p>
                      <p className="text-xs text-muted">{order.mobileNumber}</p>
                      <p className="mt-1 text-xs text-muted">Preferred: {order.deliveryTime}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <EmptyState
            icon="📦"
            title="No orders yet"
            description="Once you complete checkout, your past orders appear here with item snapshots and delivery details."
          />
        )}
      </main>
    </PageTransition>
  );
}
