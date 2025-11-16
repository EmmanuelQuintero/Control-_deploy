import { SleepChart } from "../sleep-chart";

export default function SleepChartExample() {
  const sleepData = [
    { day: "Mon", hours: 7.5, quality: "Good" as const },
    { day: "Tue", hours: 6.2, quality: "Fair" as const },
    { day: "Wed", hours: 8.1, quality: "Excellent" as const },
    { day: "Thu", hours: 7.8, quality: "Good" as const },
    { day: "Fri", hours: 5.5, quality: "Poor" as const },
    { day: "Sat", hours: 9.2, quality: "Excellent" as const },
    { day: "Sun", hours: 8.5, quality: "Good" as const },
  ];

  return (
    <SleepChart
      data={sleepData}
      weekOffset={0}
      onWeekChange={() => {}}
      dateRange="Esta semana"
    />
  );
}
