import { useEffect, useRef } from "react";
import type { TaskOccurrence } from "../../types";
import { localDate } from "../../utils";
import { WEEKDAYS_SHORT, addDays, isWeekend, startOfWeek, toDate } from "../../calendar/dates";
import { holidayFor } from "../../calendar/holidays";
import type { HolidayRegion } from "../../calendar/holidays";

interface WeekStripProps {
  selectedDate: string;
  occurrences: Map<string, TaskOccurrence[]>;
  region: HolidayRegion;
  onSelect: (value: string) => void;
}

/** Три недели подряд: прошлая, текущая, следующая — листаются пальцем. */
export default function WeekStrip({ selectedDate, occurrences, region, onSelect }: WeekStripProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const today = localDate();
  const monday = startOfWeek(toDate(selectedDate));
  const days = Array.from({ length: 21 }, (_, index) => addDays(monday, index - 7));

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    // Центрируем текущую неделю, чтобы соседние были «за краем».
    container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
  }, [selectedDate]);

  return (
    <div
      ref={scrollRef}
      className="-mx-1 flex snap-x snap-mandatory gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {days.map((day) => {
        const value = localDate(day);
        const selected = value === selectedDate;
        const isToday = value === today;
        const holiday = holidayFor(value, region);
        const dayTasks = occurrences.get(value) || [];
        const allDone = dayTasks.length > 0 && dayTasks.every((task) => task.done);

        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            aria-pressed={selected}
            aria-current={isToday ? "date" : undefined}
            className={`flex h-[58px] w-[13.2%] min-w-[44px] shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-2xl border transition active:scale-95 ${
              selected
                ? "border-accent bg-accent text-white"
                : isToday
                  ? "border-accent bg-white text-accent"
                  : "border-line-strong bg-white text-ink"
            }`}
          >
            <span
              className={`text-[9px] uppercase tracking-wider ${
                selected
                  ? "text-white/75"
                  : isWeekend(day) || holiday
                    ? "text-danger/70"
                    : "text-ink-muted"
              }`}
            >
              {WEEKDAYS_SHORT[(day.getDay() + 6) % 7]}
            </span>
            <span
              className={`text-[15px] font-semibold ${
                !selected && (isWeekend(day) || holiday) && !isToday ? "text-danger/85" : ""
              }`}
            >
              {day.getDate()}
            </span>
            <span className="flex h-1 items-center gap-0.5">
              {dayTasks.slice(0, 3).map((task) => (
                <i
                  key={task.key}
                  className={`h-1 w-1 rounded-full ${
                    selected ? "bg-white/80" : allDone ? "bg-success" : "bg-accent"
                  }`}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
