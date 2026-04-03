import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { PageTransition } from "@/components/common/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { formatInr } from "@/lib/commerce";
import { createAdminCouponInSupabase, fetchAdminCouponsFromSupabase } from "@/lib/supabase";
import { adminLinks } from "@/pages/admin/navigation";
import { AdminCoupon } from "@/types";

type CouponFormState = {
  code: string;
  description: string;
  discountType: AdminCoupon["discountType"];
  discountValue: number;
  minOrderInr: number;
  maxDiscountInr: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
};

function toDateTimeLocalValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function buildInitialForm(): CouponFormState {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: 10,
    minOrderInr: 0,
    maxDiscountInr: "",
    validFrom: toDateTimeLocalValue(now),
    validUntil: toDateTimeLocalValue(tomorrow),
    isActive: true,
  };
}

function validateCouponForm(form: CouponFormState): Partial<Record<"code" | "discountValue" | "minOrderInr" | "maxDiscountInr" | "validity", string>> {
  const errors: Partial<Record<"code" | "discountValue" | "minOrderInr" | "maxDiscountInr" | "validity", string>> = {};

  if (!form.code.trim()) {
    errors.code = "Coupon code is required.";
  }

  if (!Number.isFinite(form.discountValue) || form.discountValue <= 0) {
    errors.discountValue = "Discount value must be greater than 0.";
  } else if (form.discountType === "percentage" && form.discountValue > 100) {
    errors.discountValue = "Percentage discount cannot exceed 100.";
  }

  if (!Number.isFinite(form.minOrderInr) || form.minOrderInr < 0) {
    errors.minOrderInr = "Minimum order must be 0 or greater.";
  }

  if (form.maxDiscountInr) {
    const parsed = Number(form.maxDiscountInr);
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors.maxDiscountInr = "Maximum discount must be 0 or greater.";
    }
  }

  const fromTime = new Date(form.validFrom).getTime();
  const untilTime = new Date(form.validUntil).getTime();
  if (!form.validFrom || !form.validUntil || Number.isNaN(fromTime) || Number.isNaN(untilTime) || fromTime >= untilTime) {
    errors.validity = "Valid until must be later than valid from.";
  }

  return errors;
}

function couponStatusLabel(coupon: AdminCoupon): { label: string; className: string } {
  const now = Date.now();
  const validFrom = new Date(coupon.validFrom).getTime();
  const validUntil = new Date(coupon.validUntil).getTime();

  if (!coupon.isActive) {
    return {
      label: "Inactive",
      className: "bg-slate-100 text-slate-700",
    };
  }

  if (validUntil <= now) {
    return {
      label: "Expired",
      className: "bg-rose-100 text-rose-700",
    };
  }

  if (validFrom > now) {
    return {
      label: "Scheduled",
      className: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "Active",
    className: "bg-emerald-100 text-emerald-700",
  };
}

export function AdminCouponsPage(): JSX.Element {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<CouponFormState>(buildInitialForm);
  const formErrors = useMemo(() => validateCouponForm(form), [form]);
  const hasFormErrors = Object.keys(formErrors).length > 0;

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setCoupons(await fetchAdminCouponsFromSupabase());
      } catch (issue) {
        setError(issue instanceof Error ? issue.message : "Unable to load coupons.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (hasFormErrors) {
      setError(Object.values(formErrors)[0] ?? "Please fix the coupon fields.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const created = await createAdminCouponInSupabase({
        code: form.code,
        description: form.description,
        discountType: form.discountType,
        discountValue: form.discountValue,
        minOrderInr: form.minOrderInr,
        maxDiscountInr: form.maxDiscountInr ? Number(form.maxDiscountInr) : null,
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil).toISOString(),
        isActive: form.isActive,
      });

      setCoupons((current) => [created, ...current]);
      setForm(buildInitialForm());
      setMessage(`Coupon ${created.code} created.`);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create coupon.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader label="Loading coupon manager..." />;
  }

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 xl:grid-cols-[280px_1fr]">
        <Sidebar title="Coupon Management" subtitle="Admin" links={adminLinks} />

        <div className="space-y-6">
          {!user?.approved ? (
            <EmptyState
              title="Pending Approval"
              description="Coupon creation unlocks after your admin approval is completed."
            />
          ) : (
            <>
              <section className="card p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Coupons</p>
                <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Create discount campaigns</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                  Add coupon codes with discount rules, minimum order thresholds, and a clear active time window for the storefront checkout flow.
                </p>
                {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}
                {error ? <p className="mt-4 text-sm text-rose-500">{error}</p> : null}
              </section>

              <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                <section className="card p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Create coupon</p>
                  <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="field">
                      <span>Coupon code</span>
                      <input
                        value={form.code}
                        onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                        className="input"
                        placeholder="SAVE10"
                        required
                      />
                      {formErrors.code ? <p className="text-xs text-rose-500">{formErrors.code}</p> : null}
                    </label>

                    <label className="field">
                      <span>Coupon name</span>
                      <input
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        className="input"
                        placeholder="Summer welcome offer"
                      />
                    </label>

                    <label className="field">
                      <span>Discount type</span>
                      <select
                        value={form.discountType}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            discountType: event.target.value as CouponFormState["discountType"],
                          }))
                        }
                        className="input"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="flat">Flat amount</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>{form.discountType === "percentage" ? "Discount %" : "Discount amount (INR)"}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.discountValue}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, discountValue: Number(event.target.value) }))
                        }
                        className="input"
                        required
                      />
                      {formErrors.discountValue ? <p className="text-xs text-rose-500">{formErrors.discountValue}</p> : null}
                    </label>

                    <label className="field">
                      <span>Minimum order (INR)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.minOrderInr}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, minOrderInr: Number(event.target.value) }))
                        }
                        className="input"
                      />
                      {formErrors.minOrderInr ? <p className="text-xs text-rose-500">{formErrors.minOrderInr}</p> : null}
                    </label>

                    <label className="field">
                      <span>Up to (max discount in INR)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.maxDiscountInr}
                        onChange={(event) => setForm((current) => ({ ...current, maxDiscountInr: event.target.value }))}
                        className="input"
                        placeholder="Optional"
                      />
                      {formErrors.maxDiscountInr ? <p className="text-xs text-rose-500">{formErrors.maxDiscountInr}</p> : null}
                    </label>

                    <label className="field">
                      <span>Valid from</span>
                      <input
                        type="datetime-local"
                        value={form.validFrom}
                        onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))}
                        className="input"
                        required
                      />
                    </label>

                    <label className="field">
                      <span>Valid until</span>
                      <input
                        type="datetime-local"
                        value={form.validUntil}
                        onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))}
                        className="input"
                        required
                      />
                      {formErrors.validity ? <p className="text-xs text-rose-500">{formErrors.validity}</p> : null}
                    </label>

                    <label className="field md:col-span-2">
                      <span>Coupon status</span>
                      <button
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
                        className={`w-fit rounded-full border px-4 py-2 text-sm font-semibold ${
                          form.isActive
                            ? "border-brand-300 bg-brand-100 text-brand-700"
                            : "border-[#e7d9c3] bg-white text-slate-500"
                        }`}
                      >
                        {form.isActive ? "Active on creation" : "Create as inactive"}
                      </button>
                    </label>

                    <div className="md:col-span-2 flex justify-end">
                      <button disabled={saving || hasFormErrors} className="primary-button disabled:opacity-60">
                        {saving ? "Creating..." : "Create coupon"}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="card p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Existing coupons</p>
                  <div className="mt-5 space-y-4">
                    {coupons.length ? (
                      coupons.map((coupon) => {
                        const badge = couponStatusLabel(coupon);
                        return (
                          <article key={coupon.id} className="rounded-[24px] border border-[#eadfce] bg-[#fcfaf6] p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{coupon.code}</p>
                                <h2 className="mt-2 text-lg font-semibold text-ink">
                                  {coupon.description || "Untitled coupon"}
                                </h2>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                                {badge.label}
                              </span>
                            </div>
                            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                              <p>
                                Discount:{" "}
                                <span className="font-semibold text-ink">
                                  {coupon.discountType === "percentage"
                                    ? `${coupon.discountValue}%`
                                    : formatInr(coupon.discountValue)}
                                </span>
                              </p>
                              <p>
                                Minimum order: <span className="font-semibold text-ink">{formatInr(coupon.minOrderInr)}</span>
                              </p>
                              <p>
                                Up to:{" "}
                                <span className="font-semibold text-ink">
                                  {coupon.maxDiscountInr == null ? "No cap" : formatInr(coupon.maxDiscountInr)}
                                </span>
                              </p>
                              <p>
                                Validity:{" "}
                                <span className="font-semibold text-ink">
                                  {new Date(coupon.validFrom).toLocaleString("en-IN")} to {new Date(coupon.validUntil).toLocaleString("en-IN")}
                                </span>
                              </p>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <EmptyState
                        title="No coupons yet"
                        description="Create your first coupon here and it will appear with its discount, validity window, and status."
                      />
                    )}
                  </div>
                </section>
              </section>
            </>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
