import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { PinLocationMap } from "@/components/maps/PinLocationMap";
import { PageTransition } from "@/components/common/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAdminDeliveryConfigFromSupabase,
  searchDeliveryAddressesInSupabase,
  upsertAdminDeliveryConfigInSupabase,
} from "@/lib/supabase";
import { adminLinks } from "@/pages/admin/navigation";
import { LatLng, getDefaultIndiaCenter, hasTomTomPublicKey, reverseGeocodeTomTom } from "@/lib/tomtom";
import { AdminDeliveryConfig, DeliveryAddressSuggestion } from "@/types";

type DeliveryFormState = {
  originAddress: string;
  originLat: string;
  originLng: string;
  baseFeeInr: string;
  includedDistanceKm: string;
  extraPerKmInr: string;
  maxServiceDistanceKm: string;
  isActive: boolean;
};

function buildFormState(config: AdminDeliveryConfig): DeliveryFormState {
  return {
    originAddress: config.originAddress,
    originLat: config.originLat == null ? "" : String(config.originLat),
    originLng: config.originLng == null ? "" : String(config.originLng),
    baseFeeInr: String(config.baseFeeInr),
    includedDistanceKm: String(config.includedDistanceKm),
    extraPerKmInr: String(config.extraPerKmInr),
    maxServiceDistanceKm: String(config.maxServiceDistanceKm),
    isActive: config.isActive,
  };
}

function validateForm(form: DeliveryFormState): Partial<Record<keyof DeliveryFormState, string>> {
  const errors: Partial<Record<keyof DeliveryFormState, string>> = {};
  const latitude = Number(form.originLat);
  const longitude = Number(form.originLng);
  const baseFee = Number(form.baseFeeInr);
  const includedDistance = Number(form.includedDistanceKm);
  const extraPerKm = Number(form.extraPerKmInr);
  const maxDistance = Number(form.maxServiceDistanceKm);

  if (!form.originAddress.trim()) {
    errors.originAddress = "Origin address is required.";
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.originLat = "Latitude must be between -90 and 90.";
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.originLng = "Longitude must be between -180 and 180.";
  }

  if (!Number.isFinite(baseFee) || baseFee < 0) {
    errors.baseFeeInr = "Base fee must be 0 or greater.";
  }

  if (!Number.isFinite(includedDistance) || includedDistance < 0) {
    errors.includedDistanceKm = "Included distance must be 0 or greater.";
  }

  if (!Number.isFinite(extraPerKm) || extraPerKm < 0) {
    errors.extraPerKmInr = "Extra per km must be 0 or greater.";
  }

  if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
    errors.maxServiceDistanceKm = "Maximum service distance must be greater than 0.";
  }

  return errors;
}

export function AdminDeliveryPage(): JSX.Element {
  const { user } = useAuth();
  const [config, setConfig] = useState<AdminDeliveryConfig | null>(null);
  const [form, setForm] = useState<DeliveryFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<DeliveryAddressSuggestion[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<DeliveryAddressSuggestion | null>(null);
  const [searchingOrigins, setSearchingOrigins] = useState(false);
  const [originSearchError, setOriginSearchError] = useState("");
  const [mapError, setMapError] = useState("");
  const [resolvingMapPin, setResolvingMapPin] = useState(false);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const nextConfig = await fetchAdminDeliveryConfigFromSupabase();
        setConfig(nextConfig);
        setForm(buildFormState(nextConfig));
      } catch (issue) {
        setError(issue instanceof Error ? issue.message : "Unable to load delivery settings.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    const query = form?.originAddress.trim() ?? "";
    const isSavedOrigin =
      Boolean(config) &&
      query === config?.originAddress.trim() &&
      form?.originLat === (config?.originLat == null ? "" : String(config.originLat)) &&
      form?.originLng === (config?.originLng == null ? "" : String(config.originLng));

    if (!form || query.length < 5 || selectedOrigin?.address === query || isSavedOrigin) {
      setOriginSuggestions([]);
      setSearchingOrigins(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setSearchingOrigins(true);
        setOriginSearchError("");
        const suggestions = await searchDeliveryAddressesInSupabase(query);
        if (!cancelled) {
          setOriginSuggestions(suggestions);
        }
      } catch (issue) {
        if (!cancelled) {
          setOriginSuggestions([]);
          setOriginSearchError(issue instanceof Error ? issue.message : "Unable to search origin addresses.");
        }
      } finally {
        if (!cancelled) {
          setSearchingOrigins(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [config, form, selectedOrigin?.address]);

  const formErrors = useMemo(() => (form ? validateForm(form) : {}), [form]);
  const hasFormErrors = Object.keys(formErrors).length > 0;
  const canShowMap = hasTomTomPublicKey();
  const currentMapPosition: LatLng | null = useMemo(() => {
    if (!form) {
      return null;
    }

    const lat = Number(form.originLat);
    const lng = Number(form.originLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { lat, lng };
  }, [form]);
  const mapCenter = currentMapPosition ?? (selectedOrigin
    ? { lat: selectedOrigin.latitude, lng: selectedOrigin.longitude }
    : getDefaultIndiaCenter());

  const handleOriginInputChange = (value: string): void => {
    if (!form) {
      return;
    }

    setForm((current) => current ? { ...current, originAddress: value } : current);
    setSelectedOrigin(null);
    setOriginSuggestions([]);
    setOriginSearchError("");
  };

  const handleSelectOrigin = (suggestion: DeliveryAddressSuggestion): void => {
    setSelectedOrigin(suggestion);
    setOriginSuggestions([]);
    setOriginSearchError("");
    setForm((current) =>
      current
        ? {
            ...current,
            originAddress: suggestion.address,
            originLat: String(suggestion.latitude),
            originLng: String(suggestion.longitude),
          }
        : current);
  };

  const handlePickOriginFromMap = async (position: LatLng): Promise<void> => {
    if (!form) {
      return;
    }

    setResolvingMapPin(true);
    setMapError("");
    setOriginSearchError("");
    setOriginSuggestions([]);
    setSelectedOrigin(null);
    setForm((current) =>
      current
        ? {
            ...current,
            originLat: position.lat.toFixed(6),
            originLng: position.lng.toFixed(6),
          }
        : current);

    try {
      const result = await reverseGeocodeTomTom(position);
      setForm((current) =>
        current
          ? {
              ...current,
              originAddress: result.address,
              originLat: result.latitude.toFixed(6),
              originLng: result.longitude.toFixed(6),
            }
          : current);
    } catch (issue) {
      setMapError(issue instanceof Error ? issue.message : "Unable to resolve the pin location.");
    } finally {
      setResolvingMapPin(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!form) {
      return;
    }

    if (hasFormErrors) {
      setError(Object.values(formErrors)[0] ?? "Please fix the delivery settings.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved = await upsertAdminDeliveryConfigInSupabase({
        originAddress: form.originAddress,
        originLat: Number(form.originLat),
        originLng: Number(form.originLng),
        baseFeeInr: Number(form.baseFeeInr),
        includedDistanceKm: Number(form.includedDistanceKm),
        extraPerKmInr: Number(form.extraPerKmInr),
        maxServiceDistanceKm: Number(form.maxServiceDistanceKm),
        isActive: form.isActive,
      });
      setConfig(saved);
      setForm(buildFormState(saved));
      setMessage("Delivery settings saved. New quotes will use them immediately.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to save delivery settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader label="Loading delivery settings..." />;
  }

  if (!form || !config) {
    return (
      <PageTransition className="min-h-screen bg-soft-grid">
        <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 xl:grid-cols-[280px_1fr]">
          <Sidebar title="Delivery Pricing" subtitle="Admin" links={adminLinks} />
          <EmptyState
            title="Delivery settings unavailable"
            description={error || "We couldn't load delivery settings for this shop yet."}
          />
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 xl:grid-cols-[280px_1fr]">
        <Sidebar title="Delivery Pricing" subtitle="Admin" links={adminLinks} />

        <div className="space-y-6">
          {!user?.approved ? (
            <EmptyState
              title="Pending Approval"
              description="Delivery pricing unlocks once your admin account is approved."
            />
          ) : (
            <>
              <section className="card p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Delivery</p>
                <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Configure route-based delivery</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                  Quotes are calculated from your shop&apos;s dispatch origin with TomTom routing. Customers can only check out one shop at a time, so these settings directly control their delivery fee.
                </p>
                <p className="mt-4 text-sm text-slate-500">Shop: {config.shopName}</p>
                {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}
                {error ? <p className="mt-4 text-sm text-rose-500">{error}</p> : null}
              </section>

              <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                <section className="card p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Pricing formula</p>
                  <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    <label className="field">
                      <span>Dispatch origin address</span>
                      <input
                        value={form.originAddress}
                        onChange={(event) => handleOriginInputChange(event.target.value)}
                        className="input"
                        placeholder="Search your shop, warehouse, or landmark"
                        required
                      />
                      {formErrors.originAddress ? <p className="text-xs text-rose-500">{formErrors.originAddress}</p> : null}
                    </label>

                    {searchingOrigins ? <p className="text-xs text-slate-500">Searching TomTom addresses...</p> : null}
                    {originSearchError ? <p className="text-xs text-rose-500">{originSearchError}</p> : null}
                    {originSuggestions.length ? (
                      <div className="space-y-2 rounded-[24px] border border-[#eadfce] bg-white p-3">
                        {originSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => handleSelectOrigin(suggestion)}
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
                          <p className="text-sm font-medium text-ink">Pin the dispatch location</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Search first, or click directly on the map to refine the warehouse location.
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
                              void handlePickOriginFromMap(position);
                            }}
                          />
                          <p className="text-xs text-slate-500">
                            Click the map or drag the marker to set the exact dispatch point.
                          </p>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-amber-700">
                          Add `VITE_TOMTOM_API_KEY` or `NEXT_PUBLIC_TOMTOM_API_KEY` to enable map pin selection in the browser.
                        </p>
                      )}
                      {mapError ? <p className="mt-3 text-xs text-rose-500">{mapError}</p> : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="field">
                        <span>Latitude</span>
                        <input
                          value={form.originLat}
                          onChange={(event) => setForm((current) => current ? { ...current, originLat: event.target.value } : current)}
                          className="input"
                          inputMode="decimal"
                          placeholder="13.082680"
                        />
                        {formErrors.originLat ? <p className="text-xs text-rose-500">{formErrors.originLat}</p> : null}
                      </label>

                      <label className="field">
                        <span>Longitude</span>
                        <input
                          value={form.originLng}
                          onChange={(event) => setForm((current) => current ? { ...current, originLng: event.target.value } : current)}
                          className="input"
                          inputMode="decimal"
                          placeholder="80.270721"
                        />
                        {formErrors.originLng ? <p className="text-xs text-rose-500">{formErrors.originLng}</p> : null}
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="field">
                        <span>Base fee (INR)</span>
                        <input
                          value={form.baseFeeInr}
                          onChange={(event) => setForm((current) => current ? { ...current, baseFeeInr: event.target.value } : current)}
                          className="input"
                          inputMode="decimal"
                        />
                        {formErrors.baseFeeInr ? <p className="text-xs text-rose-500">{formErrors.baseFeeInr}</p> : null}
                      </label>

                      <label className="field">
                        <span>Included distance (km)</span>
                        <input
                          value={form.includedDistanceKm}
                          onChange={(event) => setForm((current) => current ? { ...current, includedDistanceKm: event.target.value } : current)}
                          className="input"
                          inputMode="decimal"
                        />
                        {formErrors.includedDistanceKm ? <p className="text-xs text-rose-500">{formErrors.includedDistanceKm}</p> : null}
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="field">
                        <span>Extra per km (INR)</span>
                        <input
                          value={form.extraPerKmInr}
                          onChange={(event) => setForm((current) => current ? { ...current, extraPerKmInr: event.target.value } : current)}
                          className="input"
                          inputMode="decimal"
                        />
                        {formErrors.extraPerKmInr ? <p className="text-xs text-rose-500">{formErrors.extraPerKmInr}</p> : null}
                      </label>

                      <label className="field">
                        <span>Max service distance (km)</span>
                        <input
                          value={form.maxServiceDistanceKm}
                          onChange={(event) => setForm((current) => current ? { ...current, maxServiceDistanceKm: event.target.value } : current)}
                          className="input"
                          inputMode="decimal"
                        />
                        {formErrors.maxServiceDistanceKm ? <p className="text-xs text-rose-500">{formErrors.maxServiceDistanceKm}</p> : null}
                      </label>
                    </div>

                    <label className="flex items-center gap-3 rounded-[20px] border border-[#eadfce] bg-[#fcfaf6] px-4 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(event) => setForm((current) => current ? { ...current, isActive: event.target.checked } : current)}
                      />
                      Delivery pricing active for this shop
                    </label>

                    <button
                      type="submit"
                      disabled={saving}
                      className="primary-button disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save delivery settings"}
                    </button>
                  </form>
                </section>

                <section className="card p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Live rule summary</p>
                  <div className="mt-5 space-y-4 text-sm text-slate-600">
                    <div className="rounded-[20px] border border-[#eadfce] bg-[#fcfaf6] p-4">
                      <p className="font-semibold text-ink">Current formula</p>
                      <p className="mt-2">
                        Charge Rs.{Number(form.baseFeeInr || 0).toFixed(2)} as base fee, include the first {Number(form.includedDistanceKm || 0).toFixed(1)} km,
                        then add Rs.{Number(form.extraPerKmInr || 0).toFixed(2)} per additional km.
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-[#eadfce] bg-[#fcfaf6] p-4">
                      <p className="font-semibold text-ink">Service radius</p>
                      <p className="mt-2">Customers outside {Number(form.maxServiceDistanceKm || 0).toFixed(1)} km will be blocked from checkout.</p>
                    </div>
                    <div className="rounded-[20px] border border-[#eadfce] bg-[#fcfaf6] p-4">
                      <p className="font-semibold text-ink">Origin point</p>
                      <p className="mt-2">{form.originAddress || "Choose your dispatch origin to start quoting deliveries."}</p>
                    </div>
                    <div className="rounded-[20px] border border-[#eadfce] bg-[#fcfaf6] p-4">
                      <p className="font-semibold text-ink">Status</p>
                      <p className="mt-2">{form.isActive ? "Active and ready to quote delivery." : "Inactive. Customers will not receive delivery quotes."}</p>
                    </div>
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
