import type { WizardStep } from "@tunetransfer/shared";

const STEP_TO_PATH: Record<WizardStep, string> = {
  welcome: "/",
  upload: "/upload",
  review: "/review",
  connect: "/connect",
  transfer: "/transfer",
  results: "/results",
};

const PATH_TO_STEP: Record<string, WizardStep> = Object.fromEntries(
  Object.entries(STEP_TO_PATH).map(([step, path]) => [path, step as WizardStep])
) as Record<string, WizardStep>;

export function getPathForStep(step: WizardStep): string {
  return STEP_TO_PATH[step];
}

export function getStepFromPath(pathname: string): WizardStep | null {
  return PATH_TO_STEP[pathname] ?? null;
}
