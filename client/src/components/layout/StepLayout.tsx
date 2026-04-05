import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { StepIndicator } from "./StepIndicator";
import { useTransferStore } from "@/store/transferStore";

interface StepLayoutProps {
  children: ReactNode;
}

export function StepLayout({ children }: StepLayoutProps) {
  const currentStep = useTransferStore((s) => s.currentStep);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <StepIndicator currentStep={currentStep} />
      <main className="flex-1 flex flex-col items-center px-8 pb-12">
        <div className="w-full max-w-3xl">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
