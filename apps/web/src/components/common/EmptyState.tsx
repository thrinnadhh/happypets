import { motion } from "framer-motion";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex flex-col items-start gap-4 rounded-[30px] border-dashed p-8"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
        !
      </div>
      <div className="space-y-2">
        <h3 className="font-heading text-2xl font-semibold text-ink">{title}</h3>
        <p className="max-w-xl text-sm leading-7 text-slate-500">{description}</p>
      </div>
      {action}
    </motion.div>
  );
}
