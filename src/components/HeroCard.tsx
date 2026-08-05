import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import type { SaleEntry, SalesPlan } from "../types";

interface HeroCardProps {
  salesPlan: SalesPlan;
  onAddMonth: (targetAmount: number, startDate: string, monthStartDay?: number) => void;
  onSelectMonth: (monthId: string) => void;
  onUpdateTarget: (targetAmount: number, deadline: string, monthStartDay?: number) => void;
  onAddEntry: (source: string, amount: number, date: string) => void;
  onUpdateEntry: (id: string, source: string, amount: number, date: string) => void;
  onDeleteEntry: (id: string) => void;
}

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function dateValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function parseEntryDate(rawDate: string) {
  if (!rawDate) return "";
  const match = rawDate.match(/^\d{4}-\d{2}-\d{2}/);
  if (!match) return "";
  return match[0];
}

function clampMonthStartDay(value: number) {
  return Math.min(28, Math.max(1, Math.round(value)));
}

function salesPeriodFor(dateValueString: string, startDay: number) {
  const anchor = new Date(`${dateValueString}T12:00:00`);
  const safeStartDay = clampMonthStartDay(startDay || 1);
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), safeStartDay, 12);

  if (anchor.getDate() < safeStartDay) {
    start.setMonth(start.getMonth() - 1);
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);

  return {
    start: dateValue(start),
    end: dateValue(end),
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

export default function HeroCard({
  salesPlan,
  onAddMonth,
  onSelectMonth,
  onUpdateTarget,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}: HeroCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [addingMonth, setAddingMonth] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(localDate());
  const [target, setTarget] = useState(String(salesPlan.targetAmount));
  const [deadline, setDeadline] = useState(salesPlan.deadline);
  const [monthStartDay, setMonthStartDay] = useState(String(salesPlan.monthStartDay || 1));
  const [newMonthTarget, setNewMonthTarget] = useState(String(salesPlan.targetAmount));
  const [newMonthStartDate, setNewMonthStartDate] = useState(localDate());
  const [newMonthStartDay, setNewMonthStartDay] = useState(String(salesPlan.monthStartDay || 1));
  const [editSource, setEditSource] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState(localDate());

  const currentPeriod = useMemo(
    () => salesPeriodFor(localDate(), salesPlan.monthStartDay || 1),
    [salesPlan.monthStartDay],
  );

  const normalizedEntries = useMemo(
    () => salesPlan.entries.map((entry) => ({
      ...entry,
      normalizedDate: parseEntryDate(entry.date),
    })),
    [salesPlan.entries],
  );

  const currentEntries = useMemo(
    () => normalizedEntries.filter((entry) => {
      if (!entry.normalizedDate) return false;
      return entry.normalizedDate >= currentPeriod.start && entry.normalizedDate <= currentPeriod.end;
    }),
    [normalizedEntries, currentPeriod],
  );

  const invalidDateCount = useMemo(
    () => normalizedEntries.filter((entry) => !entry.normalizedDate).length,
    [normalizedEntries],
  );

  const entriesByDate = useMemo(
    () => [...currentEntries].sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return a.source.localeCompare(b.source, "ru");
    }),
    [currentEntries],
  );

  const achieved = useMemo(
    () => currentEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    [currentEntries],
  );
  const remaining = Math.max(0, salesPlan.targetAmount - achieved);
  const progress = salesPlan.targetAmount > 0 ? Math.min(1, achieved / salesPlan.targetAmount) : 0;
  const pct = Math.round(progress * 100);

  const createMonth = () => {
    const numericTarget = Number(newMonthTarget.replace(/\s/g, "").replace(",", "."));
    const numericMonthStartDay = clampMonthStartDay(Number(newMonthStartDay));
    if (!Number.isFinite(numericTarget) || numericTarget <= 0 || !newMonthStartDate) return;
    onAddMonth(numericTarget, newMonthStartDate, numericMonthStartDay);
    setAddingMonth(false);
    setEditingTarget(false);
    setShowEntries(false);
  };

  const submitEntry = () => {
    const numericAmount = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!source.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || !entryDate) return;
    onAddEntry(source, numericAmount, entryDate);
    setSource("");
    setAmount("");
    setEntryDate(localDate());
    setShowForm(false);
    setShowEntries(true);
  };

  const saveTarget = () => {
    const numericTarget = Number(target.replace(/\s/g, "").replace(",", "."));
    const numericMonthStartDay = clampMonthStartDay(Number(monthStartDay));
    if (!Number.isFinite(numericTarget) || numericTarget <= 0 || !deadline) return;
    onUpdateTarget(numericTarget, deadline, numericMonthStartDay);
    setEditingTarget(false);
  };

  const beginEdit = (entry: SaleEntry) => {
    setEditingEntryId(entry.id);
    setEditSource(entry.source);
    setEditAmount(String(entry.amount));
    setEditDate(entry.date);
  };

  const saveEntry = () => {
    if (!editingEntryId) return;
    const numericAmount = Number(editAmount.replace(/\s/g, "").replace(",", "."));
    if (!editSource.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || !editDate) return;
    onUpdateEntry(editingEntryId, editSource, numericAmount, editDate);
    setEditingEntryId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mb-4 rounded-3xl bg-surface-subtle p-6 md:p-8"
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-[13px] text-ink-muted">План продаж</p>
            <select
              value={salesPlan.activeMonthId}
              onChange={(event) => {
                onSelectMonth(event.target.value);
                setEditingTarget(false);
                setAddingMonth(false);
                setShowEntries(false);
              }}
              className="h-8 rounded-full border border-line bg-white px-3 text-[12px] font-medium text-ink-secondary outline-none"
              aria-label="Выбрать месяц продаж"
            >
              {salesPlan.months.map((month) => (
                <option key={month.id} value={month.id}>
                  {month.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setNewMonthTarget(String(salesPlan.targetAmount));
                setNewMonthStartDate(localDate());
                setNewMonthStartDay(String(salesPlan.monthStartDay || 1));
                setAddingMonth((value) => !value);
                setEditingTarget(false);
              }}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[12px] font-medium text-ink-secondary transition hover:bg-surface"
            >
              <Plus size={14} /> Новый месяц
            </button>
            <button
              type="button"
              onClick={() => {
                setTarget(String(salesPlan.targetAmount));
                setDeadline(salesPlan.deadline);
                setMonthStartDay(String(salesPlan.monthStartDay || 1));
                setEditingTarget((value) => !value);
                setAddingMonth(false);
              }}
              className="rounded-lg p-1 text-ink-muted transition hover:bg-white hover:text-ink"
              aria-label="Редактировать план продаж"
            >
              <Pencil size={14} />
            </button>
          </div>

          <h2 className="text-[22px] font-semibold leading-snug text-ink md:text-[26px]">
            {remaining > 0 ? `Осталось ${money(remaining)} до цели` : "План продаж выполнен"}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">
            Выполнено {money(achieved)} из {money(salesPlan.targetAmount)} · дедлайн {formatDate(salesPlan.deadline)}
          </p>
          <p className="mt-1 text-[12px] text-ink-muted">
            Период: {formatShortDate(currentPeriod.start)} - {formatShortDate(currentPeriod.end)} · месяц начинается {salesPlan.monthStartDay || 1}-го числа
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowForm((value) => !value)}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white transition hover:bg-ink/90"
            >
              <Plus size={15} /> Добавить сумму
            </button>
            <button
              type="button"
              onClick={() => setShowEntries((value) => !value)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-ink-secondary"
            >
              История ({currentEntries.length})
              {showEntries ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
          {invalidDateCount > 0 && (
            <p className="mt-2 text-[12px] text-warning">
              Есть {invalidDateCount} записей с некорректной датой в плане продаж. Проверьте формат: YYYY-MM-DD.
            </p>
          )}
        </div>

        <div className="relative shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={RADIUS} fill="none" stroke="#ececec" strokeWidth="6" />
            <motion.circle
              cx="36"
              cy="36"
              r={RADIUS}
              fill="none"
              stroke="#5b55ef"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              transform="rotate(-90 36 36)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[15px] font-semibold text-ink">{pct}%</span>
          </div>
        </div>
      </div>

      {addingMonth && (
        <div className="mt-5 grid gap-3 rounded-2xl bg-white p-4 md:grid-cols-[1fr_170px_150px_auto]">
          <label className="grid gap-1 text-[12px] text-ink-muted">
            Плановая сумма, $
            <input inputMode="decimal" value={newMonthTarget} onChange={(e) => setNewMonthTarget(e.target.value)} className="h-10 rounded-xl border border-line px-3 text-[14px] text-ink outline-none" />
          </label>
          <label className="grid gap-1 text-[12px] text-ink-muted">
            Месяц начинается
            <input type="date" value={newMonthStartDate} onChange={(e) => setNewMonthStartDate(e.target.value)} className="h-10 rounded-xl border border-line px-3 text-[14px] text-ink outline-none" />
          </label>
          <label className="grid gap-1 text-[12px] text-ink-muted">
            Старт месяца
            <input type="number" min="1" max="28" value={newMonthStartDay} onChange={(e) => setNewMonthStartDay(e.target.value)} className="h-10 rounded-xl border border-line px-3 text-[14px] text-ink outline-none" />
          </label>
          <button type="button" onClick={createMonth} className="self-end rounded-xl bg-primary px-4 py-3 text-[13px] font-medium text-white">Создать месяц</button>
        </div>
      )}

      {editingTarget && (
        <div className="mt-5 grid gap-3 rounded-2xl bg-white p-4 md:grid-cols-[1fr_150px_180px_auto]">
          <label className="grid gap-1 text-[12px] text-ink-muted">
            Плановая сумма, $
            <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} className="h-10 rounded-xl border border-line px-3 text-[14px] text-ink outline-none" />
          </label>
          <label className="grid gap-1 text-[12px] text-ink-muted">
            Старт месяца
            <input
              type="number"
              min="1"
              max="28"
              value={monthStartDay}
              onChange={(e) => {
                setMonthStartDay(e.target.value);
                const nextStartDay = clampMonthStartDay(Number(e.target.value));
                setDeadline(salesPeriodFor(localDate(), nextStartDay).end);
              }}
              className="h-10 rounded-xl border border-line px-3 text-[14px] text-ink outline-none"
            />
          </label>
          <label className="grid gap-1 text-[12px] text-ink-muted">
            Дедлайн
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-10 rounded-xl border border-line px-3 text-[14px] text-ink outline-none" />
          </label>
          <button type="button" onClick={saveTarget} className="self-end rounded-xl bg-primary px-4 py-3 text-[13px] font-medium text-white">Сохранить</button>
        </div>
      )}

      {showForm && (
        <div className="mt-5 grid gap-3 rounded-2xl bg-white p-4 md:grid-cols-[1fr_150px_170px_auto]">
          <label className="grid gap-1 text-[12px] text-ink-muted">
            Откуда поступила сумма
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Например: Нурали - VIP тариф" className="h-10 rounded-xl border border-line px-3 text-[14px] text-ink outline-none" />
          </label>
          <label className="grid gap-1 text-[12px] text-ink-muted">
            Сумма, $
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="4000" className="h-10 rounded-xl border border-line px-3 text-[14px] text-ink outline-none" />
          </label>
          <label className="grid gap-1 text-[12px] text-ink-muted">
            Дата поступления
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="h-10 rounded-xl border border-line px-3 text-[14px] text-ink outline-none" />
          </label>
          <button type="button" onClick={submitEntry} className="self-end rounded-xl bg-success px-4 py-3 text-[13px] font-medium text-white">Добавить</button>
        </div>
      )}

      {showEntries && (
        <div className="mt-5 overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[12px] font-medium text-ink-secondary">История поступлений</p>
            <span className="text-[11px] text-ink-muted">По дате - сначала новые</span>
          </div>
          <div className="divide-y divide-line px-4">
            {entriesByDate.length === 0 && <p className="py-5 text-center text-[13px] text-ink-muted">Поступлений пока нет</p>}
            {entriesByDate.map((entry) => {
              const editing = editingEntryId === entry.id;
              return (
                <div key={entry.id} className="py-3">
                  {!editing ? (
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-ink">{entry.source}</p>
                        <p className="mt-0.5 text-[11px] text-ink-muted">{formatDate(entry.normalizedDate)}</p>
                      </div>
                      <strong className="text-[14px] text-success">+{money(entry.amount)}</strong>
                      <button type="button" onClick={() => beginEdit(entry)} className="rounded-lg p-2 text-ink-muted hover:bg-surface-subtle hover:text-primary" aria-label="Редактировать поступление"><Pencil size={15} /></button>
                      <button type="button" onClick={() => onDeleteEntry(entry.id)} className="rounded-lg p-2 text-ink-muted hover:bg-surface-subtle hover:text-danger" aria-label="Удалить поступление"><Trash2 size={15} /></button>
                    </div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-[1fr_140px_170px_auto]">
                      <input value={editSource} onChange={(e) => setEditSource(e.target.value)} className="h-10 rounded-xl border border-line px-3 text-[13px] outline-none" aria-label="Источник поступления" />
                      <input inputMode="decimal" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="h-10 rounded-xl border border-line px-3 text-[13px] outline-none" aria-label="Сумма поступления" />
                      <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-10 rounded-xl border border-line px-3 text-[13px] outline-none" aria-label="Дата поступления" />
                      <div className="flex gap-1">
                        <button type="button" onClick={saveEntry} className="flex h-10 w-10 items-center justify-center rounded-xl bg-success text-white" aria-label="Сохранить"><Check size={16} /></button>
                        <button type="button" onClick={() => setEditingEntryId(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-subtle text-ink-muted" aria-label="Отмена"><X size={16} /></button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

