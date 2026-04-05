import { useState } from "react";
import { StepLayout } from "@/components/layout/StepLayout";
import { useTransferStore, useHasHydrated } from "@/store/transferStore";
import { useSyncBrowserHistory } from "@/hooks/useSyncBrowserHistory";
import { WelcomePage } from "@/pages/WelcomePage";
import { UploadPage } from "@/pages/UploadPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { ConnectPage } from "@/pages/ConnectPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { TransferPage } from "@/pages/TransferPage";
import { ResultsPage } from "@/pages/ResultsPage";

function CurrentPage() {
  const currentStep = useTransferStore((s) => s.currentStep);

  // Capture OAuth callback on initial mount. This flag keeps AuthCallbackPage
  // mounted even after URL params are cleaned, so error UI stays visible.
  // AuthCallbackPage calls onDone() when the user navigates away.
  const [isCallback, setIsCallback] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has("code") || params.has("error");
  });

  if (isCallback) {
    return <AuthCallbackPage onDone={() => setIsCallback(false)} />;
  }

  switch (currentStep) {
    case "welcome":
      return <WelcomePage />;
    case "upload":
      return <UploadPage />;
    case "review":
      return <LibraryPage />;
    case "connect":
      return <ConnectPage />;
    case "transfer":
      return <TransferPage />;
    case "results":
      return <ResultsPage />;
  }
}

export default function App() {
  const hasHydrated = useHasHydrated();
  useSyncBrowserHistory();

  // Render layout immediately but keep invisible until sessionStorage hydrates.
  // Using opacity instead of `return null` prevents a layout shift flash.
  return (
    <div
      style={{
        opacity: hasHydrated ? 1 : 0,
        transition: "opacity 0.15s ease-out",
      }}
    >
      <StepLayout>
        <CurrentPage />
      </StepLayout>
    </div>
  );
}
