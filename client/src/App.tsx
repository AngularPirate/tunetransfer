import { StepLayout } from "@/components/layout/StepLayout";
import { useTransferStore } from "@/store/transferStore";
import { WelcomePage } from "@/pages/WelcomePage";
import { UploadPage } from "@/pages/UploadPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { ConnectPage } from "@/pages/ConnectPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";

function CurrentPage() {
  const currentStep = useTransferStore((s) => s.currentStep);

  // Handle OAuth callback — takes priority over step routing
  const params = new URLSearchParams(window.location.search);
  if (params.has("code") || params.has("error")) {
    return <AuthCallbackPage />;
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
      return <div className="text-center pt-12 text-charcoal-700/50">Transfer — coming soon</div>;
    case "results":
      return <div className="text-center pt-12 text-charcoal-700/50">Results — coming soon</div>;
  }
}

export default function App() {
  return (
    <StepLayout>
      <CurrentPage />
    </StepLayout>
  );
}
