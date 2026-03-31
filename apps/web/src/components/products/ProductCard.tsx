import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FavoriteButton } from "@/components/products/FavoriteButton";
import { StarIcon } from "@/components/common/Icons";
import { productTagLabels, productTagStyles, sortTags } from "@/data/catalog";
import { calculateDiscountedPrice, formatInr } from "@/lib/commerce";
import { Product } from "@/types";

export function ProductCard({ product }: { product: Product }): JSX.Element {
  const discountedPrice = calculateDiscountedPrice(product.price, product.discount);
  const rating = product.rating ?? 4.8;
  const tags = sortTags(product.tags ?? []);
  const isRecommended = tags.includes("recommended");

  return (
    <motion.article
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`group relative overflow-hidden rounded-[30px] border bg-white shadow-[0_18px_44px_rgba(78,58,31,0.1)] ${
        isRecommended ? "border-[#e9c86e] shadow-[0_22px_54px_rgba(212,175,55,0.18)]" : "border-white/70"
      }`}
    >
      <FavoriteButton productId={product.id} className="absolute right-4 top-4 z-10" />
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative overflow-hidden bg-[#f8f2e7]">
          <img
            src={product.image}
            alt={product.name}
            className="h-60 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#102232]/18 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
          {product.discount ? (
            <span className="absolute left-4 top-4 rounded-full bg-[#D4AF37] px-3 py-1 text-xs font-semibold text-[#17324a]">
              {product.discount}% OFF
            </span>
          ) : null}
          {product.isSample ? (
            <span className="absolute left-4 top-16 rounded-full bg-[#17324a] px-3 py-1 text-xs font-semibold text-white">
              Sample
            </span>
          ) : null}
          {tags.length ? (
            <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${productTagStyles[tag]}`}
                >
                  {productTagLabels[tag]}
                </span>
              ))}
            </div>
          ) : null}
          <div className="absolute inset-x-4 bottom-14 translate-y-4 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#17324a] shadow-soft">
              Quick View
            </span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{product.brand}</p>
            <span className="rounded-full bg-[#f6efe3] px-3 py-1 text-xs font-medium text-slate-600">
              {product.category}
            </span>
          </div>

          <div>
            <h3 className="font-heading text-[1.65rem] font-semibold leading-tight text-ink">{product.name}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">{product.description}</p>
          </div>

          <div className="flex items-center gap-1 text-brand-400">
            {Array.from({ length: 5 }).map((_, index) => (
              <StarIcon key={index} className={`h-4 w-4 ${index < Math.round(rating) ? "" : "opacity-20"}`} />
            ))}
            <span className="ml-2 text-xs font-medium text-slate-500">{rating.toFixed(1)}</span>
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-[#efe3d1] pt-4">
            <div>
              <p className="text-2xl font-semibold text-ink">{formatInr(discountedPrice)}</p>
              {product.discount ? (
                <p className="text-sm text-slate-400 line-through">{formatInr(product.price)}</p>
              ) : (
                <p className="text-sm text-slate-400">
                  {product.weight} • {product.packetCount} pack
                </p>
              )}
            </div>
            <span className="rounded-full bg-[#17324a] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">
              View
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
