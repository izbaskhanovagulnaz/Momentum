import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Repeat2 } from "lucide-react";
import type { TaskOccurrence } from "../../types";
import { localDate } from "../../utils";
import { WEEKDAYS_SHORT, chunkWeeks, isWeekend, isoWeek, monthKey } from "../../calendar/dates";
import { busyMinutes, CATEGORY_COLORS } from "../../calendar/occurrences";
import { holidayFor } from "../../calendar/holidays";
import type { HolidayRegion } from "../../calendar/holidays";
import { MARKER_STYLES } from "../../calendar/markers";
import type { DayMarker } from "../../calendar/markers";

interface MonthGridProps {
  days: Date[];
  selectedDate: string;
  currentMonth: string;
  occurrences: Map<string, TaskOccurrence[]>;
  markers: Map<string, DayMarker[]>;
  region: HolidayRegion;
  variant: "mobile" | "desktop";
  showWeekNumbers: boolean;
  /** Длина рабочего дня в минутах — база для полоски загрузки. */
  workdayMinutes: number;
  direction: number;
  animationKey: string;
  onSelect: (day: Date, expand?: boolean) => void;
  onOpenTask?: (occurrence: TaskOccurrence) => void;
  onMoveTask?: (key: string, date: string) => void;
}

function priorityDot(occurrence: TaskOccurrence) {
  if (occurrence.done) return "bg-success";
  if (occurrence.priority === "high") return "bg-danger";
  if (occurrence.priority === "low") return "bg-sky";
  return "bg-accent";
}

export default function MonthGrid({
  days,
  selectedDate,
  currentMonth,
  occurrences,
  markers,
  region,
  variant,
  showWeekNumbers,
  workdayMinutes,
  direction,
  animationKey,
  onSelect,
  onOpenTask,
  onMoveTask,
}: MonthGridProps) {
  const reduceMotion = useReducedMotion();
  const [dragOver, setDragOver] = useState<string | null>(null);
  const today = localDate();
  const mobile = variant === "mobile";
  const weeks = chunkWeeks(days);
  const columns = showWeekNumbers
    ? "grid-cols-[26px_repeat(7,minmax(0,1fr))]"
    : "grid-cols-7";

  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: direction * 28 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: direction * -28 },
      };

  return (
    <div role="grid" aria-label="Календарь месяца">
      <div
        role="row"
        className={`grid ${columns} text-center font-semibold uppercase tracking-wider text-ink-muted ${
          mobile ? "mb-1 text-[11px]" : "pb-1 text-[12px]"
        }`}
      >
        {showWeekNumbers && <span aria-hidden />}
        {WEEKDAYS_SHORT.map((day, index) => (
          <span
            key={day}
            role="columnheader"
            className={index >= 5 ? "text-danger/70" : undefined}
          >
            {day}
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={animationKey}
          initial={slide.initial}
          animate={slide.animate}
          exit={slide.exit}
          transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.32, 0.72, 0, 1] }}
          className={
            mobile ? "" : "mt-2 overflow-hidden rounded-2xl border border-line-strong"
          }
        >
          {weeks.map((week, weekIndex) => (
            <div
              role="row"
              key={week[0].toISOString()}
              className={`grid ${columns} ${mobile ? "gap-y-1" : ""}`}
            >
              {showWeekNumbers && (
                <span
                  className={`flex items-center justify-center border-r border-line font-mono text-[10px] text-ink-muted/70 ${
                    weekIndex === weeks.length - 1 ? "" : "border-b"
                  }`}
                >
                  {isoWeek(week[0])}
                </span>
              )}

              {week.map((day, dayIndex) => {
                const value = localDate(day);
                const selected = value === selectedDate;
                const isToday = value === today;
                const outside = monthKey(day) !== currentMonth;
                const past = value < today;
                const weekend = isWeekend(day);
                const holiday = holidayFor(value, region);
                const dayTasks = occurrences.get(value) || [];
                const dayMarkers = markers.get(value) || [];
                const count = dayTasks.length;
                const allDone = count > 0 && dayTasks.every((task) => task.done);
                const load = count > 0 ? Math.min(1, busyMinutes(dayTasks) / workdayMinutes) : 0;

                const ariaLabel = `${new Intl.DateTimeFormat("ru-RU", {
                  day: "numeric",
                  month: "long",
                  weekday: "long",
                }).format(day)}${holiday ? `, ${holiday.name}` : ""}${
                  count ? `, задач: ${count}` : ", задач нет"
                }`;

                if (mobile) {
                  return (
                    <button
                      key={value}
                      type="button"
                      role="gridcell"
                      aria-selected={selected}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={ariaLabel}
                      onClick={() => onSelect(day)}
                      className={`relative mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full text-[14px] transition active:scale-95 ${
                        selected
                          ? "bg-accent text-white shadow-sm"
                          : isToday
                            ? "font-semibold text-accent ring-1 ring-accent"
                            : holiday || weekend
                              ? "text-danger/80"
                              : "text-ink"
                      } ${outside && !selected ? "opacity-40" : past && !selected && !isToday ? "opacity-60" : ""}`}
                    >
                      <span className="text-[16px] font-semibold tabular-nums leading-none">
                        {day.getDate()}
                      </span>

                      {holiday && !selected && (
                        <span className="absolute right-1.5 top-1 h-1 w-1 rounded-full bg-danger" />
                      )}

                      {allDone ? (
                        <Check
                          size={11}
                          strokeWidth={3}
                          className={`absolute bottom-1 ${selected ? "text-white/90" : "text-success"}`}
                        />
                      ) : (
                        count > 0 && (
                          <span className="absolute bottom-1 flex items-center gap-0.5">
                            {dayTasks.slice(0, 3).map((task) => (
                              <i
                                key={task.key}
                                className={`h-1 w-1 rounded-full ${
                                  selected ? "bg-white/90" : priorityDot(task)
                                }`}
                              />
                            ))}
                          </span>
                        )
                      )}

                      {dayMarkers.length > 0 && !selected && (
                        <span className="absolute left-1.5 top-1 h-1 w-1 rounded-full bg-mint" />
                      )}
                    </button>
                  );
                }

                return (
                  <div
                    key={value}
                    role="gridcell"
                    tabIndex={-1}
                    aria-selected={selected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={ariaLabel}
                    onClick={() => onSelect(day, true)}
                    onDragOver={(event) => {
                      if (!onMoveTask) return;
                      event.preventDefault();
                      setDragOver(value);
                    }}
                    onDragLeave={() => setDragOver((current) => (current === value ? null : current))}
                    onDrop={(event) => {
                      if (!onMoveTask) return;
                      event.preventDefault();
                      setDragOver(null);
                      const key = event.dataTransfer.getData("text/plain");
                      if (key) onMoveTask(key, value);
                    }}
                    className={`relative flex min-h-[86px] cursor-pointer flex-col gap-1 overflow-hidden p-1.5 text-left transition lg:min-h-[104px] ${
                      dayIndex === 6 ? "" : "border-r border-line"
                    } ${weekIndex === weeks.length - 1 ? "" : "border-b border-line"} ${
                      selected
                        ? "bg-accent-soft ring-1 ring-inset ring-accent"
                        : "hover:bg-surface-subtle"
                    } ${
                      dragOver === value
                        ? "bg-accent-soft outline-dashed outline-2 -outline-offset-2 outline-accent"
                        : ""
                    } ${
                      outside
                        ? "cal-outside opacity-55"
                        : weekend && !selected
                          ? "cal-weekend"
                          : ""
                    } ${past && !outside && !selected && !isToday ? "opacity-75" : ""}`}
                  >
                    {day.getDate() === 1 && (
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-accent/25" />
                    )}

                    <div className="flex items-start justify-between gap-1">
                      <span
                        className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[16px] font-semibold tabular-nums leading-none ${
                          isToday
                            ? "bg-accent text-white shadow-sm"
                            : holiday || weekend
                              ? "text-danger"
                              : "text-ink"
                        }`}
                      >
                        {day.getDate()}
                      </span>

                      <span className="flex items-center gap-1">
                        {dayMarkers.slice(0, 3).map((marker) => (
                          <i
                            key={marker.id}
                            title={`${MARKER_STYLES[marker.kind].label}: ${marker.title}`}
                            className={`h-1.5 w-1.5 rounded-full ${MARKER_STYLES[marker.kind].dot}`}
                          />
                        ))}
                        {allDone && <Check size={12} strokeWidth={3} className="text-success" />}
                      </span>
                    </div>

                    {holiday && (
                      <p className="truncate text-[10px] font-medium leading-tight text-danger/80">
                        {holiday.short}
                      </p>
                    )}

                    <div className="min-h-0 flex-1 space-y-0.5">
                      {dayTasks.slice(0, 2).map((task) => {
                        const palette = task.category ? CATEGORY_COLORS[task.category] : null;
                        return (
                          <button
                            key={task.key}
                            type="button"
                            draggable={Boolean(onMoveTask)}
                            onDragStart={(event) => {
                              event.dataTransfer.setData("text/plain", task.key);
                              event.dataTransfer.effectAllowed = "move";
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenTask?.(task);
                            }}
                            className={`flex w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-[10.5px] leading-tight transition hover:brightness-95 ${
                              task.done
                                ? "bg-surface-subtle text-ink-muted line-through"
                                : palette
                                  ? `${palette.chip} text-ink`
                                  : "bg-accent-soft text-ink"
                            }`}
                          >
                            <i
                              className={`h-2.5 w-[3px] shrink-0 rounded-full ${priorityDot(task)}`}
                            />
                            {task.time && (
                              <span className="shrink-0 font-mono text-[9.5px] text-ink-secondary">
                                {task.time}
                              </span>
                            )}
                            <span className="truncate">{task.title}</span>
                            {task.repeat && (
                              <Repeat2 size={9} className="ml-auto shrink-0 text-ink-muted" />
                            )}
                          </button>
                        );
                      })}

                      {count > 2 && (
                        <p className="px-1 text-[10px] font-medium text-ink-muted">
                          ещё {count - 2}
                        </p>
                      )}
                    </div>

                    {load > 0 && (
                      <span
                        className="h-[3px] shrink-0 overflow-hidden rounded-full bg-line"
                        title={`Загрузка дня ${Math.round(load * 100)}%`}
                      >
                        <span
                          className={`block h-full rounded-full ${
                            load > 0.85 ? "bg-danger" : load > 0.5 ? "bg-warning" : "bg-accent"
                          }`}
                          style={{ width: `${Math.max(8, load * 100)}%` }}
                        />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
