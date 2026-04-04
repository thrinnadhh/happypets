import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Loader } from "@/components/common/Loader";
import { PageTransition } from "@/components/common/PageTransition";
import { Navbar } from "@/components/layout/Navbar";
import { ProductCard } from "@/components/products/ProductCard";
import { useCatalog } from "@/contexts/CatalogContext";
import {
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
  description?: string;
  products: Product[];
  cta?: JSX.Element;
}): JSX.Element {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-120px" }}
      className="rounded-[28px] border border-white/60 bg-white/78 p-4 shadow-card backdrop-blur-sm sm:p-5 md:rounded-[34px] md:p-8"
    >
      <div className="flex flex-col gap-3 border-b border-[#eee2cf] pb-4 md:flex-row md:items-end md:justify-between md:gap-4 md:pb-5">
        <div>
          <h2 className="font-heading text-3xl font-semibold text-ink md:text-4xl">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 md:mt-3 md:leading-7">{description}</p> : null}
        </div>
        {cta}
      </div>

      {products.length ? (
        <div className="mt-5 flex snap-x gap-3 overflow-x-auto pb-2 sm:gap-4 md:mt-6 md:gap-5">
          {products.map((product) => (
            <div
              key={product.id}
              className="min-w-[224px] max-w-[224px] snap-start sm:min-w-[252px] sm:max-w-[252px] md:min-w-[280px] md:max-w-[280px] lg:min-w-[300px] lg:max-w-[300px]"
            >
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
      title={category}
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
    if (!banners.length) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((current) => (current >= banners.length ? 0 : current));
  }, [banners.length]);

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
      <section className="relative overflow-hidden rounded-[28px] bg-[#17324a] shadow-[0_28px_60px_rgba(23,50,74,0.28)] md:rounded-[34px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.28),transparent_34%),linear-gradient(155deg,rgba(255,255,255,0.05),transparent_46%)]" />
        <div className="relative h-[220px] sm:h-[280px] md:h-[360px]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#17324a] via-[#274764] to-[#355b80]" />
        </div>
      </section>
    );
  }

  const activeBanner = banners[activeIndex];
  const goToPrevious = (): void => {
    setActiveIndex((current) => (current - 1 + banners.length) % banners.length);
  };
  const goToNext = (): void => {
    setActiveIndex((current) => (current + 1) % banners.length);
  };

  return (
    <section
      className="relative overflow-hidden rounded-[28px] shadow-[0_28px_60px_rgba(23,50,74,0.22)] md:rounded-[34px]"
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
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.55 }}
          className="h-[220px] w-full object-cover sm:h-[280px] md:h-[440px]"
        />
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 sm:p-5 md:p-8">
        {banners.length > 1 ? (
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 rounded-full bg-[#102232]/35 px-3 py-2 backdrop-blur-md">
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={goToPrevious}
                className="rounded-full border border-white/20 bg-[#102232]/35 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-[#102232]/55 md:px-4"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="rounded-full border border-white/20 bg-[#102232]/35 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-[#102232]/55 md:px-4"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
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

  const sortedBanners = useMemo(
    () =>
      [...banners]
        .filter((banner) => banner.position >= 1 && banner.position <= 10)
        .sort((left, right) => left.position - right.position),
    [banners],
  );

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
        <BannerSlider banners={sortedBanners} />

        {loading ? (
          <div className="py-10">
            <Loader label="Loading storefront..." />
          </div>
        ) : (
          <>
            <ProductRail
              title="Trending Products"
              description="Curated picks from the current catalog."
              products={trendingProducts}
              cta={
                <Link to="/favorites" className="soft-button">
                  View favorites
                </Link>
              }
            />

            <ProductRail
              title="New Arrivals"
              description="Newly added products appear here automatically."
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
