import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SleepData {
  day: string;
  hours: number;
  quality: "Poor" | "Fair" | "Good" | "Excellent";
}

interface SleepChartProps {
  data: SleepData[];
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  dateRange: string;
}

export function SleepChart({ data, weekOffset, onWeekChange, dateRange }: SleepChartProps) {
  const maxHours = 10;
  
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "Excellent":
        return "bg-chart-1";
      case "Good":
        return "bg-chart-2";
      case "Fair":
        return "bg-chart-3";
      case "Poor":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const getQualityLabel = (quality: string, hours: number) => {
    if (hours === 0) return "Sin registro";
    switch (quality) {
      case "Excellent":
        return "Excelente";
      case "Good":
        return "Buena";
      case "Fair":
        return "Regular";
      case "Poor":
        return "Mala";
      default:
        return "Sin registro";
    }
  };

  return (
    <Card data-testid="card-sleep-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Patrón de Sueño</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onWeekChange(weekOffset - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[180px] text-center">
              {dateRange}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onWeekChange(weekOffset + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.day}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{item.hours}h</span>
                  <Badge variant="secondary" className="text-xs">
                    {getQualityLabel(item.quality, item.hours)}
                  </Badge>
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getQualityColor(item.quality)}`}
                  style={{ width: `${(item.hours / maxHours) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
