import { motion } from "framer-motion";
import { HeartIcon } from "@/components/common/Icons";
import { useFavorites } from "@/contexts/FavoritesContext";

export function FavoriteButton({
  productId,
  className = "",
}: {
  productId: string;
  className?: string;
}): JSX.Element {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(productId);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(productId);
      }}
      className={`inline-flex items-center justify-center rounded-full border px-3 py-3 transition ${
        active
          ? "border-brand-400 bg-brand-100 text-brand-700 shadow-[0_12px_24px_rgba(212,175,55,0.12)]"
          : "border-stone-200 bg-white/90 text-slate-500 hover:border-brand-300 hover:text-brand-700"
      } ${className}`}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
    >
      <HeartIcon filled={active} />
    </motion.button>
  );
}
