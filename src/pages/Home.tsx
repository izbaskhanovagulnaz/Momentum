import HeroCard from "../components/HeroCard";
import TaskCard from "../components/TaskCard";
import CalendarWidget from "../components/CalendarWidget";
import QuickNote from "../components/QuickNote";
import InsightCard from "../components/InsightCard";
import type { CalendarEvent } from "../types";
import { usePlanner } from "../PlannerContext";
import { useAuth } from "../AuthContext";

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export default function Home() {
  const {
    tasks,
    notes,
    salesPlan,
    toggleTask,
    deleteTask,
    addTask,
    addNote,
    deleteNote,
    addSalesMonth,
    selectSalesMonth,
    deleteSalesMonth,
    updateSalesTarget,
    addSaleEntry,
    updateSaleEntry,
    deleteSaleEntry,
  } = usePlanner();
  const { user } = useAuth();

  const today = localDate();
  const todayTasks = tasks
    .filter((task) => task.date === today)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  const events: CalendarEvent[] = todayTasks
    .filter((task) => task.time && !task.done)
    .map((task) => ({
      id: task.id,
      title: task.title,
      time: task.time || "",
      type: "task",
    }));

  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  const hour = now.getHours();
  const greeting = hour < 5
    ? "Доброй ночи"
    : hour < 12
      ? "Доброе утро"
      : hour < 18
        ? "Добрый день"
        : "Добрый вечер";
  const firstName = (user?.displayName || "Гульназ").trim().split(/\s+/)[0];

  return (
    <div>
      <p className="mb-1 text-[13px] capitalize text-ink-muted">{dateLabel}</p>
      <h1 className="mb-8 text-[26px] font-semibold tracking-tight text-ink md:text-[30px]">
        {greeting}, {firstName}
      </h1>

      <HeroCard
        salesPlan={salesPlan}
        onAddMonth={addSalesMonth}
        onSelectMonth={selectSalesMonth}
        onDeleteMonth={deleteSalesMonth}
        onUpdateTarget={updateSalesTarget}
        onAddEntry={addSaleEntry}
        onUpdateEntry={updateSaleEntry}
        onDeleteEntry={deleteSaleEntry}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TaskCard
          title="Сегодня"
          tasks={todayTasks}
          selectedDate={today}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onAdd={(input) => addTask({ ...input, priority: "normal" })}
        />
        <CalendarWidget events={events} mode="compact" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <QuickNote notes={notes} onSave={addNote} onDelete={deleteNote} />
        <InsightCard message="Ты закрываешь сделки быстрее, когда звонишь тёплым лидам до полудня. Сегодня утром это ещё не сделано." />
      </div>
    </div>
  );
}
