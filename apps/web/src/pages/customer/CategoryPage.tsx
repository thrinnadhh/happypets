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

const categoryEmojis: Record<string, string> = {
  Dog: "🐕", Cat: "🐱", Fish: "🐠", Hamster: "🐹", Rabbit: "🐰", Birds: "🦜",
};

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
    return sortProductsByPosition(products.filter((p) => p.category === category));
  }, [category, products]);

  const brands = useMemo(
    () => ["All", ...new Set(categoryProducts.map((p) => p.brand))],
    [categoryProducts],
  );
  const lifeStages = useMemo(
    () => (category ? ["All", ...(categoryLifeStages[category] ?? [])] : ["All"]),
    [category],
  );
  const filteredProducts = useMemo(
    () =>
      categoryProducts.filter((p) => {
        const matchesBrand = selectedBrand === "All" || p.brand === selectedBrand;
        const resolved = normalizeLifeStage(p.category, p.lifeStage, `${p.name} ${p.description ?? ""}`);
        const matchesStage = selectedLifeStage === "All" || resolved === selectedLifeStage;
        const matchesTag = selectedTag === "all" || p.tags?.includes(selectedTag);
        return matchesBrand && matchesStage && matchesTag;
      }),
    [categoryProducts, selectedBrand, selectedLifeStage, selectedTag],
  );

  if (!category) {
    return (
      <PageTransition className="min-h-screen bg-page">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <EmptyState
            title="Category not found"
            description="That category route does not match the current HappyPets catalog."
          />
          <div className="mt-4 text-center">
            <Link to="/customer/home" className="btn-primary">Return Home</Link>
          </div>
        </main>
      </PageTransition>
    );
  }

  const hasActiveFilter = selectedBrand !== "All" || selectedLifeStage !== "All" || selectedTag !== "all";

  return (
    <PageTransition className="min-h-screen bg-page">
      <Navbar />
      <main className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl"
          style={{ background: "linear-gradient(135deg, #0df2f2 0%, #00a8a8 60%, #005f60 100%)" }}
        >
          <div className="flex items-center gap-6 px-8 py-10 md:py-14">
            <div className="flex-1">
              <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                Category
              </span>
              <h1 className="mt-4 text-4xl font-extrabold text-white md:text-5xl">
                {categoryEmojis[category]} {getCategoryLabel(category)}
              </h1>
              <p className="mt-3 max-w-xl text-base text-white/80">{categoryCopy[category]}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/customer/home" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-700 shadow-glow transition hover:scale-105">
                  ← Back Home
                </Link>
                <a href="#products" className="rounded-xl border-2 border-white/40 bg-white/10 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/20">
                  Browse Products
                </a>
              </div>
            </div>
            {/* Stats */}
            <div className="hidden shrink-0 grid-cols-2 gap-3 md:grid">
              {[
                ["🏷️", `${categoryProducts.length}`, "Products"],
                ["🏬", `${brands.length - 1}`, "Brands"],
              ].map(([emoji, val, label]) => (
                <div key={label} className="rounded-xl bg-white/20 p-4 text-center backdrop-blur-sm">
                  <span className="text-2xl">{emoji}</span>
                  <p className="mt-1 text-2xl font-extrabold text-white">{val}</p>
                  <p className="text-xs text-white/70">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Filters */}
        <section id="filters" className="card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-4">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Filters</p>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => { setSelectedBrand("All"); setSelectedLifeStage("All"); setSelectedTag("all"); }}
                className="btn-ghost text-xs text-red-500 hover:bg-red-50"
              >
                ✕ Reset
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {/* Brands */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Brand</p>
              <div className="flex flex-wrap gap-2">
                {brands.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedBrand(brand)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      selectedBrand === brand
                        ? "border-brand-400 bg-brand-50 text-brand-700 shadow-glow-sm"
                        : "border-gray-200 bg-white text-muted hover:border-brand-200 hover:text-ink"
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {/* Life Stages */}
            {categoryLifeStages[category]?.length ? (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Life Stage</p>
                <div className="flex flex-wrap gap-2">
                  {lifeStages.map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setSelectedLifeStage(stage)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        selectedLifeStage === stage
                          ? "border-brand-400 bg-brand-50 text-brand-700 shadow-glow-sm"
                          : "border-gray-200 bg-white text-muted hover:border-brand-200 hover:text-ink"
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Tags */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Tags</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTag("all")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    selectedTag === "all"
                      ? "border-brand-400 bg-brand-400 text-ink shadow-glow-sm"
                      : "border-gray-200 bg-white text-muted hover:border-brand-200"
                  }`}
                >
                  All
                </button>
                {productTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      selectedTag === tag
                        ? productTagStyles[tag]
                        : "border-gray-200 bg-white text-muted hover:border-brand-200"
                    }`}
                  >
                    {productTagLabels[tag]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Products */}
        <section id="products" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-extrabold text-ink">
              {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"} found
            </h2>
            <Link to={getCategoryPath(category)} className="btn-secondary text-xs px-3 py-1.5">Refresh</Link>
          </div>

          {filteredProducts.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={categoryEmojis[category]}
              title="No products match these filters"
              description="Try another brand or tag combination."
            />
          )}
        </section>
      </main>
    </PageTransition>
  );
}
