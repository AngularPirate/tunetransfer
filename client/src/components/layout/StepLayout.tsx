import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-3xl"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
