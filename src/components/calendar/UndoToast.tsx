import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";

interface UndoToastProps {
  /** Меняется на каждое новое действие — только он перезапускает таймер. */
  id: number;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export default function UndoToast({ id, message, onUndo, onDismiss, duration = 6000 }: UndoToastProps) {
  // Колбэки приходят новыми на каждый рендер родителя, поэтому таймер
  // завязан только на id — иначе он сбрасывался бы бесконечно.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const timer = window.setTimeout(() => dismissRef.current(), duration);
    return () => window.clearTimeout(timer);
  }, [id, duration]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[120] flex justify-center px-4 md:bottom-8"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-2xl">
        <p className="text-[13px]">{message}</p>
        <button
          type="button"
          onClick={onUndo}
          className="flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-[12.5px] font-medium transition hover:bg-white/25"
        >
          <RotateCcw size={13} />
          Вернуть
        </button>
      </div>
    </motion.div>
  );
}
