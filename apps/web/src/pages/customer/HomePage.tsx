import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Loader } from "@/components/common/Loader";
import { PageTransition } from "@/components/common/PageTransition";
import { Navbar } from "@/components/layout/Navbar";
import { ProductCard } from "@/components/products/ProductCard";
import { useCatalog } from "@/contexts/CatalogContext";
import {
  getCategoryLabel,
  getCategoryPath,
  productCategories,
  sortProductsByPosition,
} from "@/data/catalog";
import { fetchBannersFromSupabase } from "@/lib/supabase";
import { Banner, Product, ProductCategory } from "@/types";

const categoryEmojis: Record<string, string> = {
  Dog: "🐕", Cat: "🐱", Fish: "🐠", Hamster: "🐹", Rabbit: "🐰", Birds: "🦜",
};

const categoryColors: Record<string, string> = {
  Dog:     "from-amber-100 to-amber-50 border-amber-200",
  Cat:     "from-purple-100 to-purple-50 border-purple-200",
  Fish:    "from-cyan-100 to-cyan-50 border-cyan-200",
  Hamster: "from-orange-100 to-orange-50 border-orange-200",
  Rabbit:  "from-pink-100 to-pink-50 border-pink-200",
  Birds:   "from-green-100 to-green-50 border-green-200",
};

function ProductRail({
  title,
  emoji,
  description,
  products,
  cta,
}: {
  title: string;
  emoji?: string;
  description?: string;
  products: Product[];
  cta?: JSX.Element;
}): JSX.Element {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      className="card p-5 md:p-6"
    >
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            {emoji && <span className="text-2xl">{emoji}</span>}
            <h2 className="text-xl font-extrabold text-ink">{title}</h2>
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </div>
        {cta}
      </div>

      {products.length ? (
        <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="min-w-[200px] max-w-[200px] snap-start sm:min-w-[220px] sm:max-w-[220px]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-brand-200 bg-brand-50/30 px-6 py-8 text-center text-sm text-muted">
          Products will appear here when added.
        </div>
      )}
    </motion.section>
  );
}

function CategoryChips(): JSX.Element {
  return (
    <section>
      <h2 className="mb-3 text-base font-bold text-ink">Shop by Pet</h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {productCategories.map((cat) => (
          <Link
            key={cat}
            to={getCategoryPath(cat)}
            className={`flex flex-col items-center gap-2 rounded-xl border bg-gradient-to-b p-4 text-center transition hover:-translate-y-1 hover:shadow-card ${
              categoryColors[cat] ?? "from-gray-100 to-gray-50 border-gray-200"
            }`}
          >
            <span className="text-3xl">{categoryEmojis[cat] ?? "🐾"}</span>
            <p className="text-xs font-semibold text-ink">{getCategoryLabel(cat)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BannerSlider({ banners }: { banners: Banner[] }): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!banners.length) { setActiveIndex(0); return; }
    setActiveIndex((c) => (c >= banners.length ? 0 : c));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    const timer = window.setInterval(
      () => setActiveIndex((c) => (c + 1) % banners.length),
      4200,
    );
    return () => window.clearInterval(timer);
  }, [banners.length, paused]);

  if (!banners.length) {
    return (
      <section
        className="relative overflow-hidden rounded-2xl"
        style={{ background: "linear-gradient(135deg, #0df2f2 0%, #00a8a8 50%, #005f60 100%)" }}
      >
        <div className="relative flex h-[260px] items-center px-8 sm:h-[320px] md:h-[400px]">
          <div className="max-w-lg">
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
              🐾 New Collection
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl">
              Playtime Just Got{" "}
              <span className="rounded-lg bg-white/20 px-2 py-1">Bouncier!</span>
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Discover the most fun toys & treats for your furry best friends.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/category/Dog"
                className="rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-brand-700 shadow-glow transition hover:shadow-glow hover:scale-105"
              >
                Shop Now
              </Link>
              <button className="rounded-xl border-2 border-white/60 bg-transparent px-6 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
                Browse All
              </button>
            </div>
          </div>
          <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 text-[120px] opacity-20 md:block">
            🐕
          </div>
        </div>
      </section>
    );
  }

  const activeBanner = banners[activeIndex];
  return (
    <section
      className="relative overflow-hidden rounded-2xl shadow-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={activeBanner.id}
          src={activeBanner.imageUrl}
          alt={`Banner ${activeBanner.position}`}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.5 }}
          className="h-[220px] w-full object-cover sm:h-[280px] md:h-[420px]"
        />
      </AnimatePresence>
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeIndex ? "w-8 bg-brand-400" : "w-2 bg-white/60"
              }`}
              aria-label={`Banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CustomerHomePage(): JSX.Element {
  const { products, loading } = useCatalog();
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    void (async () => {
      try { setBanners(await fetchBannersFromSupabase()); }
      catch { setBanners([]); }
    })();
  }, []);

  const sortedBanners = useMemo(
    () =>
      [...banners]
        .filter((b) => b.position >= 1 && b.position <= 10)
        .sort((a, b) => a.position - b.position),
    [banners],
  );

  const sectionedProducts = useMemo(() => {
    const grouped: Record<string, Product[]> = {
      Dog: [], Cat: [], Fish: [], Hamster: [], Rabbit: [], Birds: [],
    };
    products.forEach((p) => {
      if (p.displaySection !== "Home") grouped[p.displaySection]?.push(p);
    });
    return Object.fromEntries(
      Object.entries(grouped).map(([k, v]) => [k, sortProductsByPosition(v)]),
    ) as Record<ProductCategory, Product[]>;
  }, [products]);

  const trendingProducts = useMemo(
    () => sortProductsByPosition(products.filter((p) => p.tags?.includes("trending"))).slice(0, 8),
    [products],
  );

  const newArrivals = useMemo(
    () =>
      [...products]
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        .slice(0, 8),
    [products],
  );

  return (
    <PageTransition className="min-h-screen bg-page">
      <Navbar />
      <main className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <BannerSlider banners={sortedBanners} />

        <CategoryChips />

        {loading ? (
          <Loader label="Loading storefront…" />
        ) : (
          <>
            <ProductRail
              title="Trending Now"
              emoji="🔥"
              description="Most-loved picks from our catalog"
              products={trendingProducts}
              cta={<Link to="/favorites" className="btn-secondary text-xs px-3 py-1.5">View Favorites</Link>}
            />

            <ProductRail
              title="New Arrivals"
              emoji="✨"
              description="Freshly added to our store"
              products={newArrivals}
            />

            {productCategories.map((category) => (
              <ProductRail
                key={category}
                title={getCategoryLabel(category)}
                emoji={categoryEmojis[category]}
                products={sectionedProducts[category]}
                cta={
                  <Link to={getCategoryPath(category)} className="btn-secondary text-xs px-3 py-1.5">
                    View All
                  </Link>
                }
              />
            ))}
          </>
        )}
      </main>
    </PageTransition>
  );
}
