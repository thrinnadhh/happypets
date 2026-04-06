import { motion } from "framer-motion";

export function FloatingActionButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}): JSX.Element {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full text-3xl text-white shadow-glow"
      style={{ backgroundImage: "linear-gradient(135deg, #2F4F6F 0%, #3B628A 100%)" }}
      aria-label={label}
    >
      +
    </motion.button>
  );
}
