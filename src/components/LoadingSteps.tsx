import GameLoader from "@/components/GameLoader";

interface LoadingStepsProps {
  steps: string[];
  currentStep: number;
  type?: "channel" | "competitor" | "ai" | "default";
}

export default function LoadingSteps({ steps, currentStep, type = "ai" }: LoadingStepsProps) {
  const progress = steps.length > 0 ? Math.round(((currentStep + 1) / steps.length) * 100) : 0;
  const message = steps[currentStep] || steps[steps.length - 1];

  return <GameLoader progress={Math.min(progress, 100)} type={type} message={message} />;
}
