import type { Currency, FinanceExpense, FinanceIncome } from "./types";

export function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** Минуты от начала суток для строки HH:MM, иначе null. */
export function timeToMinutes(value?: string) {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** «10:00 – 11:30» для интервала и «10:00» для задачи без конца. */
export function formatTimeRange(time?: string, endTime?: string) {
  if (!time) return "";
  const start = timeToMinutes(time);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || end <= start) return time;
  return `${time} – ${endTime}`;
}

export function clampMonthStartDay(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(28, Math.max(1, Math.round(numeric)));
}

export function salesPeriodFor(dateValue: string, startDay: number) {
  const anchor = new Date(`${dateValue}T12:00:00`);
  const safeStartDay = clampMonthStartDay(startDay);
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), safeStartDay, 12);
  if (anchor.getDate() < safeStartDay) start.setMonth(start.getMonth() - 1);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  return { start: localDate(start), end: localDate(end) };
}

export function parseMoneyInput(value: string) {
  let normalized = value.trim().replace(/[\s\u00a0]/g, "");
  if (!normalized) return Number.NaN;
  if (!/^[+-]?[\d.,]+$/.test(normalized)) return Number.NaN;

  const comma = normalized.lastIndexOf(",");
  const dot = normalized.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const thousands = decimal === "," ? /\./g : /,/g;
    normalized = normalized.replace(thousands, "").replace(decimal, ".");
  } else {
    const separator = comma >= 0 ? "," : dot >= 0 ? "." : "";
    if (separator) {
      const parts = normalized.split(separator);
      const groupedThousands = /^[-+]?\d{1,3}$/.test(parts[0]) && parts.slice(1).every((part) => /^\d{3}$/.test(part));
      if (parts.length > 2 && !groupedThousands) return Number.NaN;
      normalized = groupedThousands ? parts.join("") : `${parts[0]}.${parts[1] ?? ""}`;
    }
  }

  const result = Number(normalized);
  return Number.isFinite(result) ? result : Number.NaN;
}

export function formatMoneyInput(value: string) {
  const compact = value.replace(/[\s\u00a0]/g, "").replace(/,/g, ".");
  if (!/^\d*(?:\.\d*)?$/.test(compact)) return value;
  const [integer = "", decimal] = compact.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimal === undefined ? grouped : `${grouped},${decimal}`;
}

export function toUsd(amount: number, currency: Currency, rates: Record<Currency, number>) {
  return currency === "USD" ? amount : amount / Math.max(rates[currency], 0.000001);
}

export function financeTotals(
  incomes: FinanceIncome[],
  expenses: FinanceExpense[],
  rates: Record<Currency, number>,
  mode: "actual" | "plan",
) {
  const allowed = mode === "actual" ? new Set(["completed"]) : new Set(["completed", "planned"]);
  const income = incomes.filter((item) => allowed.has(item.status ?? "completed")).reduce((sum, item) => sum + toUsd(item.amount, item.currency, rates), 0);
  const expense = expenses.filter((item) => allowed.has(item.status ?? "completed")).reduce((sum, item) => sum + toUsd(item.amount, item.currency, rates), 0);
  return { incomes: income, expenses: expense, balance: income - expense };
}
