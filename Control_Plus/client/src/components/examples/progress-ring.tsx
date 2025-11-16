import { ProgressRing } from "../progress-ring";

export default function ProgressRingExample() {
  return (
    <ProgressRing progress={68} size={120}>
      <div className="text-center">
        <div className="text-2xl font-bold">68%</div>
        <div className="text-xs text-muted-foreground">Complete</div>
      </div>
    </ProgressRing>
  );
}
