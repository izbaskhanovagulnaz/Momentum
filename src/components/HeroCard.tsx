import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import type { SaleEntry, SalesPlan } from "../types";
import { clampMonthStartDay, localDate, salesPeriodFor } from "../utils";

interface HeroCardProps {
  salesPlan: SalesPlan;
  onAddMonth: (targetAmount: number, startDate: string, endDate: string) => void;
  onSelectMonth: (monthId: string) => void;
  onDeleteMonth: (monthId: string) => void;
  onUpdateMonth: (monthId: string, targetAmount: number, startDate: string, endDate: string) => void;
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

function parseEntryDate(rawDate: string) {
  if (!rawDate) return "";
  const match = rawDate.match(/^\d{4}-\d{2}-\d{2}/);
  if (!match) return "";
  return match[0];
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
  onDeleteMonth,
  onUpdateMonth,
  onUpdateTarget,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}: HeroCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [addingMonth, setAddingMonth] = useState(false);
  const [editingMonthId, setEditingMonthId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(localDate());
  const [target, setTarget] = useState(String(salesPlan.targetAmount));
  const [deadline, setDeadline] = useState(salesPlan.deadline);
  const [monthStartDay, setMonthStartDay] = useState(String(salesPlan.monthStartDay || 1));
  const [newMonthTarget, setNewMonthTarget] = useState(String(salesPlan.targetAmount));
  const [newMonthStartDate, setNewMonthStartDate] = useState(localDate());
  const [newMonthEndDate, setNewMonthEndDate] = useState(salesPeriodFor(localDate(), 1).end);
  const [editMonthTarget, setEditMonthTarget] = useState("");
  const [editMonthStartDate, setEditMonthStartDate] = useState("");
  const [editMonthEndDate, setEditMonthEndDate] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState(localDate());

  const currentPeriod = useMemo(
    () => ({
      start: salesPlan.startDate || salesPeriodFor(localDate(), salesPlan.monthStartDay || 1).start,
      end: salesPlan.deadline,
    }),
    [salesPlan.startDate, salesPlan.deadline, salesPlan.monthStartDay],
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
  const monthSummaries = useMemo(
    () => salesPlan.months.map((month) => {
      const total = month.entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      const monthProgress = month.targetAmount > 0 ? Math.min(100, Math.round((total / month.targetAmount) * 100)) : 0;

      return {
        ...month,
        total,
        progress: monthProgress,
      };
    }),
    [salesPlan.months],
  );
  const remaining = Math.max(0, salesPlan.targetAmount - achieved);
  const progress = salesPlan.targetAmount > 0 ? Math.min(1, achieved / salesPlan.targetAmount) : 0;
  const pct = Math.round(progress * 100);

  const createMonth = () => {
    const numericTarget = Number(newMonthTarget.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(numericTarget) || numericTarget <= 0 || !newMonthStartDate || !newMonthEndDate || newMonthEndDate < newMonthStartDate) return;
    onAddMonth(numericTarget, newMonthStartDate, newMonthEndDate);
    setAddingMonth(false);
    setEditingTarget(false);
    setShowEntries(false);
  };

  const beginMonthEdit = (monthId: string) => {
    const month = salesPlan.months.find((item) => item.id === monthId);
    if (!month) return;
    setEditingMonthId(month.id);
    setEditMonthTarget(String(month.targetAmount));
    setEditMonthStartDate(month.startDate);
    setEditMonthEndDate(month.deadline);
    setAddingMonth(false);
    setEditingTarget(false);
  };

  const saveMonthEdit = () => {
    if (!editingMonthId) return;
    const numericTarget = Number(editMonthTarget.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(numericTarget) || numericTarget <= 0 || !editMonthStartDate || !editMonthEndDate || editMonthEndDate < editMonthStartDate) return;
    onUpdateMonth(editingMonthId, numericTarget, editMonthStartDate, editMonthEndDate);
    setEditingMonthId(null);
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
      className="neu-card mb-4 p-6 md:p-8"
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
                setEditingMonthId(null);
                setShowEntries(false);
                setShowAllMonths(false);
              }}
              className="neu-input h-8 bg-surface-subtle px-3 text-[12px] font-medium text-ink-secondary"
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
                setNewMonthEndDate(salesPeriodFor(localDate(), 1).end);
                setAddingMonth((value) => !value);
                setEditingTarget(false);
                setEditingMonthId(null);
              }}
              className="neu-pill h-8 bg-surface-subtle px-3 text-[12px] font-medium text-ink-secondary hover:text-ink"
            >
              <Plus size={14} /> Создать план на месяц
            </button>
            <button
              type="button"
              onClick={() => {
                setTarget(String(salesPlan.targetAmount));
                setDeadline(salesPlan.deadline);
                setMonthStartDay(String(salesPlan.monthStartDay || 1));
                setEditingTarget((value) => !value);
                setAddingMonth(false);
                setEditingMonthId(null);
              }}
              className="rounded-xl p-1.5 text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
              aria-label="Редактировать план продаж"
            >
              <Pencil size={14} />
            </button>
          </div>

          <h2 className="text-[22px] font-semibold leading-snug text-ink md:text-[26px]">
            {remaining > 0 ? `Осталось ${money(remaining)} до цели` : "План продаж выполнен"}
          </h2>
          <p className="mt-1 text-[12px] text-ink-muted">
            Период: {formatShortDate(currentPeriod.start)} - {formatShortDate(currentPeriod.end)}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">
            Выполнено {money(achieved)} из {money(salesPlan.targetAmount)}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowForm((value) => !value)}
              className="neu-pill bg-accent px-4 py-2 text-white shadow-none hover:brightness-105"
            >
              <Plus size={15} /> Добавить сумму
            </button>
            <button
              type="button"
              onClick={() => setShowEntries((value) => !value)}
              className="neu-pill bg-surface-subtle px-4 py-2 text-ink-secondary hover:text-ink"
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

        <div className="neu-icon relative h-[88px] w-[88px] shrink-0 bg-white">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={RADIUS} fill="none" stroke="#e6e4f4" strokeWidth="6" />
            <motion.circle
              cx="36"
              cy="36"
              r={RADIUS}
              fill="none"
              stroke="#6f5cf6"
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
        <div className="neu-flat mt-5 p-4">
          <div className="mb-4">
            <p className="text-[15px] font-semibold text-ink">Новый план продаж</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">Выберите промежуток и цель. Старые месяцы останутся отдельно.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_170px_170px_auto]">
            <label className="grid gap-1.5 text-[12px] text-ink-muted">
              Цель на этот месяц, $
              <input inputMode="decimal" value={newMonthTarget} onChange={(e) => setNewMonthTarget(e.target.value)} className="neu-input h-10 bg-white text-[14px]" />
            </label>
            <label className="grid gap-1.5 text-[12px] text-ink-muted">
              Начало периода
              <input type="date" value={newMonthStartDate} onChange={(e) => setNewMonthStartDate(e.target.value)} className="neu-input h-10 bg-white text-[14px]" />
            </label>
            <label className="grid gap-1.5 text-[12px] text-ink-muted">
              Конец периода
              <input type="date" value={newMonthEndDate} onChange={(e) => setNewMonthEndDate(e.target.value)} className="neu-input h-10 bg-white text-[14px]" />
            </label>
            <button type="button" onClick={createMonth} className="neu-pill self-end bg-accent px-4 py-3 text-white shadow-none hover:brightness-105">Сохранить план</button>
          </div>
        </div>
      )}

      <div className="neu-flat mt-5 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-ink">
            {showAllMonths ? "Все периоды" : "Текущий период"}
          </p>
          {monthSummaries.length > 1 && (
            <button
              type="button"
              onClick={() => setShowAllMonths((value) => !value)}
              className="neu-pill h-8 bg-white px-3 text-[11px] font-medium text-ink-secondary hover:text-ink"
            >
              {showAllMonths ? "Скрыть остальные" : `Показать все (${monthSummaries.length})`}
              {showAllMonths ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
        <div className="grid gap-2">
          {(showAllMonths
            ? monthSummaries
            : monthSummaries.filter((month) => month.id === salesPlan.activeMonthId)
          ).map((month) => {
            const selected = month.id === salesPlan.activeMonthId;
            return (
              <div key={month.id} className={`flex flex-wrap items-center gap-3 rounded-2xl px-3 py-3 transition ${selected ? "bg-accent-soft" : "bg-white"}`}>
                <button
                  type="button"
                  onClick={() => onSelectMonth(month.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-[13px] font-medium text-ink">{month.label}</p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {formatShortDate(month.startDate)} - {formatShortDate(month.deadline)}
                  </p>
                </button>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-ink">{money(month.total)} / {money(month.targetAmount)}</p>
                  <p className="text-[11px] text-ink-muted">{month.progress}%</p>
                </div>
                {salesPlan.months.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteMonth(month.id)}
                    className="rounded-xl p-2 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
                    aria-label="Удалить месяц"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => beginMonthEdit(month.id)}
                  className="rounded-xl p-2 text-ink-muted transition hover:bg-accent-soft hover:text-accent"
                  aria-label="Редактировать месяц"
                >
                  <Pencil size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {editingMonthId && (
        <div className="neu-flat mt-5 p-4">
          <div className="mb-4">
            <p className="text-[15px] font-semibold text-ink">Редактировать месяц</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">Измените цель или промежуток и нажмите Сохранить.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_170px_170px_auto]">
            <label className="grid gap-1.5 text-[12px] text-ink-muted">
              Цель на этот месяц, $
              <input inputMode="decimal" value={editMonthTarget} onChange={(e) => setEditMonthTarget(e.target.value)} className="neu-input h-10 bg-white text-[14px]" />
            </label>
            <label className="grid gap-1.5 text-[12px] text-ink-muted">
              Начало периода
              <input type="date" value={editMonthStartDate} onChange={(e) => setEditMonthStartDate(e.target.value)} className="neu-input h-10 bg-white text-[14px]" />
            </label>
            <label className="grid gap-1.5 text-[12px] text-ink-muted">
              Конец периода
              <input type="date" value={editMonthEndDate} onChange={(e) => setEditMonthEndDate(e.target.value)} className="neu-input h-10 bg-white text-[14px]" />
            </label>
            <div className="flex gap-2 self-end">
              <button type="button" onClick={saveMonthEdit} className="neu-pill bg-accent px-4 py-3 text-white shadow-none hover:brightness-105">Сохранить</button>
              <button type="button" onClick={() => setEditingMonthId(null)} className="neu-pill bg-surface-subtle px-4 py-3 text-ink-secondary shadow-none">Отмена</button>
            </div>
          </div>
        </div>
      )}

      {editingTarget && (
        <div className="neu-flat mt-5 grid gap-3 p-4 md:grid-cols-[1fr_150px_180px_auto]">
          <label className="grid gap-1.5 text-[12px] text-ink-muted">
            Плановая сумма, $
            <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} className="neu-input h-10 bg-white text-[14px]" />
          </label>
          <label className="grid gap-1.5 text-[12px] text-ink-muted">
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
              className="neu-input h-10 bg-white text-[14px]"
            />
          </label>
          <label className="grid gap-1.5 text-[12px] text-ink-muted">
            Дедлайн
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="neu-input h-10 bg-white text-[14px]" />
          </label>
          <button type="button" onClick={saveTarget} className="neu-pill self-end bg-accent px-4 py-3 text-white shadow-none hover:brightness-105">Сохранить</button>
        </div>
      )}

      {showForm && (
        <div className="neu-flat mt-5 grid gap-3 p-4 md:grid-cols-[1fr_150px_170px_auto]">
          <label className="grid gap-1.5 text-[12px] text-ink-muted">
            Откуда поступила сумма
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Например: Нурали - VIP тариф" className="neu-input h-10 bg-white text-[14px]" />
          </label>
          <label className="grid gap-1.5 text-[12px] text-ink-muted">
            Сумма, $
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="4000" className="neu-input h-10 bg-white text-[14px]" />
          </label>
          <label className="grid gap-1.5 text-[12px] text-ink-muted">
            Дата поступления
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="neu-input h-10 bg-white text-[14px]" />
          </label>
          <button type="button" onClick={submitEntry} className="neu-pill self-end bg-success px-4 py-3 text-white shadow-none hover:brightness-105">Добавить</button>
        </div>
      )}

      {showEntries && (
        <div className="neu-flat mt-5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[12px] font-medium text-ink-secondary">История поступлений</p>
            <span className="text-[11px] text-ink-muted">По дате - сначала новые</span>
          </div>
          <div className="flex flex-col gap-2 px-4 pb-4">
            {entriesByDate.length === 0 && <p className="py-5 text-center text-[13px] text-ink-muted">Поступлений пока нет</p>}
            {entriesByDate.map((entry) => {
              const editing = editingEntryId === entry.id;
              return (
                <div key={entry.id} className="rounded-2xl bg-white px-3 py-3">
                  {!editing ? (
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-ink">{entry.source}</p>
                        <p className="mt-0.5 text-[11px] text-ink-muted">{formatDate(entry.normalizedDate)}</p>
                      </div>
                      <strong className="text-[14px] text-success">+{money(entry.amount)}</strong>
                      <button type="button" onClick={() => beginEdit(entry)} className="rounded-xl p-2 text-ink-muted hover:bg-accent-soft hover:text-accent" aria-label="Редактировать поступление"><Pencil size={15} /></button>
                      <button type="button" onClick={() => onDeleteEntry(entry.id)} className="rounded-xl p-2 text-ink-muted hover:bg-danger-soft hover:text-danger" aria-label="Удалить поступление"><Trash2 size={15} /></button>
                    </div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-[1fr_140px_170px_auto]">
                      <input value={editSource} onChange={(e) => setEditSource(e.target.value)} className="neu-input h-10 bg-surface-subtle text-[13px]" aria-label="Источник поступления" />
                      <input inputMode="decimal" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="neu-input h-10 bg-surface-subtle text-[13px]" aria-label="Сумма поступления" />
                      <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="neu-input h-10 bg-surface-subtle text-[13px]" aria-label="Дата поступления" />
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

