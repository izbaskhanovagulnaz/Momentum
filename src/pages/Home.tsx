import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import QuickNote from "../components/QuickNote";
import { usePlanner } from "../PlannerContext";
import type { Currency, FinanceExpense, FinanceIncome, Task } from "../types";
import { localDate } from "../utils";

function money(value: number, currency: Currency = "UZS") {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "UZS" ? 0 : 2,
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(value);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

function toUzS(amount: number, currency: Currency, rates: Record<Currency, number>) {
  if (currency === "UZS") return amount;
  return (amount / Math.max(rates[currency], 0.000001)) * rates.UZS;
}

function operationAmount(
  item: FinanceIncome | FinanceExpense,
  rates: Record<Currency, number>,
) {
  return toUzS(item.amount, item.currency, rates);
}

function taskTimeValue(task: Task) {
  return task.time || "99:99";
}

export default function Home() {
  const {
    tasks,
    notes,
    salesPlan,
    finance,
    toggleTask,
    addTask,
    addNote,
    deleteNote,
  } = usePlanner();
  const { user } = useAuth();

  const today = localDate();
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const firstName = (user?.displayName || "Гульназ").trim().split(/\s+/)[0];
  const hour = now.getHours();
  const greeting =
    hour < 5
      ? "Доброй ночи"
      : hour < 12
        ? "Доброе утро"
        : hour < 18
          ? "Добрый день"
          : "Добрый вечер";

  const todayTasks = tasks
    .filter((task) => task.date === today)
    .sort((a, b) => taskTimeValue(a).localeCompare(taskTimeValue(b)));
  const doneToday = todayTasks.filter((task) => task.done).length;
  const openToday = todayTasks.length - doneToday;
  const taskProgress = todayTasks.length ? Math.round((doneToday / todayTasks.length) * 100) : 100;
  const nextTask =
    todayTasks.find((task) => !task.done && task.time && task.time >= nowTime) ||
    todayTasks.find((task) => !task.done);

  const activeIncomes = finance.incomes.filter((item) => item.status !== "cancelled");
  const activeExpenses = finance.expenses.filter((item) => item.status !== "cancelled");
  const actualBalance =
    activeIncomes
      .filter((item) => item.status !== "planned")
      .reduce((sum, item) => sum + operationAmount(item, finance.rates), 0) -
    activeExpenses
      .filter((item) => item.status !== "planned")
      .reduce((sum, item) => sum + operationAmount(item, finance.rates), 0);
  const futureIncomes = activeIncomes
    .filter((item) => item.date >= today && item.status === "planned")
    .sort((a, b) => a.date.localeCompare(b.date));
  const nearestIncomeDate = futureIncomes[0]?.date || "";
  const upcomingExpenses = activeExpenses.filter((item) =>
    nearestIncomeDate ? item.date <= nearestIncomeDate : item.date >= today,
  );
  const upcomingExpenseTotal = upcomingExpenses.reduce(
    (sum, item) => sum + operationAmount(item, finance.rates),
    0,
  );
  const upcomingIncomeTotal = futureIncomes.reduce(
    (sum, item) => sum + operationAmount(item, finance.rates),
    0,
  );
  const projectedBalance = actualBalance + upcomingIncomeTotal - upcomingExpenseTotal;

  const achievedSales = salesPlan.entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const salesProgress = salesPlan.targetAmount
    ? Math.min(100, Math.round((achievedSales / salesPlan.targetAmount) * 100))
    : 0;

  const quickAddTask = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    addTask({ title: trimmed, date: today, priority: "normal" });
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="neu-card min-w-0 p-6 md:p-8"
        >
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-[12px] font-medium text-accent">
            <Sparkles size={13} />
            <span className="capitalize">{formatDate(now)}</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="max-w-2xl text-[32px] font-semibold leading-[1.1] text-ink md:text-[44px]">
                {greeting}, {firstName}
              </h1>
              <p className="mt-3 text-[15px] text-ink-secondary">
                Сегодня {todayTasks.length} задач, открыто {openToday}
              </p>
            </div>
            <Link
              to="/tasks"
              className="neu-pill h-12 bg-accent px-5 text-white shadow-none hover:brightness-105"
            >
              <Plus size={17} />
              Задача
            </Link>
          </div>

          <div className="mt-8 max-w-3xl">
            <div className="mb-3 flex items-center justify-between text-[13px] text-ink-muted">
              <span>Прогресс дня</span>
              <span className="font-semibold text-ink">{taskProgress}%</span>
            </div>
            <div className="neu-flat h-3 overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${taskProgress}%` }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-accent to-mint"
              />
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="neu-flat p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium text-ink-muted">Следующее</p>
                <span className="neu-icon h-8 w-8 bg-sky-soft text-sky">
                  <Clock3 size={15} />
                </span>
              </div>
              {nextTask ? (
                <>
                  <p className="text-[20px] font-semibold leading-tight text-ink">
                    {nextTask.title}
                  </p>
                  <p className="mt-3 font-mono text-[13px] text-ink-secondary">
                    {nextTask.time || "без времени"}
                  </p>
                </>
              ) : (
                <p className="text-[20px] font-semibold leading-tight text-ink">
                  На сегодня всё спокойно
                </p>
              )}
            </div>

            <Link
              to="/finance?tab=sales"
              className="neu-card block bg-gradient-to-br from-accent to-[#9b8cff] p-5 text-white transition hover:brightness-105 active:scale-[0.98]"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium text-white/80">Продажи</p>
                <TrendingUp size={17} className="text-white/90" />
              </div>
              <p className="text-[26px] font-semibold">{salesProgress}%</p>
              <p className="mt-2 text-[13px] text-white/80">
                ${achievedSales.toLocaleString("en-US")} из ${salesPlan.targetAmount.toLocaleString("en-US")}
              </p>
            </Link>
          </div>
        </motion.div>

        <aside className="neu-card p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[13px] text-ink-muted">Финансовый прогноз</p>
              <p className="mt-2 text-[26px] font-semibold text-ink">{money(actualBalance)}</p>
            </div>
            <span className="neu-icon h-11 w-11 bg-success-soft text-success">
              <Wallet size={19} />
            </span>
          </div>

          <div className="neu-flat grid gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-ink-muted">
                {nearestIncomeDate ? `Расходы до ${shortDate(nearestIncomeDate)}` : "Расходы впереди"}
              </span>
              <strong className="text-[14px] text-danger">{money(upcomingExpenseTotal)}</strong>
            </div>
            <div className="flex items-center justify-between border-t border-line/70 pt-3">
              <span className="text-[13px] text-ink-muted">Ожидается</span>
              <strong className="text-[14px] text-success">{money(upcomingIncomeTotal)}</strong>
            </div>
            <div className="flex items-center justify-between border-t border-line/70 pt-3">
              <span className="text-[13px] text-ink-muted">Прогноз</span>
              <strong className={`text-[15px] ${projectedBalance < 0 ? "text-danger" : "text-ink"}`}>
                {money(projectedBalance)}
              </strong>
            </div>
          </div>

          <Link
            to="/finance"
            className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-accent"
          >
            Открыть финансы
            <ArrowRight size={15} />
          </Link>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="neu-card p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-ink-muted">Сегодня</p>
              <h2 className="text-[20px] font-semibold text-ink">План дня</h2>
            </div>
            <span className="neu-icon h-9 w-9 bg-peach-soft text-peach">
              <CalendarDays size={17} />
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {todayTasks.length === 0 && (
              <div className="neu-flat py-8 text-center text-[14px] text-ink-muted">На сегодня задач нет</div>
            )}
            {todayTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                className={`group flex min-h-[58px] items-center gap-4 rounded-2xl bg-surface-subtle px-4 py-3 transition ${
                  task.done ? "opacity-55" : "opacity-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${
                    task.done
                      ? "bg-success text-white"
                      : "bg-white text-transparent shadow-neu-sm hover:text-ink-muted"
                  }`}
                  aria-label={task.done ? "Вернуть задачу" : "Выполнить задачу"}
                >
                  <Check size={14} />
                </button>
                <span className="w-14 shrink-0 font-mono text-[12px] text-ink-muted">
                  {task.time || "--:--"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[15px] ${task.done ? "text-ink-muted line-through" : "text-ink"}`}>
                    {task.title}
                  </p>
                </div>
                {task.priority === "high" && !task.done && (
                  <span className="rounded-full bg-danger-soft px-2 py-1 text-[11px] font-medium text-danger">
                    высокий
                  </span>
                )}
              </motion.div>
            ))}
          </div>

          <QuickTaskInput onAdd={quickAddTask} />
        </div>

        <div className="space-y-6">
          <QuickNote notes={notes} onSave={addNote} onDelete={deleteNote} />
          <div className="neu-card p-5">
            <p className="text-[13px] text-ink-muted">Фокус</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">
              Главное сегодня: закрывать задачи по времени и держать финансы под контролем.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickTaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");

  const submit = () => {
    onAdd(value);
    setValue("");
  };

  return (
    <div className="neu-flat mt-4 flex min-h-14 items-center gap-3 px-4">
      <Plus size={18} className="text-ink-muted" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
        }}
        placeholder="Добавить задачу на сегодня"
        className="h-12 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
      />
      {value.trim() && (
        <button
          type="button"
          onClick={submit}
          className="neu-pill h-9 bg-accent px-3 text-[12px] text-white shadow-none"
        >
          Добавить
        </button>
      )}
    </div>
  );
}
