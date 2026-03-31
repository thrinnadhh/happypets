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
import { useCatalog } from "@/contexts/CatalogContext";

export function ProductDetailPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProductById, getRelatedProducts } = useCatalog();
  const { addToCart, getItemQuantity } = useCart();
  const product = id ? getProductById(id) : undefined;
  const relatedProducts = id ? getRelatedProducts(id) : [];
  const [activeImage, setActiveImage] = useState(product?.gallery?.[0] ?? product?.image ?? "");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setActiveImage(product?.gallery?.[0] ?? product?.image ?? "");
  }, [product]);

  if (!product) {
    return (
      <PageTransition className="min-h-screen bg-soft-grid">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <EmptyState
            title="Product not found"
            description="The product you tried to open no longer exists in the current catalog."
            action={
              <button onClick={() => navigate("/customer/home")} className="primary-button">
                Go back home
              </button>
            }
          />
        </main>
      </PageTransition>
    );
  }

  const discountedPrice = product.discount
    ? product.price - (product.price * product.discount) / 100
    : product.price;
  const gallery = product.gallery?.length ? product.gallery : [product.image];
  const rating = product.rating ?? 4.8;

  return (
    <PageTransition className="min-h-screen bg-soft-grid">
      <Navbar />
      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-8 md:px-6 md:py-10">
        <section className="card grid gap-8 p-6 md:p-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[32px] bg-[#f8f2e8]">
              <motion.img
                key={activeImage}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                src={activeImage}
                alt={product.name}
                className="h-[420px] w-full object-cover md:h-[520px]"
              />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  onClick={() => setActiveImage(image)}
                  className={`overflow-hidden rounded-[22px] border bg-white ${
                    activeImage === image ? "border-brand-400 shadow-[0_12px_24px_rgba(212,175,55,0.15)]" : "border-[#e8dfd1]"
                  }`}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className="h-20 w-20 object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">{product.category}</p>
                <h1 className="mt-3 font-heading text-5xl font-semibold leading-none text-ink">{product.name}</h1>
                <p className="mt-3 text-sm uppercase tracking-[0.16em] text-slate-500">{product.brand}</p>
              </div>
              <FavoriteButton productId={product.id} />
            </div>

            <div className="flex items-center gap-1 text-brand-400">
              {Array.from({ length: 5 }).map((_, index) => (
                <StarIcon key={index} className={`h-5 w-5 ${index < Math.round(rating) ? "" : "opacity-20"}`} />
              ))}
              <span className="ml-2 text-sm font-medium text-slate-500">{rating.toFixed(1)} rating</span>
            </div>

            <p className="text-base leading-8 text-slate-600">{product.description}</p>

            <div className="rounded-[26px] border border-[#ebe0ca] bg-[#fcf9f3] p-5">
              <div className="flex flex-wrap items-end gap-3">
                <p className="text-4xl font-semibold text-ink">${discountedPrice.toFixed(2)}</p>
                {product.discount ? (
                  <>
                    <p className="text-lg text-slate-400 line-through">${product.price.toFixed(2)}</p>
                    <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                      {product.discount}% off
                    </span>
                  </>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Fresh inventory details, clear pricing, and category-matched recommendations keep the purchase flow simple.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="subtle-panel p-4">
                <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Manufacture Date</p>
                <p className="mt-2 text-base font-semibold text-ink">{product.manufactureDate}</p>
              </div>
              <div className="subtle-panel p-4">
                <p className="text-sm uppercase tracking-[0.16em] text-slate-500">Expiry Date</p>
                <p className="mt-2 text-base font-semibold text-ink">{product.expiryDate}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center rounded-full border border-[#e8dfd1] bg-white p-1 shadow-soft">
                <button
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-ink transition hover:bg-slate-100"
                >
                  -
                </button>
                <span className="min-w-[48px] text-center text-base font-semibold text-ink">{quantity}</span>
                <button
                  onClick={() => setQuantity((current) => current + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-ink transition hover:bg-slate-100"
                >
                  +
                </button>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addToCart(product.id, quantity)}
                className="primary-button bg-[#2F4F6F] px-7 py-3 text-white"
                style={{ backgroundImage: "none" }}
              >
                Add to Cart
              </motion.button>
              <span className="text-sm text-slate-500">
                In cart: {getItemQuantity(product.id)}
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Related Products</p>
              <h2 className="mt-2 font-heading text-4xl font-semibold text-ink">More from the same category</h2>
            </div>
            <Link to="/customer/home" className="soft-button">
              Continue Shopping
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex snap-x gap-5 overflow-x-auto pb-2"
          >
            {relatedProducts.map((relatedProduct) => (
              <div key={relatedProduct.id} className="min-w-[320px] max-w-[320px] snap-start">
                <ProductCard product={relatedProduct} />
              </div>
            ))}
          </motion.div>
        </section>
      </main>
    </PageTransition>
  );
}
