import { useEffect } from "react";
import { useTransferStore } from "@/store/transferStore";
import { getPathForStep, getStepFromPath } from "@/lib/stepRoutes";
import type { WizardStep } from "@tunetransfer/shared";

const STEP_ORDER: WizardStep[] = [
  "welcome",
  "upload",
  "review",
  "connect",
  "transfer",
  "results",
];

/** Check whether a step is reachable given current store state. */
function getFurthestAccessibleStep(): WizardStep {
  const s = useTransferStore.getState();
  // Walk forward through steps; stop at the first inaccessible one.
  for (const step of STEP_ORDER) {
    switch (step) {
      case "welcome":
      case "upload":
        continue; // always accessible
      case "review":
        if (s.playlists.length === 0) return "upload";
        continue;
      case "connect":
        if (s.selectedPlaylistIds.size === 0) return "review";
        continue;
      case "transfer":
        if (!s.spotifyAccessToken) return "connect";
        continue;
      case "results":
        if (!s.transferSummary) return "transfer";
        continue;
    }
  }
  return "results";
}

function isStepAccessible(step: WizardStep): boolean {
  const idx = STEP_ORDER.indexOf(step);
  const furthest = STEP_ORDER.indexOf(getFurthestAccessibleStep());
  return idx <= furthest;
}

/**
 * Syncs browser history with Zustand's currentStep.
 *
 * - On mount: aligns the URL to match the hydrated step (replaceState, no re-render).
 * - On popstate (back/forward): updates Zustand directly (no pushState loop).
 *
 * Must be called AFTER hydration gate in App so Zustand state is ready.
 */
export function useSyncBrowserHistory() {
  useEffect(() => {
    // ── Mount: sync URL to hydrated step ──
    // Skip if OAuth callback is in progress (AuthCallbackPage handles that).
    if (!window.location.search.includes("code=")) {
      const currentStep = useTransferStore.getState().currentStep;
      const expectedPath = getPathForStep(currentStep);
      if (window.location.pathname !== expectedPath) {
        window.history.replaceState({ step: currentStep }, "", expectedPath);
      }
    }

    // ── popstate: handle back/forward button ──
    const onPopState = (event: PopStateEvent) => {
      const step =
        (event.state?.step as WizardStep) ??
        getStepFromPath(window.location.pathname);

      if (!step) {
        // Unknown path — go home
        useTransferStore.setState({ currentStep: "welcome" });
        window.history.replaceState({ step: "welcome" }, "", "/");
        return;
      }

      if (isStepAccessible(step)) {
        // Direct setState — bypasses setStep to avoid pushing another history entry
        useTransferStore.setState({ currentStep: step });
      } else {
        // Step not reachable — fall back to furthest accessible
        const fallback = getFurthestAccessibleStep();
        useTransferStore.setState({ currentStep: fallback });
        window.history.replaceState(
          { step: fallback },
          "",
          getPathForStep(fallback)
        );
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
}
