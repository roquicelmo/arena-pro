interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
}

export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-ui border border-line bg-surface px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</span>
      <span className="font-display text-3xl font-bold leading-none tabular-nums text-ink-strong">{value}</span>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  );
}
