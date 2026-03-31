import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { PageTransition } from "@/components/common/PageTransition";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  deleteBannerFromSupabase,
  fetchBannersFromSupabase,
  saveBannerInSupabase,
  uploadImageToSupabase,
} from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Banner } from "@/types";

const MAX_BANNER_SLOTS = 10;

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/banners", label: "Banners" },
];

export function AdminBannersPage(): JSX.Element {
  const { user } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPosition, setSavingPosition] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setBanners(await fetchBannersFromSupabase());
      } catch (issue) {
        setError(issue instanceof Error ? issue.message : "Unable to load banners.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const bannersByPosition = useMemo(() => {
    const map = new Map<number, Banner>();
    banners.forEach((banner) => map.set(banner.position, banner));
    return map;
  }, [banners]);

  const handleSave = async (position: Banner["position"], imageUrl: string): Promise<void> => {
    setSavingPosition(position);
    setError("");

    try {
      const saved = await saveBannerInSupabase({ position, imageUrl });
      setBanners((current) => {
        const withoutSlot = current.filter((banner) => banner.position !== position && banner.id !== saved.id);
        return [...withoutSlot, saved].sort((left, right) => left.position - right.position);
      });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to save banner.");
    } finally {
      setSavingPosition(null);
    }
  };

  const handleDelete = async (banner: Banner): Promise<void> => {
    setSavingPosition(banner.position);
    setError("");

    try {
      await deleteBannerFromSupabase(banner.id);
      setBanners((current) => current.filter((item) => item.id !== banner.id));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to remove banner.");
    } finally {
      setSavingPosition(null);
    }
  };

  if (loading) {
    return <Loader label="Loading banner manager..." />;
  }

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 xl:grid-cols-[280px_1fr]">
        <Sidebar title="Banner Management" subtitle="Admin" links={adminLinks} />

        <div className="space-y-6">
          {!user?.approved ? (
            <EmptyState
              title="Pending Approval"
              description="Banner management unlocks after your admin approval is completed."
            />
          ) : (
            <>
              <section className="card p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Homepage banners</p>
                <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Control the top carousel</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                  HappyPets supports up to ten homepage banners. Each slot maps directly to a position in the rotating hero.
                </p>
                {error ? <p className="mt-4 text-sm text-rose-500">{error}</p> : null}
              </section>

              <section className="grid gap-5 lg:grid-cols-2">
                {Array.from({ length: MAX_BANNER_SLOTS }, (_, index) => index + 1).map((position) => (
                  <BannerSlotCard
                    key={position}
                    position={position}
                    banner={bannersByPosition.get(position)}
                    saving={savingPosition === position}
                    onSave={handleSave}
                    onDelete={handleDelete}
                  />
                ))}
              </section>
            </>
          )}
        </div>
      </main>
    </PageTransition>
  );
}

function BannerSlotCard({
  position,
  banner,
  saving,
  onSave,
  onDelete,
}: {
  position: Banner["position"];
  banner?: Banner;
  saving: boolean;
  onSave: (position: Banner["position"], imageUrl: string) => Promise<void>;
  onDelete: (banner: Banner) => Promise<void>;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    setImageUrl(banner?.imageUrl ?? "");
  }, [banner?.id, banner?.imageUrl]);

  const handleFileChange = async (file?: File): Promise<void> => {
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadImageToSupabase(file, setUploadProgress);
      setImageUrl(publicUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.section whileHover={{ y: -4 }} className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Banner slot {position}</p>
          <h2 className="mt-2 font-heading text-3xl font-semibold text-ink">
            {banner ? "Update banner" : "Add banner"}
          </h2>
        </div>
        {banner ? (
          <button
            type="button"
            onClick={() => void onDelete(banner)}
            className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div className="mt-5 space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleFileChange(event.target.files?.[0])}
        />
        <button type="button" onClick={() => inputRef.current?.click()} className="soft-button">
          Upload image
        </button>
        <input
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          className="input"
          placeholder="Paste banner image URL"
        />
        {imageUrl ? (
          <div className="overflow-hidden rounded-[24px] border border-[#e8dfd1] bg-[#f8f2e8]">
            <img src={imageUrl} alt={`Banner slot ${position}`} className="h-48 w-full object-cover" />
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[#e8dfd1] bg-[#fbf7ef] px-4 py-10 text-center text-sm text-slate-500">
            This slot is empty.
          </div>
        )}
        {uploading ? (
          <p className="text-xs text-slate-500">Uploading to Supabase Storage... {uploadProgress}%</p>
        ) : null}
        <button
          type="button"
          onClick={() => void onSave(position, imageUrl)}
          disabled={saving || !imageUrl}
          className="primary-button disabled:opacity-60"
        >
          {saving ? "Saving..." : banner ? "Update banner" : "Save banner"}
        </button>
      </div>
    </motion.section>
  );
}
