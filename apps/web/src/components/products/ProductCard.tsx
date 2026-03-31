import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Product } from "@/types";
import { FavoriteButton } from "@/components/products/FavoriteButton";
import { StarIcon } from "@/components/common/Icons";

export function ProductCard({ product }: { product: Product }): JSX.Element {
  const discountedPrice = product.discount
    ? product.price - (product.price * product.discount) / 100
    : product.price;
  const rating = product.rating ?? 4.8;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="card overflow-hidden"
    >
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative">
          <img src={product.image} alt={product.name} className="h-60 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1a1a1a]/10 to-transparent" />
          <FavoriteButton productId={product.id} className="absolute right-4 top-4" />
        </div>
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tag">{product.category}</span>
            <span className="rounded-full bg-[#f7f1e6] px-3 py-1 text-xs font-medium text-slate-600">
              {product.brand}
            </span>
          </div>
          <div>
            <h3 className="font-heading text-[1.7rem] font-semibold leading-none text-ink">{product.name}</h3>
            <div className="mt-3 flex items-center gap-1 text-brand-400">
              {Array.from({ length: 5 }).map((_, index) => (
                <StarIcon key={index} className={`h-4 w-4 ${index < Math.round(rating) ? "" : "opacity-25"}`} />
              ))}
              <span className="ml-2 text-xs font-medium text-slate-500">{rating.toFixed(1)}</span>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-500">{product.description}</p>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[#eee4d3] pt-4">
            <div>
              <p className="text-lg font-semibold text-ink">${discountedPrice.toFixed(2)}</p>
              {product.discount ? (
                <p className="text-sm text-slate-400 line-through">${product.price.toFixed(2)}</p>
              ) : null}
            </div>
            {product.discount ? (
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                {product.discount}% OFF
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
