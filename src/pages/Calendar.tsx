import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Clock3, Edit3, Plus, Trash2 } from "lucide-react";
import TopBar from "../components/TopBar";
import { usePlanner } from "../PlannerContext";
import type { Task } from "../types";

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const mondayIndex = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export default function CalendarPage() {
  const { tasks, addTask, updateTask, toggleTask, deleteTask } = usePlanner();
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [visibleMonth, setVisibleMonth] = useState(() => toDate(localDate()));
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);

  const days = useMemo(() => buildMonth(visibleMonth), [visibleMonth]);

  const selectedTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.date === selectedDate)
        .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")),
    [tasks, selectedDate],
  );

  const taskCounts = useMemo(() => {
    const result = new Map<string, number>();
    for (const task of tasks) {
      result.set(task.date, (result.get(task.date) || 0) + 1);
    }
    return result;
  }, [tasks]);

  const monthLabel = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  const selectedLabel = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(toDate(selectedDate));

  const currentMonth = monthKey(visibleMonth);
  const today = localDate();

  const moveMonth = (delta: number) => {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };

  const goToday = () => {
    setVisibleMonth(toDate(today));
    setSelectedDate(today);
  };

  const selectDay = (day: Date) => {
    const value = localDate(day);
    setSelectedDate(value);

    if (monthKey(day) !== currentMonth) {
      setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  };

  const submit = () => {
    const value = title.trim();
    if (!value) return;

    addTask({
      title: value,
      date: selectedDate,
      time: time || undefined,
      priority: "normal",
    });

    setTitle("");
    setTime("");
  };

  const CalendarGrid = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div
        className={`grid grid-cols-7 text-center font-medium uppercase tracking-wider text-ink-muted ${
          mobile
            ? "mb-1 text-[10px]"
            : "border-b border-line-strong pb-2 text-[11px]"
        }`}
      >
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div
        className={`grid grid-cols-7 ${
          mobile ? "gap-y-1" : "mt-2 gap-1 md:gap-2"
        }`}
      >
        {days.map((day) => {
          const value = localDate(day);
          const selected = value === selectedDate;
          const isToday = value === today;
          const outside = monthKey(day) !== currentMonth;
          const count = taskCounts.get(value) || 0;

          return (
            <button
              key={value}
              type="button"
              onClick={() => selectDay(day)}
              className={
                mobile
                  ? `relative mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full text-[14px] transition active:scale-95 ${
                      selected
                        ? "bg-accent text-white shadow-sm"
                        : isToday
                          ? "font-semibold text-accent ring-1 ring-accent"
                          : "text-ink"
                    } ${outside && !selected ? "text-ink-muted/35" : ""}`
                  : `relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-2xl border text-[13px] transition md:min-h-16 ${
                      selected
                        ? "border-accent bg-accent text-white shadow-md"
                        : isToday
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-transparent hover:border-line-strong hover:bg-surface-subtle"
                    } ${outside && !selected ? "text-ink-muted/45" : ""}`
              }
            >
              <span className="font-medium">{day.getDate()}</span>

              {count > 0 && (
                <span
                  className={`flex items-center gap-0.5 ${
                    mobile ? "absolute bottom-1" : "mt-1"
                  } ${selected ? "text-white/90" : "text-accent"}`}
                >
                  {Array.from({ length: Math.min(count, 3) }, (_, index) => (
                    <i
                      key={index}
                      className="h-1 w-1 rounded-full bg-current"
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  const taskComposer = (
    <div className="rounded-2xl border border-line-strong bg-white p-3">
      <div className="flex items-center gap-2">
        <Plus size={18} className="shrink-0 text-accent" />
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Что запланировать?"
          className="h-10 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted"
        />
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-line pt-3">
        <Clock3 size={16} className="text-ink-muted" />
        <input
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface-subtle px-3 text-[12px] outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim()}
          className="rounded-xl bg-accent px-4 py-2 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Добавить
        </button>
      </div>
    </div>
  );

  const taskList =
    selectedTasks.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-line-strong bg-white/70 px-4 py-8 text-center text-[13px] text-ink-muted">
        На этот день задач нет
      </div>
    ) : (
      <div className="space-y-2">
        {selectedTasks.map((task) => (
          <div
            key={task.id}
            className="group flex items-center gap-3 rounded-2xl border border-line-strong bg-white px-3 py-3 shadow-sm"
          >
            <button
              type="button"
              onClick={() => toggleTask(task.id)}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                task.done
                  ? "border-success bg-success text-white"
                  : "border-line-strong bg-white"
              }`}
              aria-label="Изменить статус задачи"
            >
              {task.done && "✓"}
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`text-[14px] ${
                  task.done ? "text-ink-muted line-through" : "text-ink"
                }`}
              >
                {task.title}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
                {task.time || "Без времени"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setEditing({ ...task })}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-accent-soft hover:text-accent"
              aria-label="Редактировать задачу"
            >
              <Edit3 size={16} />
            </button>

            <button
              type="button"
              onClick={() => deleteTask(task.id)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-danger-soft hover:text-danger md:opacity-0 md:group-hover:opacity-100"
              aria-label="Удалить задачу"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    );

  return (
    <div>
      <TopBar eyebrow={selectedLabel} title="Календарь" />

      <div className="space-y-4 md:hidden">
        <section className="rounded-3xl border border-line-strong bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button type="button" onClick={goToday} className="text-left">
              <p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                Месяц
              </p>
              <h2 className="mt-1 capitalize text-[22px] font-semibold tracking-tight text-ink">
                {monthLabel}
              </h2>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-white"
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-white"
                aria-label="Следующий месяц"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <CalendarGrid mobile />

          <button
            type="button"
            onClick={goToday}
            className="mt-4 w-full rounded-xl bg-accent-soft py-2.5 text-[13px] font-medium text-accent"
          >
            Сегодня
          </button>
        </section>

        <section className="rounded-3xl border border-line-strong bg-surface-subtle p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                Выбранный день
              </p>
              <h3 className="mt-1 capitalize text-[19px] font-semibold text-ink">
                {selectedLabel}
              </h3>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[12px] font-medium text-ink-secondary shadow-sm">
              {selectedTasks.length}
            </span>
          </div>

          {taskComposer}
          <div className="mt-4">
            {taskList}
          </div>
        </section>
      </div>

      <div className="hidden gap-4 md:grid xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
        <section className="rounded-3xl border border-line-strong bg-white p-4 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] uppercase tracking-[0.12em] text-ink-muted">
                Месяц
              </p>
              <h2 className="mt-1 capitalize text-[24px] font-semibold tracking-tight text-ink">
                {monthLabel}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToday}
                className="rounded-xl border border-line-strong bg-white px-3 py-2 text-[12px] font-medium text-ink-secondary hover:bg-surface-subtle"
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-line-strong bg-white hover:bg-surface-subtle"
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-line-strong bg-white hover:bg-surface-subtle"
                aria-label="Следующий месяц"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <CalendarGrid />
        </section>

        <aside className="rounded-3xl border border-line-strong bg-surface-subtle p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] uppercase tracking-[0.12em] text-ink-muted">
                Выбранный день
              </p>
              <h3 className="mt-1 capitalize text-[20px] font-semibold text-ink">
                {selectedLabel}
              </h3>
            </div>
            <CalendarPlus size={22} className="text-accent" />
          </div>

          {taskComposer}

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-medium text-ink">Задачи дня</p>
              <span className="text-[12px] text-ink-muted">
                {selectedTasks.length}
              </span>
            </div>
            {taskList}
          </div>
        </aside>
      </div>
      {editing && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-line-strong bg-white p-5 shadow-2xl">
            <h3 className="text-[22px] font-semibold text-ink">Редактировать задачу</h3>
            <div className="mt-5 space-y-3">
              <input
                value={editing.title}
                onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                className="h-12 w-full rounded-2xl border border-line-strong px-4 outline-none focus:border-accent"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={editing.date}
                  onChange={(event) => setEditing({ ...editing, date: event.target.value })}
                  className="h-11 rounded-2xl border border-line-strong px-3 outline-none"
                />
                <input
                  type="time"
                  value={editing.time || ""}
                  onChange={(event) => setEditing({ ...editing, time: event.target.value })}
                  className="h-11 rounded-2xl border border-line-strong px-3 outline-none"
                />
              </div>
              <select
                value={editing.priority || "normal"}
                onChange={(event) => setEditing({ ...editing, priority: event.target.value as Task["priority"] })}
                className="h-11 w-full rounded-2xl border border-line-strong px-3 outline-none"
              >
                <option value="high">Высокий приоритет</option>
                <option value="normal">Средний приоритет</option>
                <option value="low">Низкий приоритет</option>
              </select>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setEditing(null)} className="h-11 flex-1 rounded-2xl border border-line-strong">Отмена</button>
              <button
                type="button"
                onClick={() => {
                  if (!editing.title.trim()) return;
                  updateTask(editing.id, {
                    title: editing.title.trim(),
                    date: editing.date,
                    time: editing.time || undefined,
                    priority: editing.priority || "normal",
                  });
                  setEditing(null);
                }}
                className="h-11 flex-1 rounded-2xl bg-accent font-medium text-white"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
