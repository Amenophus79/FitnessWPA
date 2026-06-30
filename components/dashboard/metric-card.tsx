import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon
}: {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
          {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
