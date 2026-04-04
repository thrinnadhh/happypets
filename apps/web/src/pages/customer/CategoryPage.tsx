import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/components/common/EmptyState";
import { PageTransition } from "@/components/common/PageTransition";
import { Navbar } from "@/components/layout/Navbar";
import { ProductCard } from "@/components/products/ProductCard";
import { useCatalog } from "@/contexts/CatalogContext";
import {
  categoryLifeStages,
  categoryCopy,
  getCategoryLabel,
  getCategoryFromSlug,
  getCategoryPath,
  normalizeLifeStage,
  productTagLabels,
  productTagStyles,
  productTags,
  sortProductsByPosition,
} from "@/data/catalog";
import { ProductTag } from "@/types";

export function CategoryPage(): JSX.Element {
  const { type } = useParams();
  const category = getCategoryFromSlug(type);
  const { products } = useCatalog();
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [selectedLifeStage, setSelectedLifeStage] = useState<string>("All");
  const [selectedTag, setSelectedTag] = useState<ProductTag | "all">("all");

  useEffect(() => {
    setSelectedBrand("All");
    setSelectedLifeStage("All");
    setSelectedTag("all");
  }, [category]);

  const categoryProducts = useMemo(() => {
    if (!category) return [];
    return sortProductsByPosition(products.filter((product) => product.category === category));
  }, [category, products]);

  const brands = useMemo(
    () => ["All", ...new Set(categoryProducts.map((product) => product.brand))],
    [categoryProducts],
  );
  const lifeStages = useMemo(
    () =>
      category
        ? ["All", ...(categoryLifeStages[category] ?? [])]
        : ["All"],
    [category],
  );

  const filteredProducts = useMemo(
    () =>
      categoryProducts.filter((product) => {
        const matchesBrand = selectedBrand === "All" || product.brand === selectedBrand;
        const resolvedLifeStage = normalizeLifeStage(
          product.category,
          product.lifeStage,
          `${product.name} ${product.description ?? ""}`,
        );
        const matchesLifeStage =
          selectedLifeStage === "All" || resolvedLifeStage === selectedLifeStage;
        const matchesTag = selectedTag === "all" || product.tags?.includes(selectedTag);
        return matchesBrand && matchesLifeStage && matchesTag;
      }),
    [categoryProducts, selectedBrand, selectedLifeStage, selectedTag],
  );

  if (!category) {
    return (
      <PageTransition className="min-h-screen bg-soft-grid">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <EmptyState
            title="Category not found"
            description="That category route does not match the current HappyPets catalog."
            action={
              <Link to="/customer/home" className="primary-button">
                Return home
              </Link>
            }
          />
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <Navbar />
      <main className="mx-auto flex max-w-[1500px] flex-col gap-8 px-4 py-6 md:px-6 md:py-8">
        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[34px] bg-[#17324a] p-7 text-white shadow-[0_28px_60px_rgba(23,50,74,0.28)] md:p-9"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f4df9d]">Category</p>
            <h1 className="mt-4 font-heading text-5xl font-semibold tracking-[-0.04em] md:text-6xl">
              {getCategoryLabel(category)}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-white/78">{categoryCopy[category]}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/customer/home" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#17324a]">
                Back to home
              </Link>
              <a href="#filters" className="rounded-full border border-white/16 bg-white/10 px-5 py-3 text-sm font-semibold text-white">
                Jump to filters
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3"
          >
            {[
              ["Products", `${categoryProducts.length}`],
              ["Brands", `${brands.length - 1}`],
              ["Stages", `${Math.max(lifeStages.length - 1, 0)}`],
              ["Recommended", `${categoryProducts.filter((product) => product.tags?.includes("recommended")).length}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-soft backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <p className="mt-4 text-3xl font-semibold text-ink">{value}</p>
              </div>
            ))}
          </motion.div>
        </section>

        <section
          id="filters"
          className="rounded-[34px] border border-white/60 bg-white/82 p-6 shadow-card backdrop-blur-sm md:p-8"
        >
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Brands</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {brands.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedBrand(brand)}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      selectedBrand === brand
                        ? "border-brand-300 bg-brand-100 text-brand-700"
                        : "border-[#e7d9c3] bg-[#fcf8f1] text-slate-500 hover:border-brand-300 hover:text-brand-700"
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            <div>
              {categoryLifeStages[category]?.length ? (
                <>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Stage</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {lifeStages.map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setSelectedLifeStage(stage)}
                        className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          selectedLifeStage === stage
                            ? "border-brand-300 bg-brand-100 text-brand-700"
                            : "border-[#e7d9c3] bg-[#fcf8f1] text-slate-500 hover:border-brand-300 hover:text-brand-700"
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Tags</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTag("all")}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selectedTag === "all"
                      ? "border-[#17324a] bg-[#17324a] text-white"
                      : "border-[#e7d9c3] bg-[#fcf8f1] text-slate-500 hover:border-brand-300 hover:text-brand-700"
                  }`}
                >
                  All
                </button>
                {productTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      selectedTag === tag
                        ? productTagStyles[tag]
                        : "border-[#e7d9c3] bg-[#fcf8f1] text-slate-500 hover:border-brand-300 hover:text-brand-700"
                    }`}
                  >
                    {productTagLabels[tag]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-heading text-4xl font-semibold text-ink">
                Browse the full {getCategoryLabel(category).toLowerCase()} shelf
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Filter by brand or tag, then open any product for details, favorites, and related picks.
              </p>
            </div>
            {selectedBrand !== "All" || selectedLifeStage !== "All" || selectedTag !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedBrand("All");
                  setSelectedLifeStage("All");
                  setSelectedTag("all");
                }}
                className="soft-button"
              >
                Reset filters
              </button>
            ) : (
              <Link to={getCategoryPath(category)} className="soft-button">
                Refresh view
              </Link>
            )}
          </div>

          {filteredProducts.length ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No products match these filters"
              description="Try another brand or tag combination to widen this category shelf."
            />
          )}
        </section>
      </main>
    </PageTransition>
  );
}
