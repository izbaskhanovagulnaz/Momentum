import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Edit3, Repeat2, Trash2, X } from "lucide-react";
import type { TaskOccurrence } from "../types";
import { formatTimeRange, localDate, timeToMinutes } from "../utils";
import { minutesToClock, shiftedEnd } from "../calendar/dates";
import { blockGeometry, DAY_MINUTES, placeTasks, taskTone } from "../calendar/layout";

const ROW_HEIGHT = 56;
const MIN_BLOCK_HEIGHT = 22;

type Interaction =
  | { kind: "create"; anchor: number; start: number; end: number; moved: boolean }
  | { kind: "move"; key: string; start: number; end: number; grab: number; moved: boolean }
  | { kind: "resize"; key: string; start: number; end: number; moved: boolean };

export interface DayTimelineProps {
  date: string;
  tasks: TaskOccurrence[];
  /** Границы рабочего дня — вне них часы приглушаются. */
  dayStart: number;
  dayEnd: number;
  /** Шаг привязки в минутах. */
  step: number;
  collapseNight: boolean;
  onCreate: (title: string, time: string, endTime?: string) => void;
  onToggle: (task: TaskOccurrence) => void;
  onEdit: (task: TaskOccurrence) => void;
  onDelete: (task: TaskOccurrence) => void;
  onReschedule: (task: TaskOccurrence, time: string, endTime: string) => void;
  /** Открыть черновик на этом времени (переход из другого режима). */
  draftRequest?: string | null;
  onDraftHandled?: () => void;
  /**
   * Вместо встроенного редактора отдавать выбранный интервал наружу — на
   * телефоне он не помещается в ширину часов и живёт в отдельном листе.
   */
  useSheet?: boolean;
  onRequestCreate?: (start: string, end: string) => void;
  /** Растянуть сетку часов на всю высоту родителя вместо фиксированной. */
  fill?: boolean;
}

/** Сколько держать палец, прежде чем жест перестанет быть прокруткой. */
const LONG_PRESS_MS = 260;
const SCROLL_SLOP = 8;

export default function DayTimeline({
  date,
  tasks,
  dayStart,
  dayEnd,
  step,
  collapseNight,
  onCreate,
  onToggle,
  onEdit,
  onDelete,
  onReschedule,
  draftRequest,
  onDraftHandled,
  useSheet = false,
  onRequestCreate,
  fill = false,
}: DayTimelineProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [draftTime, setDraftTime] = useState<string | null>(null);
  const [draftEnd, setDraftEnd] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  // Отложенный тач-жест: пока таймер не сработал, палец всё ещё листает.
  const pendingRef = useRef<{
    y: number;
    anchor: number;
    timer: number;
    /** Ключ задачи, если палец лёг на блок, а не на пустой слот. */
    task?: string;
  } | null>(null);
  const touchDragRef = useRef(false);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Жест держим и в ref, и в состоянии: ref читают обработчики window,
  // состояние — рендер. Побочные эффекты живут вне setState.
  const setDrag = (next: Interaction | null) => {
    interactionRef.current = next;
    setInteraction(next);
  };

  const isToday = date === localDate();

  const untimed = useMemo(() => tasks.filter((task) => timeToMinutes(task.time) === null), [tasks]);

  const placed = useMemo(() => placeTasks(tasks), [tasks]);

  // Ночь сворачивается, только пока в ней ничего нет: иначе задача исчезла бы
  // из виду вместе со свёрнутыми часами.
  const bounds = useMemo(() => {
    const earliest = placed.reduce((min, item) => Math.min(min, item.start), 24 * 60);
    const latest = placed.reduce((max, item) => Math.max(max, item.end), 0);
    return { earliest, latest };
  }, [placed]);

  const nightNeeded =
    expanded ||
    !collapseNight ||
    bounds.earliest < dayStart * 60 ||
    bounds.latest > dayEnd * 60 ||
    (isToday && (nowMinutes < dayStart * 60 || nowMinutes > dayEnd * 60));

  const windowStart = nightNeeded ? 0 : dayStart;
  const windowEnd = nightNeeded ? 24 : dayEnd;
  const hours = useMemo(
    () => Array.from({ length: windowEnd - windowStart }, (_, index) => windowStart + index),
    [windowStart, windowEnd],
  );
  const gridHeight = hours.length * ROW_HEIGHT;

  const yOf = (minutes: number) => ((minutes - windowStart * 60) / 60) * ROW_HEIGHT;
  const minutesAt = (clientY: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return windowStart * 60;
    const raw = windowStart * 60 + ((clientY - rect.top) / ROW_HEIGHT) * 60;
    return Math.max(windowStart * 60, Math.min(windowEnd * 60, raw));
  };
  const snap = (minutes: number) => Math.round(minutes / step) * step;

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
    setDraftEnd("");
    setDraftTitle("");
    setExpanded(false);

    const container = scrollRef.current;
    if (!container) return;

    const anchor = placed.length > 0 ? bounds.earliest : isToday ? nowMinutes : dayStart * 60;
    container.scrollTop = Math.max(0, yOf(anchor) - ROW_HEIGHT);
    // Прокручиваем только при смене дня, а не при каждом изменении задач.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Запрос черновика приходит из недели/повестки — открываем его на нужном часе.
  useEffect(() => {
    if (!draftRequest) return;
    const start = timeToMinutes(draftRequest);
    if (start === null) return;
    openDraft(start, Math.min(start + 60, DAY_MINUTES - 1));
    const container = scrollRef.current;
    if (container) container.scrollTop = Math.max(0, yOf(start) - ROW_HEIGHT);
    onDraftHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftRequest]);

  // Слушатели висят на window постоянно: если подписываться только на время
  // жеста, очень быстрый клик успевает отпустить кнопку до подписки.
  useEffect(() => {
    const move = (event: PointerEvent) => {
      // Палец сдвинулся раньше срабатывания таймера — значит это прокрутка.
      const pending = pendingRef.current;
      if (pending && Math.abs(event.clientY - pending.y) > SCROLL_SLOP) cancelPending();

      const current = interactionRef.current;
      if (!current) return;
      const pointer = minutesAt(event.clientY);

      if (current.kind === "create") {
        const raw = snap(pointer);
        if (!current.moved && Math.abs(raw - current.anchor) < step) return;
        setDrag({
          ...current,
          start: Math.min(current.anchor, raw),
          end: Math.max(current.anchor + step, raw),
          moved: true,
        });
        return;
      }

      if (current.kind === "move") {
        const duration = current.end - current.start;
        const start = Math.max(0, Math.min(DAY_MINUTES - duration, snap(pointer - current.grab)));
        if (!current.moved && start === current.start) return;
        setDrag({ ...current, start, end: start + duration, moved: true });
        return;
      }

      const end = Math.max(current.start + step, Math.min(DAY_MINUTES, snap(pointer)));
      if (!current.moved && end === current.end) return;
      setDrag({ ...current, end, moved: true });
    };

    const finish = () => {
      // Короткий тап: таймер удержания ещё не сработал.
      const pending = pendingRef.current;
      if (pending) {
        const { anchor, task: key } = pending;
        cancelPending();
        if (key) {
          const task = tasks.find((item) => item.key === key);
          if (task) onEdit(task);
        } else {
          openDraft(anchor, Math.min(DAY_MINUTES - 1, anchor + Math.max(step, 60)));
        }
        return;
      }

      const current = interactionRef.current;
      if (!current) return;
      setDrag(null);
      touchDragRef.current = false;

      if (current.kind === "create") {
        const start = current.moved ? current.start : snap(current.anchor);
        const end = current.moved ? current.end : Math.min(DAY_MINUTES - 1, start + Math.max(step, 60));
        openDraft(start, end);
        return;
      }

      const task = tasks.find((item) => item.key === current.key);
      if (!task) return;
      if (current.moved) onReschedule(task, minutesToClock(current.start), minutesToClock(current.end));
      else if (current.kind === "move") onEdit(task);
    };

    // Отмена жеста (браузер забрал его под свой скролл) ничего не создаёт.
    const abort = () => {
      cancelPending();
      if (interactionRef.current) setDrag(null);
      touchDragRef.current = false;
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", abort);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", abort);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, step, windowStart, windowEnd, useSheet]);

  // Пока идёт тач-жест, страница не должна прокручиваться под пальцем.
  // Слушатель обязан быть непассивным, иначе preventDefault игнорируется.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const onTouchMove = (event: TouchEvent) => {
      if (touchDragRef.current) event.preventDefault();
    };

    grid.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => grid.removeEventListener("touchmove", onTouchMove);
  }, []);

  const cancelPending = () => {
    const pending = pendingRef.current;
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pendingRef.current = null;
  };

  const startCreate = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-block]")) return;

    const anchor = snap(minutesAt(event.clientY));

    if (event.pointerType === "mouse") {
      setDrag({ kind: "create", anchor, start: anchor, end: anchor + step, moved: false });
      return;
    }

    // Палец: сначала ждём удержание, иначе жест уйдёт в прокрутку часов.
    pendingRef.current = {
      y: event.clientY,
      anchor,
      timer: window.setTimeout(() => {
        pendingRef.current = null;
        touchDragRef.current = true;
        navigator.vibrate?.(12);
        setDrag({ kind: "create", anchor, start: anchor, end: anchor + step, moved: false });
      }, LONG_PRESS_MS),
    };
  };

  /** Встроенный редактор на мыши, отдельный лист — на телефоне. */
  const openDraft = (start: number, end: number) => {
    if (useSheet) {
      onRequestCreate?.(minutesToClock(start), minutesToClock(end));
      return;
    }
    setDraftTime(minutesToClock(start));
    setDraftEnd(minutesToClock(end));
    setDraftTitle("");
  };

  const submitDraft = () => {
    const value = draftTitle.trim();
    if (!value || !draftTime) return;

    const start = timeToMinutes(draftTime);
    const end = timeToMinutes(draftEnd);
    onCreate(value, draftTime, start !== null && end !== null && end > start ? draftEnd : undefined);
    setDraftTime(null);
    setDraftEnd("");
    setDraftTitle("");
  };

  const draftMinutes = timeToMinutes(draftTime || undefined);
  const draftEndMinutes = timeToMinutes(draftEnd);
  const draftHeight =
    draftMinutes !== null && draftEndMinutes !== null && draftEndMinutes > draftMinutes
      ? Math.max(MIN_BLOCK_HEIGHT, ((draftEndMinutes - draftMinutes) / 60) * ROW_HEIGHT - 5)
      : ROW_HEIGHT - 5;

  const nightHidden = !nightNeeded;

  return (
    <div className={fill ? "flex min-h-0 flex-1 flex-col" : undefined}>
      {untimed.length > 0 && (
        <div className={`mb-3 rounded-2xl border border-line-strong bg-white p-3 ${fill ? "shrink-0" : ""}`}>
          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-ink-muted">Без времени</p>
          <div className="space-y-2">
            {untimed.map((task) => (
              <div key={task.key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggle(task)}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                    task.done ? "border-success bg-success text-white" : "border-line-strong bg-white"
                  }`}
                  aria-label="Изменить статус задачи"
                  aria-pressed={task.done}
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
                {task.repeat && <Repeat2 size={13} className="shrink-0 text-ink-muted" />}
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
                  onClick={() => onDelete(task)}
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
        className={`overflow-y-auto rounded-2xl border border-line-strong bg-white px-3 py-2 ${
          fill ? "min-h-0 flex-1" : "max-h-[420px] md:max-h-[560px]"
        }`}
      >
        {nightHidden && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mb-1 flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-medium text-ink-muted transition hover:bg-surface-subtle hover:text-accent"
          >
            <ChevronUp size={12} />
            Показать ночь 00:00 – {String(dayStart).padStart(2, "0")}:00
          </button>
        )}

        <div
          ref={gridRef}
          onPointerDown={startCreate}
          className="relative select-none"
          style={{ height: gridHeight + ROW_HEIGHT / 2 }}
        >
          {hours.map((hour) => {
            const night = hour < dayStart || hour >= dayEnd;
            const top = (hour - windowStart) * ROW_HEIGHT;
            return (
              <div key={hour} className="absolute left-0 right-0" style={{ top, height: ROW_HEIGHT }}>
                <span
                  className={`pointer-events-none absolute left-0 top-0 w-12 font-mono text-[11px] ${
                    night ? "text-ink-muted/60" : "text-ink-muted"
                  }`}
                >
                  {String(hour).padStart(2, "0")}:00
                </span>
                <span
                  className={`cal-slot absolute inset-y-0 left-14 right-0 border-t border-line transition ${
                    night ? "cal-night" : ""
                  }`}
                />
                <span className="absolute left-14 right-0 border-t border-dashed border-line/70" style={{ top: ROW_HEIGHT / 2 }} />
                {step === 15 && (
                  <>
                    <span className="absolute left-14 right-0 border-t border-dotted border-line/50" style={{ top: ROW_HEIGHT / 4 }} />
                    <span className="absolute left-14 right-0 border-t border-dotted border-line/50" style={{ top: (ROW_HEIGHT * 3) / 4 }} />
                  </>
                )}
              </div>
            );
          })}

          <span className="pointer-events-none absolute left-14 right-0 border-t border-line" style={{ top: gridHeight }} />
          <span
            className="pointer-events-none absolute left-0 w-12 font-mono text-[11px] text-ink-muted"
            style={{ top: gridHeight + 2 }}
          >
            {String(windowEnd % 24).padStart(2, "0")}:00
          </span>

          <div className="pointer-events-none absolute inset-y-0 left-14 right-1">
            {placed.map(({ task, start, end, column, columns }) => {
              const dragging =
                interaction &&
                interaction.kind !== "create" &&
                interaction.key === task.key &&
                interaction.moved;
              const liveStart = dragging ? interaction.start : start;
              const liveEnd = dragging ? interaction.end : end;
              const height = Math.max(MIN_BLOCK_HEIGHT, ((liveEnd - liveStart) / 60) * ROW_HEIGHT - 5);
              const top = Math.min(yOf(liveStart), gridHeight - height);
              const compact = height < 40;
              const geometry = blockGeometry(column, columns);

              return (
                <div
                  key={task.key}
                  data-block
                  className={`pointer-events-auto absolute ${dragging ? "z-30 opacity-90" : ""}`}
                  style={{
                    top: top + 2,
                    height,
                    left: `${geometry.left}%`,
                    width: `calc(${geometry.width}% - 4px)`,
                    zIndex: dragging ? 30 : geometry.zIndex,
                  }}
                >
                  <div
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      if ((event.target as HTMLElement).closest("button")) return;
                      event.stopPropagation();
                      const grab = minutesAt(event.clientY) - start;
                      const drag = () =>
                        setDrag({ kind: "move", key: task.key, start, end, grab, moved: false });

                      if (event.pointerType === "mouse") {
                        drag();
                        return;
                      }

                      // На пальце задача берётся удержанием: короткий тап
                      // должен открывать её, а не таскать.
                      pendingRef.current = {
                        y: event.clientY,
                        anchor: start,
                        task: task.key,
                        timer: window.setTimeout(() => {
                          pendingRef.current = null;
                          touchDragRef.current = true;
                          navigator.vibrate?.(12);
                          drag();
                        }, LONG_PRESS_MS),
                      };
                    }}
                    className={`group relative flex h-full cursor-grab items-center gap-2 overflow-hidden rounded-xl border-l-[3px] px-2 shadow-sm active:cursor-grabbing ${taskTone(task)}`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggle(task)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        task.done ? "border-success bg-success text-white" : "border-line-strong bg-white"
                      }`}
                      aria-label="Изменить статус задачи"
                      aria-pressed={task.done}
                    >
                      {task.done && <Check size={12} />}
                    </button>

                    <div className={`min-w-0 flex-1 text-left ${compact ? "flex items-baseline gap-2" : ""}`}>
                      <p className={`truncate text-[13px] font-medium ${task.done ? "line-through" : ""}`}>
                        {task.title}
                      </p>
                      <p
                        className={`truncate font-mono text-[10px] text-ink-secondary ${compact ? "shrink-0" : ""}`}
                      >
                        {dragging
                          ? `${minutesToClock(liveStart)} – ${minutesToClock(liveEnd)}`
                          : formatTimeRange(task.time, task.endTime)}
                      </p>
                    </div>

                    {task.repeat && <Repeat2 size={12} className="shrink-0 text-ink-muted" />}

                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:text-accent md:opacity-0 md:group-hover:opacity-100"
                      aria-label="Редактировать задачу"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(task)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:text-danger md:opacity-0 md:group-hover:opacity-100"
                      aria-label="Удалить задачу"
                    >
                      <Trash2 size={13} />
                    </button>

                    <span
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setDrag({ kind: "resize", key: task.key, start, end, moved: false });
                      }}
                      className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize rounded-b-xl opacity-0 transition group-hover:bg-accent/25 group-hover:opacity-100"
                      aria-hidden
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {interaction?.kind === "create" && interaction.moved && (
            <div
              className="pointer-events-none absolute left-14 right-1 z-20 rounded-xl border-2 border-dashed border-accent bg-accent-soft"
              style={{
                top: yOf(interaction.start),
                height: Math.max(MIN_BLOCK_HEIGHT, ((interaction.end - interaction.start) / 60) * ROW_HEIGHT),
              }}
            >
              <span className="px-2 font-mono text-[11px] text-accent">
                {minutesToClock(interaction.start)} – {minutesToClock(interaction.end)}
              </span>
            </div>
          )}

          {draftTime !== null && draftMinutes !== null && (
            <div
              className="absolute left-14 right-1 z-20"
              style={{
                top: Math.min(yOf(draftMinutes) + 2, gridHeight - draftHeight + 2),
                height: Math.max(draftHeight, ROW_HEIGHT - 5),
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div className="flex h-full items-center gap-2 rounded-xl border border-accent bg-white px-2 shadow-md">
                <input
                  type="time"
                  value={draftTime}
                  onChange={(event) => {
                    // Черновик всегда интервал, поэтому конец едет за началом.
                    setDraftEnd(shiftedEnd(event.target.value, draftTime, draftEnd));
                    setDraftTime(event.target.value);
                  }}
                  className="h-7 w-[86px] shrink-0 rounded-lg border border-line-strong bg-surface-subtle px-1 text-[11px] outline-none"
                  aria-label="Начало задачи"
                />
                <span className="shrink-0 text-[11px] text-ink-muted">–</span>
                <input
                  type="time"
                  value={draftEnd}
                  onChange={(event) => setDraftEnd(event.target.value)}
                  className="h-7 w-[86px] shrink-0 rounded-lg border border-line-strong bg-surface-subtle px-1 text-[11px] outline-none"
                  aria-label="Конец задачи"
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
                    if (event.key === "Escape") {
                      event.stopPropagation();
                      setDraftTime(null);
                    }
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

          {isToday && nowMinutes >= windowStart * 60 && nowMinutes <= windowEnd * 60 && (
            <div
              className="pointer-events-none absolute left-0 right-0 z-20"
              style={{ top: yOf(nowMinutes) }}
            >
              <div className="relative border-t border-danger">
                <span className="absolute -top-[9px] left-0 rounded bg-danger px-1 font-mono text-[10px] font-medium leading-[18px] text-white">
                  {minutesToClock(nowMinutes)}
                </span>
              </div>
            </div>
          )}
        </div>

        {nightHidden && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-medium text-ink-muted transition hover:bg-surface-subtle hover:text-accent"
          >
            <ChevronDown size={12} />
            Показать ночь {String(dayEnd).padStart(2, "0")}:00 – 24:00
          </button>
        )}
      </div>
    </div>
  );
}
