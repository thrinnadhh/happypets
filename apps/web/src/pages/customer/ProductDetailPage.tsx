import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageTransition } from "@/components/common/PageTransition";
import { EmptyState } from "@/components/common/EmptyState";
import { Navbar } from "@/components/layout/Navbar";
import { ProductCard } from "@/components/products/ProductCard";
import { FavoriteButton } from "@/components/products/FavoriteButton";
import { StarIcon } from "@/components/common/Icons";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalog } from "@/contexts/CatalogContext";

const isDevelopment = import.meta.env.DEV;
import { getCategoryLabel, getCategoryPath, productTagLabels, productTagStyles, sortTags } from "@/data/catalog";
import { calculateDiscountedPrice, formatInr, isProductExpired } from "@/lib/commerce";

export function ProductDetailPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProductById, getRelatedProducts } = useCatalog();
  const { addToCart, getItemQuantity } = useCart();
  const { user, token } = useAuth();
  const product = id ? getProductById(id) : undefined;
  const relatedProducts = id ? getRelatedProducts(id) : [];
  const [activeImage, setActiveImage] = useState(product?.gallery?.[0] ?? product?.image ?? "");
  const [quantity, setQuantity] = useState(1);
  const [cartNotice, setCartNotice] = useState("");
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    setActiveImage(product?.gallery?.[0] ?? product?.image ?? "");
  }, [product]);

  useEffect(() => {
    if (!cartNotice) return;
    const timer = window.setTimeout(() => setCartNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [cartNotice]);

  if (!product) {
    return (
      <PageTransition className="min-h-screen bg-page">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <EmptyState
            title="Product not found"
            description="The product you tried to open no longer exists in the current catalog."
          />
          <div className="mt-4 text-center">
            <button onClick={() => navigate("/customer/home")} className="btn-primary">
              Go Back Home
            </button>
          </div>
        </main>
      </PageTransition>
    );
  }

  const discountedPrice = calculateDiscountedPrice(product.price, product.discount);
  const gallery = product.gallery?.length ? product.gallery : [product.image];
  const rating = product.rating ?? 4.8;
  const tags = sortTags(product.tags ?? []);
  const isExpired = isProductExpired(product.expiryDate);
  const isOutOfStock = product.quantity <= 0;
  const quantityAtLimit = quantity >= Math.max(product.quantity, 1);
  const addToCartDisabled = isExpired || isOutOfStock;

  const handleAddToCart = (): void => {
    if (addToCartDisabled) {
      setCartError(isExpired ? "This product has expired." : "This product is out of stock.");
      return;
    }
    setCartError("");
    const payload = { productId: product.id, quantity, userId: user?.id ?? null, tokenPresent: Boolean(token) };
    if (isDevelopment) console.log("[cart][frontend] add-to-cart click", payload);
    void addToCart(product.id, quantity)
      .then(() => {
        if (isDevelopment) console.log("[cart][frontend] add-to-cart success", payload);
        setCartNotice(`${quantity} item${quantity > 1 ? "s" : ""} added to cart.`);
      })
      .catch((issue) => {
        if (isDevelopment) console.error("[cart][frontend] add-to-cart failure", { ...payload, issue });
        setCartError(issue instanceof Error ? issue.message : "Unable to add this product to cart.");
      });
  };

  return (
    <PageTransition className="min-h-screen bg-page">
      <Navbar />
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 md:px-6 md:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted">
          <Link to="/customer/home" className="hover:text-brand-700">Home</Link>
          <span>›</span>
          <Link to={getCategoryPath(product.category)} className="hover:text-brand-700">
            {getCategoryLabel(product.category)}
          </Link>
          <span>›</span>
          <span className="font-semibold text-ink">{product.name}</span>
        </nav>

        {/* Main product section */}
        <section className="card grid gap-6 p-5 md:p-8 lg:grid-cols-[1fr_1fr]">
          {/* Image gallery */}
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl bg-gray-50">
              <motion.img
                key={activeImage}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                src={activeImage}
                alt={product.name}
                className="h-[360px] w-full object-cover md:h-[460px]"
              />
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {gallery.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    onClick={() => setActiveImage(img)}
                    className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                      activeImage === img ? "border-brand-400 shadow-glow-sm" : "border-gray-200"
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${i + 1}`} className="h-16 w-16 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                  {getCategoryLabel(product.category)}
                </p>
                <h1 className="mt-2 text-3xl font-extrabold text-ink md:text-4xl">{product.name}</h1>
                <p className="mt-1 text-sm font-semibold text-muted">{product.brand}</p>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.lifeStage && (
                    <span className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                      {product.lifeStage}
                    </span>
                  )}
                  {product.isSample && (
                    <span className="rounded-lg bg-ink px-3 py-1 text-xs font-bold text-white">
                      Sample
                    </span>
                  )}
                  {isExpired && (
                    <span className="rounded-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                      Expired
                    </span>
                  )}
                  {tags.map((tag) => (
                    <span key={tag} className={`rounded-lg border px-3 py-1 text-xs font-bold ${productTagStyles[tag]}`}>
                      {productTagLabels[tag]}
                    </span>
                  ))}
                </div>
              </div>
              <FavoriteButton productId={product.id} />
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} className={`h-4 w-4 text-brand-400 ${i < Math.round(rating) ? "" : "opacity-20"}`} />
              ))}
              <span className="ml-1 text-sm text-muted">{rating.toFixed(1)}</span>
            </div>

            {/* Description */}
            <p className="text-sm leading-7 text-muted">{product.description}</p>

            {/* Price box */}
            <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <p className="text-3xl font-extrabold text-ink">{formatInr(discountedPrice)}</p>
                {product.discount ? (
                  <>
                    <p className="text-lg text-muted line-through">{formatInr(product.price)}</p>
                    <span className="rounded-full bg-brand-400 px-3 py-0.5 text-xs font-bold text-ink">
                      {product.discount}% off
                    </span>
                  </>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-semibold text-muted">
                {isExpired ? "⚠️ Expired" : isOutOfStock ? "⚠️ Out of stock" : `✅ ${product.quantity} in stock`}
              </p>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["⚖️", "Weight", product.weight || "—"],
                ["📦", "Pack", `${product.packetCount}`],
                ["🏭", "Mfg.", product.manufactureDate],
                ["📅", "Expiry", product.expiryDate],
              ].map(([icon, label, value]) => (
                <div key={label} className="rounded-xl border border-gray-100 bg-white p-3 text-center">
                  <p className="text-lg">{icon}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>

            {/* Add to cart */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1">
                <button
                  onClick={() => setQuantity((c) => Math.max(1, c - 1))}
                  disabled={quantity <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-ink transition hover:bg-brand-50 disabled:opacity-30"
                >
                  −
                </button>
                <span className="min-w-[40px] text-center text-sm font-bold text-ink">{quantity}</span>
                <button
                  onClick={() => setQuantity((c) => Math.min(product.quantity, c + 1))}
                  disabled={addToCartDisabled || quantityAtLimit}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-ink transition hover:bg-brand-50 disabled:opacity-30"
                >
                  +
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={addToCartDisabled}
                onClick={handleAddToCart}
                className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExpired ? "Expired" : isOutOfStock ? "Out of Stock" : "🛒 Add to Cart"}
              </motion.button>

              <span className="text-xs text-muted">In cart: {getItemQuantity(product.id)}</span>
            </div>

            {cartNotice && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{cartNotice}</p>
            )}
            {cartError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{cartError}</p>
            )}
          </div>
        </section>

        {/* Related products */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">More Like This</p>
              <h2 className="mt-1 text-xl font-extrabold text-ink">Related Products</h2>
            </div>
            <div className="flex gap-2">
              <Link to="/customer/home" className="btn-secondary text-xs px-3 py-1.5">Continue Shopping</Link>
              <Link to={getCategoryPath(product.category)} className="btn-secondary text-xs px-3 py-1.5">
                View All {getCategoryLabel(product.category)}
              </Link>
            </div>
          </div>

          <div className="flex snap-x gap-4 overflow-x-auto pb-2">
            {relatedProducts.map((rp) => (
              <div key={rp.id} className="min-w-[260px] max-w-[260px] snap-start">
                <ProductCard product={rp} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
