import { useMemo, useState } from "react";
import { CalendarDays, Clock3, Plus } from "lucide-react";
import type { Task } from "../types";
import TaskItem from "./TaskItem";

interface TaskCardProps {
  title: string;
  tasks: Task[];
  selectedDate: string;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onAdd: (input: { title: string; date: string; time?: string }) => void;
}

export default function TaskCard({ title, tasks, selectedDate, onToggle, onDelete, onAdd }: TaskCardProps) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState("");
  const [expanded, setExpanded] = useState(false);
  const doneCount = tasks.filter((task) => task.done).length;

  const dateLabel = useMemo(() => new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`)), [date]);

  const submit = () => {
    const titleValue = value.trim();
    if (!titleValue) return;
    onAdd({ title: titleValue, date, time: time || undefined });
    setValue("");
    setTime("");
    setDate(selectedDate);
    setExpanded(false);
  };

  return (
    <div className="rounded-3xl border border-line-strong bg-surface-subtle p-6 shadow-sm md:p-7">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[13px] text-ink-muted">{title}</p>
        <span className="text-[12px] text-ink-muted">
          {doneCount} из {tasks.length}
        </span>
      </div>

      {tasks.length > 0 && (
        <div className="divide-y divide-line">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </div>
      )}

      <div className={`${tasks.length ? "mt-3 border-t border-line pt-3" : "mt-4"}`}>
        <div className="flex min-h-12 items-center gap-3 rounded-2xl px-1 transition-colors focus-within:bg-white/70 md:min-h-11">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary md:h-7 md:w-7">
            <Plus size={19} strokeWidth={1.8} />
          </span>
          <input
            value={value}
            onFocus={() => setExpanded(true)}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            className="h-12 min-w-0 flex-1 border-0 bg-transparent px-0 text-[14px] text-ink outline-none placeholder:text-ink-muted/80 md:h-11"
            placeholder="Что нужно сделать?"
            aria-label="Добавить задачу"
            autoComplete="off"
          />
          {value.trim() && (
            <button
              type="button"
              onClick={submit}
              className="shrink-0 rounded-xl bg-primary px-3 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Добавить
            </button>
          )}
        </div>

        {expanded && (
          <div className="mt-2 flex flex-wrap items-center gap-2 pl-11">
            <label className="flex h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[12px] text-ink-secondary">
              <CalendarDays size={15} />
              <span className="sr-only">Дата задачи</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="max-w-[128px] bg-transparent outline-none"
              />
            </label>
            <label className="flex h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[12px] text-ink-secondary">
              <Clock3 size={15} />
              <span className="sr-only">Время задачи</span>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="bg-transparent outline-none"
              />
            </label>
            <span className="text-[11px] text-ink-muted">Покажется {dateLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
