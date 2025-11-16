import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  subtitle?: string;
  trend?: "up" | "down";
  trendValue?: string;
  color?: "primary" | "success" | "nutrition" | "sleep";
}

export function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  trendValue,
  color = "primary",
}: StatCardProps) {
  const colorClasses = {
    primary: "text-primary",
    success: "text-chart-1",
    nutrition: "text-chart-3",
    sleep: "text-chart-4",
  };

  return (
    <Card data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <Icon className={`h-5 w-5 ${colorClasses[color]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold" data-testid={`text-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && trendValue && (
          <p className={`text-xs mt-2 ${trend === "up" ? "text-chart-1" : "text-destructive"}`}>
            {trend === "up" ? "↑" : "↓"} {trendValue}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
