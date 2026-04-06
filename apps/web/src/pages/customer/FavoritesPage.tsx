import { PageTransition } from "@/components/common/PageTransition";
import { EmptyState } from "@/components/common/EmptyState";
import { Navbar } from "@/components/layout/Navbar";
import { ProductCard } from "@/components/products/ProductCard";
import { useCatalog } from "@/contexts/CatalogContext";
import { useFavorites } from "@/contexts/FavoritesContext";

export function FavoritesPage(): JSX.Element {
  const { favorites } = useFavorites();
  const { products } = useCatalog();
  const favoriteProducts = products.filter((p) => favorites.includes(p.id));

  return (
    <PageTransition className="min-h-screen bg-page">
      <Navbar />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <section className="card p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Saved</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink">My Favourites ❤️</h1>
          <p className="mt-1 text-sm text-muted">
            Products you've loved — {favoriteProducts.length} item{favoriteProducts.length !== 1 ? "s" : ""} saved.
          </p>
        </section>

        {favoriteProducts.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="❤️"
            title="No favourites yet"
            description="Tap the heart icon on any product to save it here for later."
          />
        )}
      </main>
    </PageTransition>
  );
}
