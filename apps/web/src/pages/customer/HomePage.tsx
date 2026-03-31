import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/common/PageTransition";
import { Loader } from "@/components/common/Loader";
import { Navbar } from "@/components/layout/Navbar";
import { ProductCard } from "@/components/products/ProductCard";
import { useCatalog } from "@/contexts/CatalogContext";
import { ProductCategory } from "@/types";

const categories: ProductCategory[] = ["Dog", "Cat", "Fish"];

export function CustomerHomePage(): JSX.Element {
  const { products, loading } = useCatalog();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("Dog");

  const visibleProducts = products.filter((product) => product.category === activeCategory);
  const featuredProduct = visibleProducts[0];
  const featuredRating = featuredProduct?.rating ?? 4.8;

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <Navbar />
      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 md:px-6 md:py-10">
        <section className="card grid gap-8 overflow-hidden p-6 md:grid-cols-[0.95fr_1.05fr] md:p-8 lg:p-10">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <span className="tag">Customer Home</span>
              <h1 className="mt-5 max-w-xl font-heading text-5xl font-semibold tracking-[-0.04em] text-ink md:text-6xl">
                Thoughtful pet care, presented with calm and clarity.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
                Browse premium food and essentials by category, save the products you love, and move naturally from discovery to purchase.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={
                    activeCategory === category ? "primary-button" : "soft-button"
                  }
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Products available", `${products.length}`],
                ["Current category", activeCategory],
                ["Discounted picks", `${products.filter((product) => product.discount).length}`],
              ].map(([label, value]) => (
                <motion.div key={label} whileHover={{ y: -5 }} className="stat-panel">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
                  <strong className="mt-3 block text-2xl font-semibold text-ink">{value}</strong>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div whileHover={{ y: -4 }} className="subtle-panel overflow-hidden p-3">
            {featuredProduct ? (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="overflow-hidden rounded-[28px] bg-[#f7f1e6]">
                  <img
                    src={featuredProduct.image}
                    alt={featuredProduct.name}
                    className="h-[360px] w-full object-cover md:h-[460px]"
                  />
                </div>
                <div className="flex flex-col justify-between gap-6 rounded-[28px] bg-white/80 p-6">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-brand-700">{featuredProduct.brand}</p>
                    <h2 className="mt-3 font-heading text-4xl font-semibold text-ink">
                      {featuredProduct.name}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      {featuredProduct.description}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-t border-[#ebe0ca] pt-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Starting at</p>
                        <p className="mt-1 text-3xl font-semibold text-ink">${featuredProduct.price.toFixed(2)}</p>
                      </div>
                      <p className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                        {featuredRating.toFixed(1)} rating
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate(`/product/${featuredProduct.id}`)}
                        className="primary-button"
                      >
                        View Product
                      </button>
                      <button
                        onClick={() => setActiveCategory(featuredProduct.category)}
                        className="soft-button"
                      >
                        Browse {activeCategory}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">{activeCategory} products</p>
              <h2 className="mt-2 font-heading text-4xl font-semibold text-ink">Popular picks in this category</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Every product card links into the full product experience with gallery, pricing, favorites, and related recommendations.
              </p>
            </div>
          </div>

          {loading ? (
            <Loader label="Loading products..." />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
