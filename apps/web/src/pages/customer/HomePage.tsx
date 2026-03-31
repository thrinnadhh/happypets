import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Loader } from "@/components/common/Loader";
import { PageTransition } from "@/components/common/PageTransition";
import { Navbar } from "@/components/layout/Navbar";
import { ProductCard } from "@/components/products/ProductCard";
import { useCatalog } from "@/contexts/CatalogContext";
import {
  categoryCopy,
  displaySectionLabels,
  getCategoryPath,
  productCategories,
  sortProductsByPosition,
} from "@/data/catalog";
import { fetchBannersFromSupabase } from "@/lib/supabase";
import { Banner, Product, ProductCategory } from "@/types";

function ProductRail({
  title,
  description,
  products,
  cta,
}: {
  title: string;
  description: string;
  products: Product[];
  cta?: JSX.Element;
}): JSX.Element {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-120px" }}
      className="rounded-[34px] border border-white/60 bg-white/74 p-6 shadow-card backdrop-blur-sm md:p-8"
    >
      <div className="flex flex-col gap-4 border-b border-[#eee2cf] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-heading text-4xl font-semibold text-ink">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
        </div>
        {cta}
      </div>

      {products.length ? (
        <div className="mt-6 flex snap-x gap-5 overflow-x-auto pb-2">
          {products.map((product) => (
            <div key={product.id} className="min-w-[280px] max-w-[280px] snap-start sm:min-w-[300px] sm:max-w-[300px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[28px] border border-dashed border-[#e8dcc9] bg-[#fbf7ef] px-6 py-10 text-center text-sm text-slate-500">
          This section will fill automatically when matching products are available.
        </div>
      )}
    </motion.section>
  );
}

function CategoryRail({
  category,
  products,
}: {
  category: ProductCategory;
  products: Product[];
}): JSX.Element {
  return (
    <ProductRail
      title={displaySectionLabels[category]}
      description={categoryCopy[category]}
      products={products}
      cta={
        <Link to={getCategoryPath(category)} className="soft-button">
          View all {category.toLowerCase()}
        </Link>
      }
    />
  );
}

function BannerSlider({ banners }: { banners: Banner[] }): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (banners.length <= 1 || paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [banners.length, paused]);

  if (!banners.length) {
    return (
      <section className="relative overflow-hidden rounded-[34px] bg-[#17324a] p-8 text-white shadow-[0_28px_60px_rgba(23,50,74,0.28)] md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.28),transparent_34%),linear-gradient(155deg,rgba(255,255,255,0.05),transparent_46%)]" />
        <div className="relative">
          <span className="inline-flex rounded-full border border-white/18 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#f4df9d]">
            HappyPets storefront
          </span>
          <h1 className="mt-5 max-w-3xl font-heading text-5xl font-semibold tracking-[-0.04em] md:text-6xl">
            Premium pet nutrition, samples, and seasonal promotions in one storefront.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-white/78">
            Add up to four banners from the admin banner tab to turn this hero into a rotating campaign slider.
          </p>
        </div>
      </section>
    );
  }

  const activeBanner = banners[activeIndex];

  return (
    <section
      className="relative overflow-hidden rounded-[34px] shadow-[0_28px_60px_rgba(23,50,74,0.22)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#102232]/72 via-[#102232]/22 to-transparent" />
      <AnimatePresence mode="wait">
        <motion.img
          key={activeBanner.id}
          src={activeBanner.imageUrl}
          alt={`Banner ${activeBanner.position}`}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.55 }}
          className="h-[320px] w-full object-cover md:h-[440px]"
        />
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-0 z-20 p-6 md:p-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f4df9d]">
            Homepage banner {activeBanner.position}
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold text-white md:text-5xl">
            Fresh launches, trending packs, and curated essentials.
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/78">
            Rotate brand campaigns, festival offers, and hero visuals directly from the admin workspace.
          </p>
        </div>
        <div className="mt-5 flex gap-2">
          {banners.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition ${
                index === activeIndex ? "w-10 bg-white" : "w-4 bg-white/45"
              }`}
              aria-label={`Go to banner ${banner.position}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CustomerHomePage(): JSX.Element {
  const { products, loading } = useCatalog();
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        setBanners(await fetchBannersFromSupabase());
      } catch {
        setBanners([]);
      }
    })();
  }, []);

  const sectionedProducts = useMemo(() => {
    const grouped = {
      Dog: [] as Product[],
      Cat: [] as Product[],
      Fish: [] as Product[],
      Hamster: [] as Product[],
      Rabbit: [] as Product[],
      Birds: [] as Product[],
    };

    products.forEach((product) => {
      if (product.displaySection !== "Home") {
        grouped[product.displaySection].push(product);
      }
    });

    return Object.fromEntries(
      Object.entries(grouped).map(([section, items]) => [section, sortProductsByPosition(items)]),
    ) as Record<ProductCategory, Product[]>;
  }, [products]);

  const trendingProducts = useMemo(
    () => sortProductsByPosition(products.filter((product) => product.tags?.includes("trending"))).slice(0, 8),
    [products],
  );

  const newArrivals = useMemo(
    () =>
      [...products]
        .sort((left, right) => {
          const rightDate = new Date(right.createdAt ?? 0).getTime();
          const leftDate = new Date(left.createdAt ?? 0).getTime();
          return rightDate - leftDate;
        })
        .slice(0, 8),
    [products],
  );

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <Navbar />
      <main className="mx-auto flex max-w-[1500px] flex-col gap-8 px-4 py-6 md:px-6 md:py-8">
        <BannerSlider banners={banners} />

        {loading ? (
          <div className="py-10">
            <Loader label="Loading storefront..." />
          </div>
        ) : (
          <>
            <ProductRail
              title="Trending Products"
              description="Products carrying the trending tag are surfaced here first for the homepage audience."
              products={trendingProducts}
              cta={
                <Link to="/favorites" className="soft-button">
                  View favorites
                </Link>
              }
            />

            <ProductRail
              title="New Arrivals"
              description="The latest products added by admins show up here automatically, making fresh launches easy to spot."
              products={newArrivals}
            />

            {productCategories.map((category) => (
              <CategoryRail key={category} category={category} products={sectionedProducts[category]} />
            ))}
          </>
        )}
      </main>
    </PageTransition>
  );
}
