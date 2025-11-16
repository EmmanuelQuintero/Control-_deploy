import { Activity, Apple, Moon } from "lucide-react";
import { ActivityLog } from "../activity-log";

export default function ActivityLogExample() {
  const activities = [
    {
      id: "1",
      type: "Morning Run",
      description: "5.2 km in 32 minutes",
      time: "8:30 AM",
      icon: Activity,
      color: "success" as const,
    },
    {
      id: "2",
      type: "Breakfast",
      description: "Oatmeal with berries - 350 cal",
      time: "9:15 AM",
      icon: Apple,
      color: "nutrition" as const,
    },
    {
      id: "3",
      type: "Sleep",
      description: "7.5 hours - Good quality",
      time: "Last night",
      icon: Moon,
      color: "sleep" as const,
    },
  ];

  return <ActivityLog activities={activities} />;
}
