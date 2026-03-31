import { PageTransition } from "@/components/common/PageTransition";
import { EmptyState } from "@/components/common/EmptyState";
import { Navbar } from "@/components/layout/Navbar";
import { ProductCard } from "@/components/products/ProductCard";
import { useCatalog } from "@/contexts/CatalogContext";
import { useFavorites } from "@/contexts/FavoritesContext";

export function FavoritesPage(): JSX.Element {
  const { favorites } = useFavorites();
  const { products } = useCatalog();
  const favoriteProducts = products.filter((product) => favorites.includes(product.id));

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <Navbar />
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:px-6">
        <section className="card p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Favorites</p>
          <h1 className="mt-3 font-heading text-5xl font-semibold text-ink">Products you’ve liked</h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Save products to compare later and keep your premium picks in one place.
          </p>
        </section>

        {favoriteProducts.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No favorites yet"
            description="Tap the heart icon on any product card or detail page to save it here."
          />
        )}
      </main>
    </PageTransition>
  );
}
