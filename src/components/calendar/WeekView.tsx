import { useEffect, useMemo, useRef } from "react";
import { Check } from "lucide-react";
import type { TaskOccurrence } from "../../types";
import { formatTimeRange, localDate, timeToMinutes } from "../../utils";
import { WEEKDAYS_SHORT, isWeekend, minutesToClock } from "../../calendar/dates";
import { blockGeometry, placeTasks, taskTone } from "../../calendar/layout";
import { holidayFor } from "../../calendar/holidays";
import type { HolidayRegion } from "../../calendar/holidays";

const ROW_HEIGHT = 48;
const MIN_BLOCK_HEIGHT = 20;

interface WeekViewProps {
  days: Date[];
  selectedDate: string;
  occurrences: Map<string, TaskOccurrence[]>;
  region: HolidayRegion;
  dayStart: number;
  dayEnd: number;
  onSelectDay: (value: string) => void;
  onSlotClick: (value: string, time: string) => void;
  onOpenTask: (task: TaskOccurrence) => void;
  onToggleTask: (task: TaskOccurrence) => void;
}

export default function WeekView({
  days,
  selectedDate,
  occurrences,
  region,
  dayStart,
  dayEnd,
  onSelectDay,
  onSlotClick,
  onOpenTask,
  onToggleTask,
}: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const today = localDate();
  const values = days.map((day) => localDate(day));

  const { windowStart, windowEnd } = useMemo(() => {
    let earliest = dayStart * 60;
    let latest = dayEnd * 60;
    for (const value of values) {
      for (const task of occurrences.get(value) || []) {
        const start = timeToMinutes(task.time);
        if (start === null) continue;
        const end = timeToMinutes(task.endTime);
        earliest = Math.min(earliest, start);
        latest = Math.max(latest, end !== null && end > start ? end : start + 60);
      }
    }
    return {
      windowStart: Math.floor(earliest / 60),
      windowEnd: Math.min(24, Math.ceil(latest / 60)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occurrences, days, dayStart, dayEnd]);

  const hours = Array.from({ length: Math.max(1, windowEnd - windowStart) }, (_, index) => windowStart + index);
  const gridHeight = hours.length * ROW_HEIGHT;
  const yOf = (minutes: number) => ((minutes - windowStart * 60) / 60) * ROW_HEIGHT;

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const showNow = values.includes(today) && nowMinutes >= windowStart * 60 && nowMinutes <= windowEnd * 60;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = Math.max(0, yOf(Math.max(dayStart * 60, nowMinutes)) - ROW_HEIGHT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values[0]]);

  const untimedRow = values.map((value) =>
    (occurrences.get(value) || []).filter((task) => timeToMinutes(task.time) === null),
  );
  const hasUntimed = untimedRow.some((list) => list.length > 0);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[680px]">
        <div className="grid grid-cols-[46px_repeat(7,minmax(0,1fr))]">
          <div className="sticky left-0 z-30 bg-white" />
          {days.map((day, index) => {
            const value = values[index];
            const isToday = value === today;
            const holiday = holidayFor(value, region);
            const count = (occurrences.get(value) || []).length;

            return (
              <button
                key={value}
                type="button"
                onClick={() => onSelectDay(value)}
                aria-current={isToday ? "date" : undefined}
                aria-pressed={value === selectedDate}
                className={`flex flex-col items-center gap-0.5 rounded-t-xl border-b-2 px-1 py-2 transition ${
                  value === selectedDate
                    ? "border-accent bg-accent-soft"
                    : "border-transparent hover:bg-surface-subtle"
                }`}
              >
                <span
                  className={`text-[10px] uppercase tracking-wider ${
                    isWeekend(day) || holiday ? "text-danger/70" : "text-ink-muted"
                  }`}
                >
                  {WEEKDAYS_SHORT[(day.getDay() + 6) % 7]}
                </span>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-semibold ${
                    isToday
                      ? "bg-accent text-white"
                      : isWeekend(day) || holiday
                        ? "text-danger/85"
                        : "text-ink"
                  }`}
                >
                  {day.getDate()}
                </span>
                {holiday ? (
                  <span className="w-full truncate text-[9px] leading-tight text-danger/75">
                    {holiday.short}
                  </span>
                ) : (
                  <span className="text-[9px] text-ink-muted">{count > 0 ? `${count}` : ""}</span>
                )}
              </button>
            );
          })}
        </div>

        {hasUntimed && (
          <div className="cal-outside grid grid-cols-[46px_repeat(7,minmax(0,1fr))] border-b border-line">
            <div className="sticky left-0 z-30 flex items-center justify-end bg-white pr-1 text-[9px] uppercase text-ink-muted">
              весь день
            </div>
            {untimedRow.map((list, index) => (
              <div key={values[index]} className="space-y-0.5 p-1">
                {list.map((task) => (
                  <button
                    key={task.key}
                    type="button"
                    onClick={() => onOpenTask(task)}
                    className={`flex w-full items-center gap-1 truncate rounded-md px-1 py-0.5 text-left text-[10px] ${
                      task.done ? "bg-surface-subtle text-ink-muted line-through" : "bg-accent-soft text-ink"
                    }`}
                  >
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        <div ref={scrollRef} className="max-h-[460px] overflow-y-auto md:max-h-[620px]">
          <div className="grid grid-cols-[46px_repeat(7,minmax(0,1fr))]">
            <div className="sticky left-0 z-30 bg-white" style={{ height: gridHeight }}>
              {hours.map((hour) => (
                <span
                  key={hour}
                  className={`absolute -mt-[7px] w-11 pr-1 text-right font-mono text-[10px] ${
                    hour < dayStart || hour >= dayEnd ? "text-ink-muted/60" : "text-ink-muted"
                  }`}
                  style={{ top: (hour - windowStart) * ROW_HEIGHT }}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
              ))}
            </div>

            {values.map((value, index) => {
              const dayTasks = occurrences.get(value) || [];
              const placed = placeTasks(dayTasks);
              const weekend = isWeekend(days[index]);

              return (
                <div
                  key={value}
                  className={`relative border-l border-line ${weekend ? "cal-weekend" : ""} ${
                    value === selectedDate ? "cal-selected-col" : ""
                  }`}
                  style={{ height: gridHeight }}
                >
                  {hours.map((hour) => {
                    const night = hour < dayStart || hour >= dayEnd;
                    return (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => onSlotClick(value, `${String(hour).padStart(2, "0")}:00`)}
                        aria-label={`Добавить задачу на ${String(hour).padStart(2, "0")}:00`}
                        className={`cal-slot absolute left-0 right-0 border-t border-line transition ${
                          night ? "cal-night" : ""
                        }`}
                        style={{ top: (hour - windowStart) * ROW_HEIGHT, height: ROW_HEIGHT }}
                      />
                    );
                  })}

                  {placed.map(({ task, start, end, column, columns }) => {
                    const height = Math.max(MIN_BLOCK_HEIGHT, ((end - start) / 60) * ROW_HEIGHT - 3);
                    const geometry = blockGeometry(column, columns);

                    return (
                      <div
                        key={task.key}
                        className="absolute px-[2px]"
                        style={{
                          top: yOf(start) + 1,
                          height,
                          left: `${geometry.left}%`,
                          width: `${geometry.width}%`,
                          zIndex: geometry.zIndex,
                        }}
                      >
                        <div
                          className={`flex h-full items-start gap-1 overflow-hidden rounded-lg border-l-[3px] px-1 py-0.5 shadow-sm ${taskTone(task)}`}
                        >
                          <button
                            type="button"
                            onClick={() => onToggleTask(task)}
                            className={`mt-[1px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                              task.done ? "border-success bg-success text-white" : "border-line-strong bg-white"
                            }`}
                            aria-label="Изменить статус задачи"
                            aria-pressed={task.done}
                          >
                            {task.done && <Check size={9} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenTask(task)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p
                              className={`truncate text-[10.5px] font-medium leading-tight ${
                                task.done ? "line-through" : ""
                              }`}
                            >
                              {task.title}
                            </p>
                            {height > 30 && (
                              <p className="truncate font-mono text-[9px] text-ink-secondary">
                                {formatTimeRange(task.time, task.endTime)}
                              </p>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {value === today && showNow && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-20 border-t border-danger"
                      style={{ top: yOf(nowMinutes) }}
                    >
                      <span className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-danger" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {showNow && (
          <p className="mt-2 text-right font-mono text-[10px] text-ink-muted">
            сейчас {minutesToClock(nowMinutes)}
          </p>
        )}
      </div>
    </div>
  );
}
