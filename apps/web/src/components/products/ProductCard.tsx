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

  return (
    <Link to={`/product/${product.id}`} className="group">
      <motion.div
        whileHover={{ y: -4 }}
        className="flex flex-col overflow-hidden rounded-[16px] border-2 border-pet-teal bg-white transition"
      >
        {/* Image container with green gradient background */}
        <div className="relative aspect-square overflow-hidden rounded-t-[14px] bg-gradient-to-br from-pet-green to-[#1f4038]">
          <motion.img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          />
          {/* Favorite button */}
          <div className="absolute right-2 top-2 z-10">
            <FavoriteButton productId={product.id} />
          </div>

          {/* Discount badge */}
          {product.discount ? (
            <div className="absolute left-2 top-2 rounded-full bg-pet-yellow px-2 py-1 text-[10px] font-bold text-ink">
              {product.discount}% OFF
            </div>
          ) : null}
        </div>

        {/* Info section - flex grow */}
        <div className="flex flex-col gap-2 p-3 flex-grow">
          {/* Brand name */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {product.brand}
            </p>
            {/* Product name */}
            <h3 className="font-heading text-base font-bold text-ink line-clamp-2">
              {product.name}
            </h3>
          </div>

          {/* Tags */}
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 1).map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${productTagStyles[tag]}`}
                >
                  {productTagLabels[tag]}
                </span>
              ))}
            </div>
          ) : null}

          {/* Rating */}
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <StarIcon
                  key={index}
                  className={`h-3 w-3 ${
                    index < Math.round(rating) ? "text-yellow-400" : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-slate-600">{rating.toFixed(1)}</span>
          </div>

          {/* Price in orange - flex grow to push button to bottom */}
          <div className="flex-1">
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-lg font-bold text-pet-orange">
                ${discountedPrice.toFixed(2)}
              </span>
              {product.discount ? (
                <span className="text-xs text-slate-400 line-through">
                  ${product.price.toFixed(2)}
                </span>
              ) : null}
            </div>
          </div>

          {/* Full-width teal add to cart button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              // Will be called through parent link
            }}
            className="teal-button w-full py-2 text-sm font-semibold"
          >
            🛒 Add to Cart
          </button>
        </div>
      </motion.div>
    </Link>
  );
}
