import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Edit3,
  CalendarRange,
  Flag,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import TopBar from "../components/TopBar";
import { usePlanner } from "../PlannerContext";
import type { Task } from "../types";
import { localDate } from "../utils";

type Filter = "all" | "open" | "done" | "today" | "urgent" | "overdue" | "week";
type Priority = NonNullable<Task["priority"]>;

function weekBounds() {
  const now = new Date(`${localDate()}T12:00:00`);
  const mondayOffset = (now.getDay() + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: localDate(start), end: localDate(end) };
}

const priorityMeta: Record<Priority, { label: string; className: string }> = {
  high: { label: "Высокий", className: "bg-danger-soft text-danger" },
  normal: { label: "Средний", className: "bg-accent-soft text-accent" },
  low: { label: "Низкий", className: "bg-success-soft text-success" },
};

export default function Tasks() {
  const { tasks, addTask, updateTask, toggleTask, deleteTask } = usePlanner();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(localDate());
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [editing, setEditing] = useState<Task | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const stats = useMemo(() => {
    const today = localDate();
    const { start, end } = weekBounds();
    const done = tasks.filter((task) => task.done).length;
    const urgent = tasks.filter((task) => !task.done && task.priority === "high").length;
    const todayCount = tasks.filter((task) => task.date === today).length;
    const overdue = tasks.filter((task) => !task.done && task.date < today).length;
    const week = tasks.filter((task) => task.date >= start && task.date <= end).length;
    return { total: tasks.length, done, urgent, today: todayCount, overdue, week };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tasks
      .filter((task) => {
        const today = localDate();
        const { start, end } = weekBounds();
        if (filter === "open" && task.done) return false;
        if (filter === "done" && !task.done) return false;
        if (filter === "today" && task.date !== today) return false;
        if (filter === "urgent" && (task.done || task.priority !== "high")) return false;
        if (filter === "overdue" && (task.done || task.date >= today)) return false;
        if (filter === "week" && (task.date < start || task.date > end)) return false;
        return !normalized || task.title.toLowerCase().includes(normalized);
      })
      .sort((a, b) => {
        if (a.done !== b.done) return Number(a.done) - Number(b.done);
        const weight = { high: 0, normal: 1, low: 2 } as const;
        const byPriority = weight[a.priority || "normal"] - weight[b.priority || "normal"];
        if (byPriority !== 0) return byPriority;
        return `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`);
      });
  }, [tasks, filter, query]);

  const submitTask = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    addTask({ title: trimmed, date, time: time || undefined, priority });
    setTitle("");
    setTime("");
    setPriority("normal");
    setComposerOpen(false);
  };

  const saveEditing = () => {
    if (!editing || !editing.title.trim()) return;
    updateTask(editing.id, {
      title: editing.title.trim(),
      date: editing.date,
      time: editing.time || undefined,
      priority: editing.priority || "normal",
    });
    setEditing(null);
  };

  return (
    <div>
      <TopBar eyebrow="План дня" title="Задачи" />

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-3 md:px-0 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { id: "all" as Filter, label: "Всего", value: stats.total, Icon: Circle, color: "text-ink-secondary" },
          { id: "today" as Filter, label: "Сегодня", value: stats.today, Icon: CalendarDays, color: "text-accent" },
          { id: "urgent" as Filter, label: "Срочные", value: stats.urgent, Icon: AlertTriangle, color: "text-danger" },
          { id: "done" as Filter, label: "Выполнено", value: stats.done, Icon: CheckCircle2, color: "text-success" },
          { id: "overdue" as Filter, label: "Просрочено", value: stats.overdue, Icon: Clock3, color: "text-danger" },
          { id: "week" as Filter, label: "На этой неделе", value: stats.week, Icon: CalendarRange, color: "text-accent" },
        ].map(({ id, label, value, Icon, color }) => {
          const active = filter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`min-w-[138px] rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:min-w-0 md:p-4 ${
                active
                  ? "border-accent bg-accent-soft ring-2 ring-accent/15"
                  : "border-line-strong bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-[12px] ${active ? "font-medium text-accent" : "text-ink-muted"}`}>{label}</p>
                <Icon size={17} className={color} />
              </div>
              <p className="mt-1.5 text-[22px] font-semibold tracking-tight text-ink md:mt-2 md:text-[26px]">{value}</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[14px] font-medium text-white shadow-sm md:hidden"
      >
        <Plus size={18} />
        Добавить задачу
      </button>

      <form
        onSubmit={submitTask}
        className="mb-4 hidden rounded-3xl border border-line-strong bg-surface-subtle p-5 shadow-sm md:block md:p-6"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_160px_130px_150px_auto]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Что нужно сделать?"
            className="h-11 rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-11 rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="h-11 rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent"
          >
            <option value="high">Высокий</option>
            <option value="normal">Средний</option>
            <option value="low">Низкий</option>
          </select>
          <button
            type="submit"
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-[14px] font-medium text-white"
          >
            <Plus size={17} />
            Добавить
          </button>
        </div>
      </form>


      <section className="rounded-3xl border border-line-strong bg-surface-subtle p-3 shadow-sm md:p-6">
        <div className="mb-3 flex flex-col gap-3 md:mb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["all", "open", "done"] as const).map((item) => (
              <button key={item} type="button" onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-[13px] ${filter === item ? "bg-white font-medium text-ink shadow-sm" : "text-ink-muted"}`}>
                {item === "all" ? "Все задачи" : item === "open" ? "Активные" : "Выполненные"}
              </button>
            ))}
            {!(["all", "open", "done"] as Filter[]).includes(filter) && (
              <span className="whitespace-nowrap rounded-xl bg-accent-soft px-4 py-2 text-[13px] font-medium text-accent">
                {filter === "today"
                  ? "Сегодня"
                  : filter === "urgent"
                    ? "Срочные"
                    : filter === "overdue"
                      ? "Просрочено"
                      : "На этой неделе"}
              </span>
            )}
          </div>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-white px-3">
            <Search size={16} className="text-ink-muted"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск задач" className="w-full bg-transparent text-[13px] outline-none lg:w-56"/>
          </label>
        </div>

        <div className="space-y-2">
          {visibleTasks.map((task) => {
            const meta = priorityMeta[task.priority || "normal"];
            return (
              <article key={task.id} className="group flex items-center gap-3 rounded-2xl border border-line-strong bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:p-4">
                <button type="button" onClick={() => toggleTask(task.id)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${task.done ? "border-success bg-success text-white" : "border-line-strong bg-white"}`}>{task.done && "✓"}</button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-[14px] font-medium ${task.done ? "text-ink-muted line-through" : "text-ink"}`}>{task.title}</p>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${meta.className}`}><Flag size={10} className="mr-1 inline"/>{meta.label}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-ink-muted">
                    <span className="inline-flex items-center gap-1"><CalendarDays size={12}/>{new Intl.DateTimeFormat("ru-RU", {day:"numeric", month:"short"}).format(new Date(`${task.date}T12:00:00`))}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 size={12}/>{task.time || "Без времени"}</span>
                  </div>
                </div>
                <button type="button" onClick={() => setEditing({...task})} className="rounded-xl p-2 text-ink-muted hover:bg-accent-soft hover:text-accent" aria-label="Редактировать"><Edit3 size={16}/></button>
                <button type="button" onClick={() => deleteTask(task.id)} className="rounded-xl p-2 text-ink-muted hover:bg-danger-soft hover:text-danger" aria-label="Удалить"><Trash2 size={16}/></button>
              </article>
            );
          })}
          {visibleTasks.length === 0 && <p className="py-12 text-center text-[14px] text-ink-muted">Задачи не найдены</p>}
        </div>
      </section>


      {composerOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end bg-black/35 backdrop-blur-sm md:hidden"
          onClick={() => setComposerOpen(false)}
        >
          <form
            onSubmit={submitTask}
            onClick={(event) => event.stopPropagation()}
            className="w-full rounded-t-[28px] border border-line-strong bg-white px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-3 shadow-2xl"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong" />

            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                  Новая задача
                </p>
                <h3 className="mt-1 text-[22px] font-semibold text-ink">
                  Что нужно сделать?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle text-ink-secondary"
                aria-label="Закрыть"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название задачи"
                className="h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[16px] outline-none focus:border-accent"
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="pl-1 text-[11px] text-ink-muted">Дата</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-line-strong bg-white px-3 text-[14px] outline-none focus:border-accent"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="pl-1 text-[11px] text-ink-muted">Время</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-line-strong bg-white px-3 text-[14px] outline-none focus:border-accent"
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="pl-1 text-[11px] text-ink-muted">Приоритет</span>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent"
                >
                  <option value="high">Высокий</option>
                  <option value="normal">Средний</option>
                  <option value="low">Низкий</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={!title.trim()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-medium text-white disabled:opacity-40"
              >
                <Plus size={18} />
                Добавить задачу
              </button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-line-strong bg-white p-5 shadow-2xl">
            <h3 className="text-[22px] font-semibold text-ink">Редактировать задачу</h3>
            <div className="mt-5 space-y-3">
              <input value={editing.title} onChange={(e)=>setEditing({...editing,title:e.target.value})} className="h-12 w-full rounded-2xl border border-line-strong px-4 outline-none focus:border-accent"/>
              <div className="grid grid-cols-2 gap-3"><input type="date" value={editing.date} onChange={(e)=>setEditing({...editing,date:e.target.value})} className="h-11 rounded-2xl border border-line-strong px-3 outline-none"/><input type="time" value={editing.time||""} onChange={(e)=>setEditing({...editing,time:e.target.value})} className="h-11 rounded-2xl border border-line-strong px-3 outline-none"/></div>
              <select value={editing.priority||"normal"} onChange={(e)=>setEditing({...editing,priority:e.target.value as Priority})} className="h-11 w-full rounded-2xl border border-line-strong px-3 outline-none"><option value="high">Высокий приоритет</option><option value="normal">Средний приоритет</option><option value="low">Низкий приоритет</option></select>
            </div>
            <div className="mt-5 flex gap-3"><button type="button" onClick={()=>setEditing(null)} className="h-11 flex-1 rounded-2xl border border-line-strong">Отмена</button><button type="button" onClick={saveEditing} className="h-11 flex-1 rounded-2xl bg-accent font-medium text-white">Сохранить</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
