import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Edit3, Trash2, X } from "lucide-react";
import type { Task } from "../types";
import { localDate } from "../utils";

const ROW_HEIGHT = 56;
const SLOT_MINUTES = 60;
const HOURS = Array.from({ length: 24 }, (_, index) => index);

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toMinutes(time?: string) {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return Math.min(24 * 60 - 1, Math.max(0, hours * 60 + minutes));
}

interface Placed {
  task: Task;
  start: number;
  column: number;
  columns: number;
}

function layoutTasks(items: { task: Task; start: number }[]): Placed[] {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const placed: Placed[] = [];
  let cluster: { task: Task; start: number }[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const columnEnds: number[] = [];
    const assigned = cluster.map((item) => {
      let column = columnEnds.findIndex((end) => end <= item.start);
      if (column === -1) column = columnEnds.length;
      columnEnds[column] = item.start + SLOT_MINUTES;
      return { ...item, column };
    });

    for (const item of assigned) {
      placed.push({ ...item, columns: columnEnds.length });
    }

    cluster = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.start + SLOT_MINUTES);
  }
  if (cluster.length > 0) flush();

  return placed;
}

function taskTone(task: Task) {
  if (task.done) return "border-line-strong bg-surface-subtle text-ink-muted";
  if (task.priority === "high") return "border-danger bg-danger-soft text-ink";
  if (task.priority === "low") return "border-sky bg-sky-soft text-ink";
  return "border-accent bg-accent-soft text-ink";
}

interface DayTimelineProps {
  date: string;
  tasks: Task[];
  onCreate: (title: string, time: string) => void;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function DayTimeline({
  date,
  tasks,
  onCreate,
  onToggle,
  onEdit,
  onDelete,
}: DayTimelineProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [draftTime, setDraftTime] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const isToday = date === localDate();

  const untimed = useMemo(
    () => tasks.filter((task) => toMinutes(task.time) === null),
    [tasks],
  );

  const placed = useMemo(
    () =>
      layoutTasks(
        tasks
          .map((task) => ({ task, start: toMinutes(task.time) }))
          .filter((item): item is { task: Task; start: number } => item.start !== null),
      ),
    [tasks],
  );

  useEffect(() => {
    if (!isToday) return;

    const tick = () => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    };

    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [isToday]);

  useEffect(() => {
    setDraftTime(null);
    setDraftTitle("");

    const container = scrollRef.current;
    if (!container) return;

    const firstTask = placed.reduce<number | null>(
      (min, item) => (min === null || item.start < min ? item.start : min),
      null,
    );
    const anchor = firstTask ?? (isToday ? nowMinutes : 8 * 60);
    container.scrollTop = Math.max(0, (anchor / 60 - 1) * ROW_HEIGHT);
    // Прокручиваем только при смене дня, а не при каждом изменении задач.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const openDraft = (hour: number) => {
    setDraftTime(`${pad(hour)}:00`);
    setDraftTitle("");
  };

  const submitDraft = () => {
    const value = draftTitle.trim();
    if (!value || !draftTime) return;

    onCreate(value, draftTime);
    setDraftTime(null);
    setDraftTitle("");
  };

  const draftMinutes = toMinutes(draftTime ?? undefined);

  return (
    <div>
      {untimed.length > 0 && (
        <div className="mb-3 rounded-2xl border border-line-strong bg-white p-3">
          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            Без времени
          </p>
          <div className="space-y-2">
            {untimed.map((task) => (
              <div key={task.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggle(task.id)}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    task.done
                      ? "border-success bg-success text-white"
                      : "border-line-strong bg-white"
                  }`}
                  aria-label="Изменить статус задачи"
                >
                  {task.done && <Check size={13} />}
                </button>
                <p
                  className={`min-w-0 flex-1 truncate text-[13px] ${
                    task.done ? "text-ink-muted line-through" : "text-ink"
                  }`}
                >
                  {task.title}
                </p>
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-accent-soft hover:text-accent"
                  aria-label="Редактировать задачу"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger"
                  aria-label="Удалить задачу"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className="max-h-[420px] overflow-y-auto rounded-2xl border border-line-strong bg-white px-3 py-2 md:max-h-[560px]"
      >
        <div
          className="relative"
          style={{ height: HOURS.length * ROW_HEIGHT + ROW_HEIGHT / 2 }}
        >
          {HOURS.map((hour) => (
            <button
              key={hour}
              type="button"
              onClick={() => openDraft(hour)}
              className="group absolute left-0 right-0 text-left"
              style={{ top: hour * ROW_HEIGHT, height: ROW_HEIGHT }}
              aria-label={`Добавить задачу на ${pad(hour)}:00`}
            >
              <span className="absolute left-0 top-0.5 w-12 font-mono text-[11px] text-ink-muted">
                {pad(hour)}:00
              </span>
              <span className="absolute inset-y-0 left-14 right-0 border-t border-line group-hover:bg-accent-soft/40" />
            </button>
          ))}

          <span
            className="absolute left-14 right-0 border-t border-line"
            style={{ top: HOURS.length * ROW_HEIGHT }}
          />
          <span
            className="absolute left-0 w-12 font-mono text-[11px] text-ink-muted"
            style={{ top: HOURS.length * ROW_HEIGHT + 2 }}
          >
            00:00
          </span>

          <div className="pointer-events-none absolute inset-y-0 left-14 right-1">
            {placed.map(({ task, start, column, columns }) => {
              const height = (SLOT_MINUTES / 60) * ROW_HEIGHT - 5;
              const top = Math.min(
                (start / 60) * ROW_HEIGHT,
                HOURS.length * ROW_HEIGHT - height,
              );

              return (
                <div
                  key={task.id}
                  className="pointer-events-auto absolute"
                  style={{
                    top: top + 2,
                    height,
                    left: `${(column / columns) * 100}%`,
                    width: `calc(${100 / columns}% - 4px)`,
                  }}
                >
                  <div
                    className={`group flex h-full items-center gap-2 overflow-hidden rounded-xl border-l-[3px] px-2 shadow-sm ${taskTone(task)}`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggle(task.id)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        task.done
                          ? "border-success bg-success text-white"
                          : "border-line-strong bg-white"
                      }`}
                      aria-label="Изменить статус задачи"
                    >
                      {task.done && <Check size={12} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p
                        className={`truncate text-[13px] font-medium ${
                          task.done ? "line-through" : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="truncate font-mono text-[10px] text-ink-secondary">
                        {task.time}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(task.id)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:text-danger md:opacity-0 md:group-hover:opacity-100"
                      aria-label="Удалить задачу"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {draftTime !== null && draftMinutes !== null && (
            <div
              className="absolute left-14 right-1 z-20"
              style={{
                top: Math.min(
                  (draftMinutes / 60) * ROW_HEIGHT + 2,
                  HOURS.length * ROW_HEIGHT - ROW_HEIGHT + 2,
                ),
                height: ROW_HEIGHT - 5,
              }}
            >
              <div className="flex h-full items-center gap-2 rounded-xl border border-accent bg-white px-2 shadow-md">
                <input
                  type="time"
                  value={draftTime}
                  onChange={(event) => setDraftTime(event.target.value)}
                  className="h-7 w-[86px] shrink-0 rounded-lg border border-line-strong bg-surface-subtle px-1 text-[11px] outline-none"
                />
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitDraft();
                    }
                    if (event.key === "Escape") setDraftTime(null);
                  }}
                  placeholder="Новая задача"
                  className="h-7 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted"
                />
                <button
                  type="button"
                  onClick={submitDraft}
                  disabled={!draftTitle.trim()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-40"
                  aria-label="Сохранить задачу"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDraftTime(null)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:text-danger"
                  aria-label="Отменить"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {isToday && (
            <div
              className="pointer-events-none absolute left-10 right-0 z-10"
              style={{ top: (nowMinutes / 60) * ROW_HEIGHT }}
            >
              <div className="relative border-t border-danger">
                <span className="absolute -left-1 -top-[3px] h-1.5 w-1.5 rounded-full bg-danger" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
