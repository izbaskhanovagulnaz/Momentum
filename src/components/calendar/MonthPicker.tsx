import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];

interface MonthPickerProps {
  year: number;
  month: number;
  currentYear: number;
  currentMonth: number;
  onPick: (year: number, month: number) => void;
  onClose: () => void;
}

export default function MonthPicker({
  year,
  month,
  currentYear,
  currentMonth,
  onPick,
  onClose,
}: MonthPickerProps) {
  const [visibleYear, setVisibleYear] = useState(year);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute left-0 top-full z-40 mt-2 w-[268px] rounded-2xl border border-line-strong bg-white p-3 shadow-xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setVisibleYear((value) => value - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-subtle"
          aria-label="Предыдущий год"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-mono text-[15px] font-semibold text-ink">{visibleYear}</span>
        <button
          type="button"
          onClick={() => setVisibleYear((value) => value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-subtle"
          aria-label="Следующий год"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {MONTHS.map((label, index) => {
          const active = visibleYear === year && index === month;
          const isCurrent = visibleYear === currentYear && index === currentMonth;

          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                onPick(visibleYear, index);
                onClose();
              }}
              className={`h-9 rounded-xl text-[13px] font-medium transition ${
                active
                  ? "bg-accent text-white"
                  : isCurrent
                    ? "bg-accent-soft text-accent"
                    : "text-ink hover:bg-surface-subtle"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
