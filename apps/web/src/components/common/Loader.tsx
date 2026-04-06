export function Loader({ label = "Loading..." }: { label?: string }): JSX.Element {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 py-12">
      <div className="relative h-12 w-12">
        <div
          className="absolute inset-0 animate-spin rounded-full border-4 border-brand-100"
          style={{ borderTopColor: "#0df2f2" }}
        />
        <div className="absolute inset-2 flex items-center justify-center text-lg">🐾</div>
      </div>
      <p className="text-sm font-semibold text-muted">{label}</p>
    </div>
  );
}
