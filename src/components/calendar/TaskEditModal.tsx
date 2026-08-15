import { useEffect, useState } from "react";
import { Repeat2, Trash2, X } from "lucide-react";
import type { Task, TaskCategory, TaskOccurrence, TaskRepeat } from "../../types";
import { timeToMinutes } from "../../utils";
import { shiftedEnd } from "../../calendar/dates";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  REPEAT_LABELS,
} from "../../calendar/occurrences";

interface TaskEditModalProps {
  occurrence: TaskOccurrence;
  onSave: (patch: Partial<Omit<Task, "id">>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const PRIORITIES: { value: NonNullable<Task["priority"]>; label: string; tone: string }[] = [
  { value: "high", label: "Высокий", tone: "bg-danger-soft text-danger border-danger" },
  { value: "normal", label: "Средний", tone: "bg-accent-soft text-accent border-accent" },
  { value: "low", label: "Низкий", tone: "bg-sky-soft text-sky border-sky" },
];

export default function TaskEditModal({ occurrence, onSave, onDelete, onClose }: TaskEditModalProps) {
  const [title, setTitle] = useState(occurrence.title);
  // У серии редактируется её начало, иначе сохранение одного вхождения
  // сдвинуло бы всю серию на его дату.
  const [date, setDate] = useState(occurrence.virtual ? occurrence.seriesStart : occurrence.date);
  const [time, setTime] = useState(occurrence.time || "");
  const [endTime, setEndTime] = useState(occurrence.endTime || "");
  const [priority, setPriority] = useState<NonNullable<Task["priority"]>>(occurrence.priority || "normal");
  const [category, setCategory] = useState<TaskCategory | "">(occurrence.category || "");
  const [repeat, setRepeat] = useState<TaskRepeat | "">(occurrence.repeat || "");
  const [repeatUntil, setRepeatUntil] = useState(occurrence.repeatUntil || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const start = timeToMinutes(time);
  const end = timeToMinutes(endTime);
  const endInvalid = Boolean(endTime) && (start === null || end === null || end <= start);
  const series = Boolean(occurrence.repeat);

  const save = () => {
    const value = title.trim();
    if (!value) return;

    onSave({
      title: value,
      date,
      time: time || undefined,
      endTime: endInvalid || !endTime ? undefined : endTime,
      priority,
      category: category || undefined,
      repeat: repeat || undefined,
      repeatUntil: repeat && repeatUntil ? repeatUntil : undefined,
      // Снятый повтор уносит с собой историю вхождений.
      repeatDone: repeat ? occurrence.repeatDone : undefined,
      repeatSkip: repeat ? occurrence.repeatSkip : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-line-strong bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[21px] font-semibold text-ink">Редактировать задачу</h3>
            {series && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
                <Repeat2 size={12} />
                Изменения применятся ко всей серии
              </p>
            )}
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

        <div className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
            }}
            placeholder="Название задачи"
            className="h-12 w-full rounded-2xl border border-line-strong px-4 text-[15px] outline-none focus:border-accent"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-[12px] text-ink-muted">
              {series ? "Начало серии" : "Дата"}
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-line-strong px-3 outline-none"
              />
            </label>
            <label className="text-[12px] text-ink-muted">
              С
              <input
                type="time"
                value={time}
                onChange={(event) => {
                  // Конец задан — значит это интервал, и он переезжает целиком.
                  if (endTime) setEndTime(shiftedEnd(event.target.value, time, endTime));
                  setTime(event.target.value);
                }}
                className="mt-1 h-11 w-full rounded-2xl border border-line-strong px-3 outline-none"
              />
            </label>
            <label className="text-[12px] text-ink-muted">
              До
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className={`mt-1 h-11 w-full rounded-2xl border px-3 outline-none ${
                  endInvalid ? "border-danger" : "border-line-strong"
                }`}
              />
            </label>
          </div>

          <div>
            <p className="mb-1.5 text-[12px] text-ink-muted">Приоритет</p>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPriority(item.value)}
                  className={`h-10 rounded-xl border text-[12.5px] font-medium transition ${
                    priority === item.value ? item.tone : "border-line-strong text-ink-secondary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[12px] text-ink-muted">Категория</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory("")}
                className={`h-9 rounded-xl border px-3 text-[12.5px] transition ${
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
                  className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12.5px] transition ${
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
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] text-ink-muted">
              <Repeat2 size={13} />
              Повтор
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRepeat("")}
                className={`h-9 rounded-xl border px-3 text-[12.5px] transition ${
                  repeat === "" ? "border-accent bg-accent-soft text-accent" : "border-line-strong text-ink-secondary"
                }`}
              >
                Не повторять
              </button>
              {(Object.keys(REPEAT_LABELS) as TaskRepeat[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRepeat(key)}
                  className={`h-9 rounded-xl border px-3 text-[12.5px] transition ${
                    repeat === key
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line-strong text-ink-secondary"
                  }`}
                >
                  {REPEAT_LABELS[key]}
                </button>
              ))}
            </div>

            {repeat && (
              <label className="mt-2 block text-[12px] text-ink-muted">
                Повторять до (необязательно)
                <input
                  type="date"
                  value={repeatUntil}
                  min={date}
                  onChange={(event) => setRepeatUntil(event.target.value)}
                  className="mt-1 h-11 w-full rounded-2xl border border-line-strong px-3 outline-none"
                />
              </label>
            )}
          </div>

          {endInvalid && (
            <p className="text-[11px] text-danger">
              Конец должен быть позже начала — иначе задача сохранится без интервала.
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3">
          {confirmDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="h-11 flex-1 rounded-2xl bg-danger text-[13px] font-medium text-white"
            >
              Точно удалить{occurrence.virtual ? " это вхождение" : ""}?
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line-strong text-ink-muted transition hover:border-danger hover:bg-danger-soft hover:text-danger"
                aria-label="Удалить задачу"
              >
                <Trash2 size={17} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 rounded-2xl border border-line-strong text-[14px]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!title.trim()}
                className="h-11 flex-1 rounded-2xl bg-accent text-[14px] font-medium text-white disabled:opacity-40"
              >
                Сохранить
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
