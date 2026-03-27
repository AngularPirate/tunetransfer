import type { WizardStep } from "@tunetransfer/shared";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "review", label: "Review" },
  { key: "connect", label: "Connect" },
  { key: "transfer", label: "Transfer" },
  { key: "results", label: "Results" },
];

const STEP_ORDER: WizardStep[] = STEPS.map((s) => s.key);

interface StepIndicatorProps {
  currentStep: WizardStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  if (currentStep === "welcome") return null;

  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <nav className="w-full max-w-2xl mx-auto px-8 mb-10">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <li key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    transition-all duration-300
                    ${
                      isCompleted
                        ? "bg-sage-500 text-white"
                        : isCurrent
                          ? "bg-sage-500/15 text-sage-600 ring-2 ring-sage-500"
                          : "bg-charcoal-800/5 text-charcoal-700/40"
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`
                    text-xs font-medium transition-colors duration-300
                    ${isCurrent ? "text-sage-600" : "text-charcoal-700/40"}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div
                  className={`
                    flex-1 h-px mx-3 mb-5 transition-colors duration-300
                    ${isCompleted ? "bg-sage-500" : "bg-charcoal-800/10"}
                  `}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
