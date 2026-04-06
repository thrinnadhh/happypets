type Column<T> = {
  key: keyof T | string;
  title: string;
  render: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
}: {
  columns: Column<T>[];
  rows: T[];
}): JSX.Element {
  return (
    <div className="overflow-hidden rounded-[30px] border border-white/50 bg-white/90 shadow-card backdrop-blur-sm">
      <div className="hidden grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4 border-b border-[#ebe0ca] bg-[#faf5ea] px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 md:grid">
        {columns.map((column) => (
          <span key={column.title}>{column.title}</span>
        ))}
      </div>

      <div className="divide-y divide-[#efe5d6]">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 px-5 py-4 text-sm text-slate-600 transition hover:bg-[#fcf8f1] md:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]"
          >
            {columns.map((column) => (
              <div key={column.title}>{column.render(row)}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
