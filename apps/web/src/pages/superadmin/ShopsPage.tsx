import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { PageTransition } from "@/components/common/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  createShopLocationInSupabase,
  fetchShopLocationsFromSupabase,
  updateShopLocationInSupabase,
} from "@/lib/supabase";
import { ShopLocation } from "@/types";
import { superAdminLinks } from "@/pages/superadmin/navigation";

type ShopFormState = {
  name: string;
  originLat: string;
  originLng: string;
  status: ShopLocation["status"];
};

const MAX_SHOPS = 6;

const emptyShopForm: ShopFormState = {
  name: "",
  originLat: "",
  originLng: "",
  status: "active",
};

function buildShopForm(shop?: ShopLocation): ShopFormState {
  if (!shop) {
    return emptyShopForm;
  }

  return {
    name: shop.name,
    originLat: shop.originLat == null ? "" : String(shop.originLat),
    originLng: shop.originLng == null ? "" : String(shop.originLng),
    status: shop.status,
  };
}

function validateShopForm(form: ShopFormState): string | null {
  if (!form.name.trim()) {
    return "Shop name is required.";
  }

  const lat = Number(form.originLat);
  const lng = Number(form.originLng);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return "Latitude must be between -90 and 90.";
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return "Longitude must be between -180 and 180.";
  }

  return null;
}

function ShopEditorCard({
  shop,
  onSave,
}: {
  shop: ShopLocation;
  onSave: (shopId: string, input: Omit<ShopLocation, "id" | "slug">) => Promise<void>;
}): JSX.Element {
  const [form, setForm] = useState<ShopFormState>(() => buildShopForm(shop));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(buildShopForm(shop));
    setFeedback("");
    setError("");
  }, [shop]);

  const validationError = useMemo(() => validateShopForm(form), [form]);
  const hasChanges =
    form.name !== shop.name ||
    form.originLat !== (shop.originLat == null ? "" : String(shop.originLat)) ||
    form.originLng !== (shop.originLng == null ? "" : String(shop.originLng)) ||
    form.status !== shop.status;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setFeedback("");
    setError("");

    try {
      await onSave(shop.id, {
        name: form.name.trim(),
        originLat: Number(form.originLat),
        originLng: Number(form.originLng),
        status: form.status,
      });
      setFeedback("Shop updated.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to save shop.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border border-[#e7d9c3] bg-white/90 p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-700">{shop.slug}</p>
          <h3 className="mt-1 font-heading text-2xl font-semibold text-ink">{shop.name}</h3>
        </div>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
          {shop.status}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="field">
          <span>Shop Name</span>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="input"
          />
        </label>

        <label className="field">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                status: event.target.value as ShopLocation["status"],
              }))
            }
            className="input"
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>

        <label className="field">
          <span>Latitude</span>
          <input
            value={form.originLat}
            onChange={(event) => setForm((current) => ({ ...current, originLat: event.target.value }))}
            className="input"
            placeholder="13.082680"
          />
        </label>

        <label className="field">
          <span>Longitude</span>
          <input
            value={form.originLng}
            onChange={(event) => setForm((current) => ({ ...current, originLng: event.target.value }))}
            className="input"
            placeholder="80.270721"
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      {feedback ? <p className="mt-3 text-sm text-emerald-700">{feedback}</p> : null}

      <div className="mt-5 flex justify-end">
        <button disabled={saving || !hasChanges || Boolean(validationError)} className="primary-button disabled:opacity-60">
          {saving ? "Saving..." : "Save Shop"}
        </button>
      </div>
    </form>
  );
}

export function SuperAdminShopsPage(): JSX.Element {
  const [shops, setShops] = useState<ShopLocation[]>([]);
  const [createForm, setCreateForm] = useState<ShopFormState>(emptyShopForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const refreshShops = async (): Promise<void> => {
    const nextShops = await fetchShopLocationsFromSupabase();
    setShops(nextShops);
  };

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        await refreshShops();
      } catch (issue) {
        setError(issue instanceof Error ? issue.message : "Unable to load shops.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const validationError = useMemo(() => validateShopForm(createForm), [createForm]);
  const canCreateMore = shops.length < MAX_SHOPS;

  if (loading) {
    return <Loader label="Loading shop locations..." />;
  }

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 xl:grid-cols-[300px_1fr]">
        <Sidebar title="Shops" subtitle="Super Admin" links={superAdminLinks} />

        <div className="space-y-6">
          <section className="card p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Shop Network</p>
            <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Manage fulfillment locations</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              These shop coordinates are now the source of truth for nearest-fulfillment. Admins only assign product stock to these shops; they no longer need to invent shop locations themselves.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["Configured shops", `${shops.length}`],
                ["Active shops", `${shops.filter((shop) => shop.status === "active").length}`],
                ["Remaining slots", `${Math.max(MAX_SHOPS - shops.length, 0)}`],
              ].map(([label, value]) => (
                <div key={label} className="stat-panel">
                  <p className="text-sm uppercase tracking-[0.16em] text-slate-500">{label}</p>
                  <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-3xl font-semibold text-ink">Add shop</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Keep the network tight and intentional. Once a shop is added here, admins can assign stock to it from product setup.
                </p>
              </div>
              {!canCreateMore ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                  Max {MAX_SHOPS} shops reached
                </span>
              ) : null}
            </div>

            <form
              className="mt-6 grid gap-4 md:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!canCreateMore) {
                  setError(`Keep the network to ${MAX_SHOPS} shops or fewer.`);
                  return;
                }

                if (validationError) {
                  setError(validationError);
                  return;
                }

                setSaving(true);
                setFeedback("");
                setError("");

                try {
                  const created = await createShopLocationInSupabase({
                    name: createForm.name.trim(),
                    originLat: Number(createForm.originLat),
                    originLng: Number(createForm.originLng),
                    status: createForm.status,
                  });
                  setShops((current) => [...current, created]);
                  setCreateForm(emptyShopForm);
                  setFeedback("Shop created.");
                } catch (issue) {
                  setError(issue instanceof Error ? issue.message : "Unable to create shop.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              <label className="field">
                <span>Shop Name</span>
                <input
                  value={createForm.name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                  className="input"
                  placeholder="Old Shop"
                />
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  value={createForm.status}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      status: event.target.value as ShopLocation["status"],
                    }))
                  }
                  className="input"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>

              <label className="field">
                <span>Latitude</span>
                <input
                  value={createForm.originLat}
                  onChange={(event) => setCreateForm((current) => ({ ...current, originLat: event.target.value }))}
                  className="input"
                  placeholder="13.082680"
                />
              </label>

              <label className="field">
                <span>Longitude</span>
                <input
                  value={createForm.originLng}
                  onChange={(event) => setCreateForm((current) => ({ ...current, originLng: event.target.value }))}
                  className="input"
                  placeholder="80.270721"
                />
              </label>

              <div className="md:col-span-2 flex items-center justify-between gap-4">
                <div>
                  {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                  {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}
                </div>
                <button disabled={saving || !canCreateMore || Boolean(validationError)} className="primary-button disabled:opacity-60">
                  {saving ? "Creating..." : "Add Shop"}
                </button>
              </div>
            </form>
          </section>

          {shops.length ? (
            <section className="grid gap-4 xl:grid-cols-2">
              {shops.map((shop) => (
                <ShopEditorCard
                  key={shop.id}
                  shop={shop}
                  onSave={async (shopId, input) => {
                    const updated = await updateShopLocationInSupabase(shopId, input);
                    setShops((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                  }}
                />
              ))}
            </section>
          ) : (
            <EmptyState
              title="No shops configured"
              description="Add the first fulfillment location here so admins can start assigning product stock to real shops."
            />
          )}
        </div>
      </main>
    </PageTransition>
  );
}
