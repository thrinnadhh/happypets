export function EmptyState({
  icon = "🐾",
  title = "Nothing here yet",
  description,
}: {
  icon?: string;
  title?: string;
  description?: string;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-brand-200 bg-brand-50/30 px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-card">
        {icon}
      </div>
      <div>
        <p className="text-base font-bold text-ink">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
    </div>
  );
}
