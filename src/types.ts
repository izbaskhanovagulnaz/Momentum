export type TaskCategory = "work" | "personal" | "health" | "finance" | "study";

/** Правило повтора. Базовой датой серии всегда служит `Task.date`. */
export type TaskRepeat = "daily" | "weekdays" | "weekly" | "monthly";

export interface Task {
  id: string;
  title: string;
  done: boolean;
  date: string;
  /** Начало задачи, HH:MM. */
  time?: string;
  /** Конец задачи, HH:MM. Всегда позже `time`. */
  endTime?: string;
  priority?: "high" | "normal" | "low";
  category?: TaskCategory;
  repeat?: TaskRepeat;
  /** Последний день серии включительно. Пусто — серия бесконечна. */
  repeatUntil?: string;
  /** Даты выполненных вхождений серии. */
  repeatDone?: string[];
  /** Даты удалённых вхождений серии. */
  repeatSkip?: string[];
}

/**
 * Одно вхождение задачи в конкретный день. Для обычных задач совпадает с самой
 * задачей, для повторов — сгенерировано из серии и живёт только в UI.
 */
export interface TaskOccurrence extends Task {
  /** Уникальный ключ вхождения: `id` либо `id::дата`. */
  key: string;
  /** true, если вхождение сгенерировано правилом повтора. */
  virtual: boolean;
  /** Дата самой задачи — для серии это её начало, а не дата вхождения. */
  seriesStart: string;
}

export type GoalTrackingType = "accumulative" | "measurement" | "checklist";

export interface GoalProgressEntry {
  id: string;
  value: number;
  date: string;
  note: string;
  createdAt: string;
}

// Compatibility alias used by older components and migrated Firestore data.
export type GoalEntry = GoalProgressEntry;

export interface GoalChecklistItem {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  completedAt: string;
}

export interface GoalPhoto {
  id: string;
  dataUrl: string;
  date: string;
  caption: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  period: "week" | "month" | "year";
  trackingType: GoalTrackingType;
  startValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline: string;
  imageDataUrl: string;
  createdAt: string;
  entries: GoalProgressEntry[];
  checklistItems: GoalChecklistItem[];
  gallery: GoalPhoto[];
}

export interface GoalCreateInput {
  title: string;
  description: string;
  period: Goal["period"];
  trackingType: GoalTrackingType;
  startValue: number;
  targetValue: number;
  unit: string;
  deadline: string;
  imageDataUrl: string;
}

export interface NoteItem {
  id: string;
  text: string;
  timestamp: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  type?: "meeting" | "task" | "reminder";
  location?: string;
}

export interface SaleEntry {
  id: string;
  source: string;
  amount: number;
  date: string;
}

export interface SalesMonthPlan {
  id: string;
  label: string;
  startDate: string;
  targetAmount: number;
  deadline: string;
  monthStartDay: number;
  entries: SaleEntry[];
}

export interface SalesPlan {
  activeMonthId: string;
  months: SalesMonthPlan[];
  startDate: string;
  targetAmount: number;
  deadline: string;
  monthStartDay: number;
  entries: SaleEntry[];
}

export type Currency = "USD" | "UZS" | "RUB";
export type FinanceOperationStatus = "planned" | "completed" | "cancelled";

export interface FinanceIncome {
  id: string;
  amount: number;
  currency: Currency;
  date: string;
  source: string;
  note: string;
  savingsPercent: number;
  savingsAmount: number;
  fromSavingsAmount: number;
  status?: FinanceOperationStatus;
  probability?: number;
}

export interface FinanceExpense {
  id: string;
  amount: number;
  currency: Currency;
  date: string;
  category: string;
  note: string;
  title?: string;
  status?: FinanceOperationStatus;
}

export interface PlannedExpense {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "planned" | "paid" | "cancelled";
}

export interface DebtItem {
  id: string;
  person: string;
  amount: number;
  paidAmount: number;
  currency: Currency;
  dueDate: string;
  note: string;
  status: "active" | "partial" | "closed";
}

export interface FinanceState {
  incomes: FinanceIncome[];
  expenses: FinanceExpense[];
  plannedExpenses: PlannedExpense[];
  debts: DebtItem[];
  rates: Record<Currency, number>;
}
