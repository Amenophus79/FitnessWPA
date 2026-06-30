import type { TrendPoint } from "@/types/domain";

export function TrendChart({ points, label }: { points: TrendPoint[]; label: string }) {
  if (points.length < 2) {
    return <div className="flex h-32 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">No {label} trend yet</div>;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - ((point.value - min) / spread) * 100;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`${label} trend`} className="h-32 w-full overflow-visible">
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      {points.map((point, index) => {
        const x = (index / (points.length - 1)) * 100;
        const y = 100 - ((point.value - min) / spread) * 100;
        return <circle key={`${point.date}-${point.value}`} cx={x} cy={y} r="2.6" fill="hsl(var(--accent))" />;
      })}
    </svg>
  );
}
