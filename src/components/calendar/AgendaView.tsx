import { Check, Edit3, Repeat2, Trash2 } from "lucide-react";
import type { TaskOccurrence } from "../../types";
import { formatTimeRange, localDate } from "../../utils";
import { formatDuration, isWeekend, relativeDayLabel, shiftDate, toDate } from "../../calendar/dates";
import { busyMinutes, CATEGORY_COLORS } from "../../calendar/occurrences";
import { holidayFor } from "../../calendar/holidays";
import type { HolidayRegion } from "../../calendar/holidays";
import { formatMarkerAmount, MARKER_STYLES } from "../../calendar/markers";
import type { DayMarker } from "../../calendar/markers";
import EmptyState from "../EmptyState";

interface AgendaViewProps {
  from: string;
  days: number;
  occurrences: Map<string, TaskOccurrence[]>;
  markers: Map<string, DayMarker[]>;
  region: HolidayRegion;
  selectedDate: string;
  onSelectDay: (value: string) => void;
  onOpenTask: (task: TaskOccurrence) => void;
  onToggleTask: (task: TaskOccurrence) => void;
  onDeleteTask: (task: TaskOccurrence) => void;
}

export default function AgendaView({
  from,
  days,
  occurrences,
  markers,
  region,
  selectedDate,
  onSelectDay,
  onOpenTask,
  onToggleTask,
  onDeleteTask,
}: AgendaViewProps) {
  const today = localDate();
  const dates = Array.from({ length: days }, (_, index) => shiftDate(from, index));
  const filled = dates.filter(
    (value) => (occurrences.get(value) || []).length > 0 || (markers.get(value) || []).length > 0,
  );

  if (filled.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong bg-white px-4 py-10">
        <EmptyState message="На ближайший месяц ничего не запланировано" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filled.map((value) => {
        const date = toDate(value);
        const dayTasks = occurrences.get(value) || [];
        const dayMarkers = markers.get(value) || [];
        const holiday = holidayFor(value, region);
        const relative = relativeDayLabel(value, today);
        const busy = busyMinutes(dayTasks);
        const doneCount = dayTasks.filter((task) => task.done).length;

        return (
          <section
            key={value}
            className={`overflow-hidden rounded-2xl border bg-white transition ${
              value === selectedDate ? "border-accent" : "border-line-strong"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectDay(value)}
              className="flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left"
            >
              <span
                className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl ${
                  value === today
                    ? "bg-accent text-white"
                    : isWeekend(date) || holiday
                      ? "bg-danger-soft text-danger"
                      : "bg-surface-subtle text-ink"
                }`}
              >
                <span className="text-[15px] font-semibold leading-none">{date.getDate()}</span>
                <span className="text-[9px] uppercase leading-none opacity-80">
                  {new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(date).replace(".", "")}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span
                    className={`truncate text-[14px] font-medium capitalize ${
                      isWeekend(date) || holiday ? "text-danger/85" : "text-ink"
                    }`}
                  >
                    {new Intl.DateTimeFormat("ru-RU", { weekday: "long" }).format(date)}
                  </span>
                  {relative && (
                    <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                      {relative}
                    </span>
                  )}
                </span>
                <span className="block truncate text-[11px] text-ink-muted">
                  {holiday ? `${holiday.name} · ` : ""}
                  {dayTasks.length > 0
                    ? `${doneCount}/${dayTasks.length}${busy > 0 ? ` · ${formatDuration(busy)}` : ""}`
                    : "только события"}
                </span>
              </span>
            </button>

            <div className="divide-y divide-line">
              {dayMarkers.map((marker) => {
                const style = MARKER_STYLES[marker.kind];
                return (
                  <div key={marker.id} className="flex items-center gap-2 px-3 py-2">
                    <i className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                    <p className="min-w-0 flex-1 truncate text-[13px] text-ink">
                      <span className={`mr-1 text-[11px] ${style.text}`}>{style.label}:</span>
                      {marker.title}
                    </p>
                    <span className="shrink-0 font-mono text-[11px] text-ink-secondary">
                      {formatMarkerAmount(marker)}
                    </span>
                  </div>
                );
              })}

              {dayTasks.map((task) => {
                const palette = task.category ? CATEGORY_COLORS[task.category] : null;
                return (
                  <div key={task.key} className="group flex items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task)}
                      aria-pressed={task.done}
                      aria-label="Изменить статус задачи"
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                        task.done ? "border-success bg-success text-white" : "border-line-strong bg-white"
                      }`}
                    >
                      {task.done && <Check size={13} />}
                    </button>

                    <span className="w-[74px] shrink-0 font-mono text-[11px] text-ink-muted">
                      {formatTimeRange(task.time, task.endTime) || "—"}
                    </span>

                    <button
                      type="button"
                      onClick={() => onOpenTask(task)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    >
                      {palette && <i className={`h-2 w-2 shrink-0 rounded-full ${palette.dot}`} />}
                      <span
                        className={`truncate text-[13.5px] ${
                          task.done ? "text-ink-muted line-through" : "text-ink"
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.repeat && <Repeat2 size={12} className="shrink-0 text-ink-muted" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenTask(task)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-accent-soft hover:text-accent md:opacity-0 md:group-hover:opacity-100"
                      aria-label="Редактировать задачу"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger md:opacity-0 md:group-hover:opacity-100"
                      aria-label="Удалить задачу"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
