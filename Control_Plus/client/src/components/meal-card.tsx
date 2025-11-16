import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MealCardProps {
  type: string;
  time: string;
  calories: number;
  items: string[];
}

export function MealCard({ type, time, calories, items }: MealCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-meal-${type.toLowerCase()}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold">{type}</h4>
              <Badge variant="secondary" className="text-xs">{time}</Badge>
            </div>
            <ul className="space-y-1">
              {items.map((item, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-chart-3">{calories}</div>
            <div className="text-xs text-muted-foreground">calories</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
