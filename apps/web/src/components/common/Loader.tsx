export function Loader({ label = "Loading dashboard..." }: { label?: string }): JSX.Element {
  return (
    <div className="space-y-5 rounded-[30px] border border-white/40 bg-white/60 p-6 shadow-card backdrop-blur-sm">
      <div className="skeleton h-14 w-full rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="skeleton h-32 rounded-3xl" />
        <div className="skeleton h-32 rounded-3xl" />
        <div className="skeleton h-32 rounded-3xl" />
      </div>
      <div className="skeleton h-64 rounded-[28px]" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
