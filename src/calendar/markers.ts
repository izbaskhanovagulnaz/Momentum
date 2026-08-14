import type { Currency, FinanceState, Goal } from "../types";

export type MarkerKind = "goal" | "expense" | "income" | "debt";

export interface DayMarker {
  id: string;
  kind: MarkerKind;
  title: string;
  amount?: number;
  currency?: Currency;
}

export const MARKER_STYLES: Record<MarkerKind, { dot: string; text: string; soft: string; label: string }> = {
  goal: { dot: "bg-mint", text: "text-mint", soft: "bg-mint-soft", label: "Дедлайн цели" },
  expense: { dot: "bg-danger", text: "text-danger", soft: "bg-danger-soft", label: "Платёж" },
  income: { dot: "bg-success", text: "text-success", soft: "bg-success-soft", label: "Поступление" },
  debt: { dot: "bg-warning", text: "text-warning", soft: "bg-warning-soft", label: "Долг" },
};

const CURRENCY_SIGNS: Record<Currency, string> = { USD: "$", UZS: "сум", RUB: "₽" };

export function formatMarkerAmount(marker: DayMarker) {
  if (marker.amount === undefined || !marker.currency) return "";
  const value = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(marker.amount);
  return marker.currency === "USD" ? `$${value}` : `${value} ${CURRENCY_SIGNS[marker.currency]}`;
}

/**
 * Дедлайны целей и запланированные деньги, разложенные по дням, — чтобы
 * календарь показывал не только задачи, но и всё остальное, что «горит».
 */
export function buildMarkers(goals: Goal[], finance: FinanceState) {
  const byDate = new Map<string, DayMarker[]>();

  const push = (date: string | undefined, marker: DayMarker) => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const list = byDate.get(date);
    if (list) list.push(marker);
    else byDate.set(date, [marker]);
  };

  for (const goal of goals) {
    push(goal.deadline, {
      id: `goal-${goal.id}`,
      kind: "goal",
      title: goal.title,
    });
  }

  for (const expense of finance.expenses) {
    if (expense.status !== "planned") continue;
    push(expense.date, {
      id: `expense-${expense.id}`,
      kind: "expense",
      title: expense.title || expense.category || "Платёж",
      amount: expense.amount,
      currency: expense.currency,
    });
  }

  for (const income of finance.incomes) {
    if (income.status !== "planned") continue;
    push(income.date, {
      id: `income-${income.id}`,
      kind: "income",
      title: income.source || "Поступление",
      amount: income.amount,
      currency: income.currency,
    });
  }

  for (const debt of finance.debts) {
    if (debt.status === "closed") continue;
    push(debt.dueDate, {
      id: `debt-${debt.id}`,
      kind: "debt",
      title: debt.person,
      amount: Math.max(0, debt.amount - debt.paidAmount),
      currency: debt.currency,
    });
  }

  return byDate;
}
