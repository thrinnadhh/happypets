import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FavoriteButton } from "@/components/products/FavoriteButton";
import { StarIcon } from "@/components/common/Icons";
import { productTagLabels, productTagStyles, sortTags } from "@/data/catalog";
import { calculateDiscountedPrice, formatInr, isProductExpired } from "@/lib/commerce";
import { Product } from "@/types";

export function ProductCard({ product }: { product: Product }): JSX.Element {
  const discountedPrice = calculateDiscountedPrice(product.price, product.discount);
  const rating = product.rating ?? 4.8;
  const tags = sortTags(product.tags ?? []);
  const isRecommended = tags.includes("recommended");
  const expired = isProductExpired(product.expiryDate);

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`group relative overflow-hidden rounded-[24px] border bg-white shadow-[0_18px_44px_rgba(78,58,31,0.1)] md:rounded-[30px] ${
        isRecommended ? "border-[#e9c86e] shadow-[0_22px_54px_rgba(212,175,55,0.18)]" : "border-white/70"
      }`}
    >
      <FavoriteButton productId={product.id} className="absolute right-3 top-3 z-10 md:right-4 md:top-4" />
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative overflow-hidden bg-[#f8f2e7]">
          <img
            src={product.image}
            alt={product.name}
            className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.04] sm:h-48 md:h-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#102232]/18 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
          {product.discount ? (
            <span className="absolute left-3 top-3 rounded-full bg-[#D4AF37] px-2.5 py-1 text-[10px] font-semibold text-[#17324a] md:left-4 md:top-4 md:px-3 md:text-xs">
              {product.discount}% OFF
            </span>
          ) : null}
          {product.isSample ? (
            <span className="absolute left-3 top-12 rounded-full bg-[#17324a] px-2.5 py-1 text-[10px] font-semibold text-white md:left-4 md:top-16 md:px-3 md:text-xs">
              Sample
            </span>
          ) : null}
          {expired ? (
            <span className="absolute left-3 top-[5.25rem] rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-semibold text-rose-700 md:left-4 md:top-28 md:px-3 md:text-xs">
              Expired
            </span>
          ) : null}
          {tags.length ? (
            <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-1.5 md:inset-x-4 md:bottom-4 md:gap-2">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] md:px-3 md:text-[11px] md:tracking-[0.16em] ${productTagStyles[tag]}`}
                >
                  {productTagLabels[tag]}
                </span>
              ))}
            </div>
          ) : null}
          <div className="absolute inset-x-3 bottom-11 translate-y-4 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:inset-x-4 md:bottom-14">
            <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#17324a] shadow-soft md:px-4 md:py-2 md:text-sm">
              Quick View
            </span>
          </div>
        </div>

        <div className="space-y-3 p-3.5 sm:p-4 md:space-y-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:text-xs md:tracking-[0.18em]">{product.brand}</p>
            <div className="flex flex-wrap items-center justify-end gap-1.5 md:gap-2">
              {product.lifeStage ? (
                <span className="rounded-full bg-[#eef4fb] px-2.5 py-1 text-[10px] font-medium text-[#2f4f6f] md:px-3 md:text-xs">
                  {product.lifeStage}
                </span>
              ) : null}
              <span className="rounded-full bg-[#f6efe3] px-2.5 py-1 text-[10px] font-medium text-slate-600 md:px-3 md:text-xs">
                {product.category}
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-heading text-xl font-semibold leading-tight text-ink sm:text-2xl md:text-[1.65rem]">{product.name}</h3>
            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6 md:mt-2 md:leading-7">{product.description}</p>
          </div>

          <div className="flex items-center gap-1 text-brand-400">
            {Array.from({ length: 5 }).map((_, index) => (
              <StarIcon key={index} className={`h-3.5 w-3.5 md:h-4 md:w-4 ${index < Math.round(rating) ? "" : "opacity-20"}`} />
            ))}
            <span className="ml-1.5 text-[11px] font-medium text-slate-500 md:ml-2 md:text-xs">{rating.toFixed(1)}</span>
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-[#efe3d1] pt-3 md:gap-4 md:pt-4">
            <div>
              <p className="text-xl font-semibold text-ink md:text-2xl">{formatInr(discountedPrice)}</p>
              {product.discount ? (
                <p className="text-xs text-slate-400 line-through md:text-sm">{formatInr(product.price)}</p>
              ) : (
                <p className="text-xs text-slate-400 md:text-sm">
                  {product.weight} • {product.packetCount} pack
                </p>
              )}
            </div>
            <span className="rounded-full bg-[#17324a] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white md:px-4 md:text-xs md:tracking-[0.14em]">
              View
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
