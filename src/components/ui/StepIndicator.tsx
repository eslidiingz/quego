import { cn } from "@/lib/cn";

export type Step = { label: string };

export type StepIndicatorProps = {
  steps: Step[];
  currentStep: number;
  className?: string;
};

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  const total = steps.length;
  const progressPct = total > 1 ? ((currentStep - 1) / (total - 1)) * 100 : 0;
  return (
    <div className={cn("relative w-full", className)}>
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-outline-variant -z-10" />
      <div
        className="absolute top-5 left-0 h-0.5 bg-progress-gradient -z-10 transition-all duration-500"
        style={{ width: `${progressPct}%` }}
      />
      <ol className="flex justify-between items-start">
        {steps.map((step, i) => {
          const num = i + 1;
          const isActive = num === currentStep;
          const isDone = num < currentStep;
          return (
            <li key={step.label} className="flex flex-col items-center gap-2 min-w-[64px]">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
                  isActive && "bg-primary text-on-primary shadow-md",
                  isDone && "bg-primary text-on-primary",
                  !isActive && !isDone && "bg-surface-container-high text-on-surface-variant",
                )}
              >
                {num}
              </div>
              <span
                className={cn(
                  "text-label-md text-center",
                  isActive ? "text-primary font-semibold" : "text-on-surface-variant",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
