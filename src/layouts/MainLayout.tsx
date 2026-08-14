import { useEffect, useRef } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";

// Apple's standard easing — quick start, long settle.
const EASE = [0.32, 0.72, 0, 1] as const;

export default function MainLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();
  const paneRef = useRef<HTMLDivElement | null>(null);

  // A lingering `filter`/`will-change` would turn this wrapper into the
  // containing block for every `position: fixed` modal the pages render, so the
  // pane must end up with no filter at all once it has settled.
  const clearCompositing = () => {
    const pane = paneRef.current;
    if (!pane) return;
    pane.style.filter = "none";
    pane.style.willChange = "auto";
  };

  // Backstop in case the enter animation never reports completion (interrupted
  // navigation, a tab that was hidden mid-transition).
  useEffect(() => {
    const timer = window.setTimeout(clearCompositing, 700);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  const variants = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0, transition: { duration: 0.12 } },
      }
    : {
        // The section arrives out of focus and settles into the glass, the way
        // iOS resolves a pane instead of cutting to it.
        initial: { opacity: 0, scale: 0.985, y: 10, filter: "blur(12px)" },
        animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" },
        // Leaving is faster than arriving, so switching never feels laggy.
        exit: {
          opacity: 0,
          scale: 1.008,
          y: -6,
          filter: "blur(8px)",
          transition: { duration: 0.18, ease: EASE },
        },
      };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <main className="safe-top mx-auto w-full max-w-[1400px] px-4 pb-32 pt-6 md:px-8 md:pb-14 md:pt-9 lg:px-10 xl:px-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              ref={paneRef}
              initial={variants.initial}
              animate={variants.animate}
              exit={variants.exit}
              transition={{ duration: reduceMotion ? 0.15 : 0.36, ease: EASE }}
              style={{ willChange: "transform, filter, opacity" }}
              onAnimationComplete={clearCompositing}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
