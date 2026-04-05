import { useEffect, useState, type ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  /** Additional CSS classes for the wrapper div */
  className?: string;
  /** Delay before the fade starts, in ms */
  delay?: number;
  /** Slide up from 20px below (fade-in-up effect) */
  up?: boolean;
}

/**
 * Bulletproof fade-in wrapper using CSS transitions driven by React state.
 *
 * Unlike CSS animations with fill-mode, this can never flash because:
 * 1. Elements render with opacity:0 via inline style (highest specificity, synchronous)
 * 2. useEffect fires after paint → sets visible=true
 * 3. CSS transition handles the smooth fade
 *
 * No animation engine, no fill-mode race, no keyframe conflicts.
 */
export function FadeIn({
  children,
  className = "",
  delay = 0,
  up = false,
}: FadeInProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // For delay=0, still go through a rAF to ensure the initial
    // opacity:0 frame is painted before transitioning.
    if (delay === 0) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: up
          ? visible
            ? "translateY(0)"
            : "translateY(20px)"
          : undefined,
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
      }}
    >
      {children}
    </div>
  );
}
