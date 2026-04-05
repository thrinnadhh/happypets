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
      className="w-full space-y-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink sm:text-3xl">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>
        {cta && <div className="hidden sm:block">{cta}</div>}
      </div>

      {products.length ? (
        <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="min-w-[160px] max-w-[160px] snap-start sm:min-w-[200px] sm:max-w-[200px] md:min-w-[240px] md:max-w-[240px] lg:min-w-[280px] lg:max-w-[280px]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[16px] border-2 border-dashed border-pet-teal bg-blue-50 px-4 py-8 text-center text-sm text-slate-600 sm:px-6 sm:py-10">
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
      title={getCategoryLabel(category)}
      products={products}
      cta={
        <Link to={getCategoryPath(category)} className="soft-button">
          View all {getCategoryLabel(category).toLowerCase()}
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
      <section className="relative overflow-hidden rounded-[20px] bg-pet-yellow sm:rounded-[28px]">
        <div className="relative flex min-h-[280px] flex-col items-center justify-center px-4 py-8 sm:min-h-[340px] sm:py-10 md:min-h-[420px] md:px-8 md:py-12">
          <div className="w-full space-y-4 text-center">
            <div className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold text-pet-orange sm:px-4 sm:text-sm">
              🎾 NEW ARRIVALS
            </div>
            <h1 className="font-heading text-3xl font-bold text-ink sm:text-4xl md:text-5xl leading-tight">
              Playtime Just Got
              <br />
              <span className="text-pet-orange">Bouncier!</span>
            </h1>
            <p className="mx-auto max-w-md text-sm text-ink/80 sm:text-base">
              Discover the most squeaky, durable, and fun toys for your furry best friends. Guaranteed tail wags!
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                to="/category/Dog"
                className="orange-button px-6 py-3 sm:px-8 sm:py-3"
              >
                Shop Collection
              </Link>
              <button className="rounded-full border-2 border-ink bg-transparent px-6 py-3 font-semibold text-ink transition hover:bg-black/5 sm:px-8">
                See Trends
              </button>
            </div>
          </div>
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
      className="relative overflow-hidden rounded-[28px] shadow-[0_28px_60px_rgba(251,191,36,0.22)] md:rounded-[34px] ring-4 ring-[#fbbf24]/30"
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
          <div className="pointer-events-auto flex justify-center">
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
    <PageTransition className="min-h-screen bg-pet-cream">
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-4 sm:gap-8 sm:py-6 md:px-6 md:py-8">
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
