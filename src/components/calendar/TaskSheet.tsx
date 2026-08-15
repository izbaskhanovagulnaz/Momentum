import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { TaskCategory } from "../../types";
import { timeToMinutes } from "../../utils";
import { formatDuration, longDayLabel, minutesToClock, shiftedEnd } from "../../calendar/dates";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "../../calendar/occurrences";

export interface TaskSheetDraft {
  start: string;
  end: string;
  /**
   * Открыть клавиатуру сразу. Ставится, когда лист вызван кнопкой «Что
   * запланировать?» — там печатать это следующее действие. После жеста по
   * часам клавиатура только закрыла бы поля времени и длительности.
   */
  focusTitle?: boolean;
}

interface TaskSheetProps {
  date: string;
  draft: TaskSheetDraft;
  onSubmit: (input: { title: string; time?: string; endTime?: string; category?: TaskCategory }) => void;
  onClose: () => void;
}

const DURATIONS = [15, 30, 60, 90, 120];

/**
 * Лист создания задачи для телефона. На узком экране встроенный редактор
 * внутри часов не помещается, поэтому время выбирается здесь — крупными
 * полями и готовыми длительностями.
 */
export default function TaskSheet({ date, draft, onSubmit, onClose }: TaskSheetProps) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(draft.start);
  const [end, setEnd] = useState(draft.end);
  const [category, setCategory] = useState<TaskCategory | "">("");
  const [allDay, setAllDay] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  const duration = startMinutes !== null && endMinutes !== null ? endMinutes - startMinutes : 0;
  const rangeValid = duration > 0;

  const submit = () => {
    const value = title.trim();
    if (!value) return;

    onSubmit({
      title: value,
      time: allDay ? undefined : start,
      endTime: allDay || !rangeValid ? undefined : end,
      category: category || undefined,
    });
    onClose();
  };

  const setDuration = (minutes: number) => {
    if (startMinutes === null) return;
    setEnd(minutesToClock(Math.min(startMinutes + minutes, 24 * 60 - 1)));
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Закрыть" />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full max-w-lg rounded-t-3xl border border-line-strong bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />

        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">Новая задача</p>
            <p className="mt-0.5 truncate text-[15px] font-semibold capitalize text-ink">
              {longDayLabel(date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-subtle"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <input
          autoFocus={draft.focusTitle}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="Что запланировать?"
          className="h-12 w-full rounded-2xl border border-line-strong px-4 text-[16px] text-ink outline-none focus:border-accent"
        />

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAllDay((value) => !value)}
            aria-pressed={allDay}
            className={`h-11 shrink-0 rounded-2xl border px-3 text-[13px] font-medium transition ${
              allDay ? "border-accent bg-accent-soft text-accent" : "border-line-strong text-ink-secondary"
            }`}
          >
            Весь день
          </button>

          {!allDay && (
            <>
              <input
                type="time"
                value={start}
                onChange={(event) => {
                  setEnd(shiftedEnd(event.target.value, start, end));
                  setStart(event.target.value);
                }}
                className="h-11 min-w-0 flex-1 rounded-2xl border border-line-strong bg-surface-subtle px-3 text-center text-[16px] tabular-nums outline-none"
                aria-label="Начало задачи"
              />
              <span className="shrink-0 text-[13px] text-ink-muted">–</span>
              <input
                type="time"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                className={`h-11 min-w-0 flex-1 rounded-2xl border bg-surface-subtle px-3 text-center text-[16px] tabular-nums outline-none ${
                  rangeValid ? "border-line-strong" : "border-danger"
                }`}
                aria-label="Конец задачи"
              />
            </>
          )}
        </div>

        {!allDay && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {DURATIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setDuration(minutes)}
                className={`h-9 shrink-0 rounded-xl border px-3 text-[12.5px] font-medium transition ${
                  duration === minutes
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line-strong text-ink-secondary"
                }`}
              >
                {formatDuration(minutes)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={`h-9 shrink-0 rounded-xl border px-3 text-[12.5px] transition ${
              category === "" ? "border-accent bg-accent-soft text-accent" : "border-line-strong text-ink-secondary"
            }`}
          >
            Без категории
          </button>
          {(Object.keys(CATEGORY_LABELS) as TaskCategory[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[12.5px] transition ${
                category === key
                  ? `border-current ${CATEGORY_COLORS[key].chip} ${CATEGORY_COLORS[key].text}`
                  : "border-line-strong text-ink-secondary"
              }`}
            >
              <i className={`h-2 w-2 rounded-full ${CATEGORY_COLORS[key].dot}`} />
              {CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!title.trim()}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          <Check size={18} />
          Добавить
          {!allDay && rangeValid && (
            <span className="font-mono text-[13px] opacity-80">
              {start}–{end}
            </span>
          )}
        </button>
      </motion.div>
    </div>
  );
}
