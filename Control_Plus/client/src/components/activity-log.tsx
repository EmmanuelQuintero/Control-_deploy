import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface Activity {
  id: string;
  type: string;
  description: string;
  time: string;
  icon: LucideIcon;
  color?: "primary" | "success" | "nutrition" | "sleep";
}

interface ActivityLogProps {
  activities: Activity[];
  title?: string;
}

export function ActivityLog({ activities, title = "Recent Activity" }: ActivityLogProps) {
  const colorClasses = {
    primary: "bg-primary text-primary-foreground",
    success: "bg-chart-1 text-white",
    nutrition: "bg-chart-3 text-white",
    sleep: "bg-chart-4 text-white",
  };

  return (
    <Card data-testid="card-activity-log">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => {
          const Icon = activity.icon;
          const colorClass = activity.color ? colorClasses[activity.color] : colorClasses.primary;
          
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3"
              data-testid={`activity-${activity.id}`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">{activity.type}</p>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {activity.time}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
