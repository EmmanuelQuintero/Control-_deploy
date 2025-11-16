import { Activity } from "lucide-react";
import { StatCard } from "../stat-card";

export default function StatCardExample() {
  return (
    <StatCard
      title="Daily Steps"
      value="8,543"
      icon={Activity}
      subtitle="Goal: 10,000"
      trend="up"
      trendValue="12% from yesterday"
      color="success"
    />
  );
}
