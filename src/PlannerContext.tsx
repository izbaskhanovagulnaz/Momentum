import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import type {
  Currency,
  DebtItem,
  FinanceExpense,
  FinanceIncome,
  FinanceState,
  Goal,
  GoalCreateInput,
  GoalPhoto,
  GoalProgressEntry,
  NoteItem,
  PlannedExpense,
  SalesMonthPlan,
  SalesPlan,
  Task,
} from "./types";
import { normalizeGoal, recalculateGoal } from "./goalUtils";
import { firestore, serverTimestamp } from "./firebase";
import type { FirebaseDocumentRef } from "./firebase";
import { useAuth } from "./AuthContext";

interface PlannerContextValue {
  tasks: Task[];
  notes: NoteItem[];
  salesPlan: SalesPlan;
  finance: FinanceState;
  goals: Goal[];
  loading: boolean;
  syncStatus: "loading" | "saving" | "synced" | "error";
  addTask: (input: Omit<Task, "id" | "done">) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, input: Partial<Omit<Task, "id">>) => void;
  addNote: (text: string) => void;
  deleteNote: (id: string) => void;
  addSalesMonth: (targetAmount: number, startDate: string, endDate: string) => void;
  selectSalesMonth: (monthId: string) => void;
  deleteSalesMonth: (monthId: string) => void;
  updateSalesMonth: (monthId: string, targetAmount: number, startDate: string, endDate: string) => void;
  updateSalesTarget: (targetAmount: number, deadline: string, monthStartDay?: number) => void;
  addSaleEntry: (source: string, amount: number, date: string) => void;
  updateSaleEntry: (id: string, source: string, amount: number, date: string) => void;
  deleteSaleEntry: (id: string) => void;
  addFinanceIncome: (input: Omit<FinanceIncome, "id" | "savingsAmount">) => void;
  deleteFinanceIncome: (id: string) => void;
  addFinanceExpense: (input: Omit<FinanceExpense, "id">) => void;
  deleteFinanceExpense: (id: string) => void;
  addPlannedExpense: (input: Omit<PlannedExpense, "id">) => void;
  updatePlannedExpenseStatus: (id: string, status: PlannedExpense["status"]) => void;
  deletePlannedExpense: (id: string) => void;
  addDebt: (input: Omit<DebtItem, "id" | "status">) => void;
  updateDebt: (id: string, paidAmount: number) => void;
  deleteDebt: (id: string) => void;
  updateExchangeRate: (currency: Currency, rate: number) => void;
  addGoal: (input: GoalCreateInput) => string;
  updateGoal: (
    id: string,
    input: Partial<Omit<Goal, "id" | "createdAt" | "currentValue">>,
  ) => void;
  deleteGoal: (id: string) => void;
  reorderGoals: (sourceId: string, targetId: string) => void;
  addGoalEntry: (goalId: string, value: number, date: string, note?: string) => void;
  updateGoalEntry: (
    goalId: string,
    entryId: string,
    value: number,
    date: string,
    note?: string,
  ) => void;
  deleteGoalEntry: (goalId: string, entryId: string) => void;
  addGoalChecklistItem: (goalId: string, title: string) => void;
  updateGoalChecklistItem: (goalId: string, itemId: string, title: string) => void;
  toggleGoalChecklistItem: (goalId: string, itemId: string) => void;
  deleteGoalChecklistItem: (goalId: string, itemId: string) => void;
  addGoalPhoto: (goalId: string, dataUrl: string, date: string, caption?: string) => void;
  updateGoalPhoto: (
    goalId: string,
    photoId: string,
    dataUrl: string,
    date: string,
    caption?: string,
  ) => void;
  deleteGoalPhoto: (goalId: string, photoId: string) => void;
}

interface PlannerDocument {
  tasks: Task[];
  notes: NoteItem[];
  salesPlan: SalesPlan;
  finance: FinanceState;
  goals: Goal[];
}

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

const today = localDate();

const initialTasks: Task[] = [
  { id: "1", title: "Тёплые лиды — follow up", done: false, priority: "high", date: today },
  { id: "2", title: "Demo для клиента", done: false, time: "11:00", date: today },
  { id: "3", title: "Запрос на оплату", done: true, date: today },
  { id: "4", title: "Отчёт по воронке", done: false, time: "17:00", date: today },
];

const initialNotes: NoteItem[] = [
  { id: "1", text: "Клиент просил скидку на VIP тариф", timestamp: "сегодня, 09:14" },
  { id: "2", text: "Уточнить сроки Didox интеграции", timestamp: "вчера, 18:40" },
];

const initialSalesPlan: SalesPlan = {
  activeMonthId: "sales-month-current",
  months: [{
    id: "sales-month-current",
    label: new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(`${today}T12:00:00`)),
    startDate: today,
    targetAmount: 25_000,
    deadline: today,
    monthStartDay: 1,
    entries: [
      { id: "sale-1", source: "Основные продажи", amount: 16_800, date: today },
    ],
  }],
  startDate: today,
  targetAmount: 25_000,
  deadline: today,
  monthStartDay: 1,
  entries: [
    { id: "sale-1", source: "Основные продажи", amount: 16_800, date: today },
  ],
};

const initialFinance: FinanceState = {
  incomes: [],
  expenses: [],
  plannedExpenses: [],
  debts: [],
  rates: { USD: 1, UZS: 12_600, RUB: 92 },
};

const initialGoals: Goal[] = [
  recalculateGoal({
    id: "goal-1",
    title: "Закрыть план продаж",
    description: "Сфокусироваться на тёплых лидах и довести ключевые сделки до оплаты.",
    period: "month",
    trackingType: "accumulative",
    startValue: 16_800,
    currentValue: 16_800,
    targetValue: 25_000,
    unit: "$",
    deadline: today,
    imageDataUrl: "",
    createdAt: new Date().toISOString(),
    entries: [],
    checklistItems: [],
    gallery: [],
  }),
];

function clampMonthStartDay(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(28, Math.max(1, Math.round(numeric)));
}

function localDateFromDate(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function salesPeriodFor(dateValueString: string, startDay: number) {
  const anchor = new Date(`${dateValueString}T12:00:00`);
  const safeStartDay = clampMonthStartDay(startDay);
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), safeStartDay, 12);

  if (anchor.getDate() < safeStartDay) {
    start.setMonth(start.getMonth() - 1);
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);

  return {
    start: localDateFromDate(start),
    end: localDateFromDate(end),
  };
}

function monthLabel(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(start);
  }

  const startLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(start);
  const endLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(end);
  return `${startLabel} - ${endLabel}`;
}

function normalizeSalesMonth(raw: Partial<SalesMonthPlan> & Record<string, unknown>, fallbackId: string): SalesMonthPlan {
  const monthStartDay = clampMonthStartDay(raw.monthStartDay);
  const deadline = typeof raw.deadline === "string" && raw.deadline ? raw.deadline : salesPeriodFor(today, monthStartDay).end;
  const startDate = typeof raw.startDate === "string" && raw.startDate ? raw.startDate : salesPeriodFor(deadline, monthStartDay).start;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : fallbackId,
    label: typeof raw.label === "string" && raw.label ? raw.label : monthLabel(startDate, deadline),
    startDate,
    targetAmount: Number(raw.targetAmount) || initialSalesPlan.targetAmount,
    deadline,
    monthStartDay,
    entries: Array.isArray(raw.entries) ? raw.entries : [],
  };
}

function normalizeSalesPlan(raw: Partial<SalesPlan> & Record<string, unknown>): SalesPlan {
  const legacyMonth = normalizeSalesMonth({
    id: "sales-month-current",
    targetAmount: raw.targetAmount,
    deadline: raw.deadline,
    startDate: raw.startDate,
    monthStartDay: raw.monthStartDay,
    entries: raw.entries,
  }, "sales-month-current");
  const months = Array.isArray(raw.months) && raw.months.length > 0
    ? raw.months.map((month, index) => normalizeSalesMonth(
        month as Partial<SalesMonthPlan> & Record<string, unknown>,
        `sales-month-${index}`,
      ))
    : [legacyMonth];
  const activeMonthId = typeof raw.activeMonthId === "string" && months.some((month) => month.id === raw.activeMonthId)
    ? raw.activeMonthId
    : months[0].id;
  const activeMonth = months.find((month) => month.id === activeMonthId) || months[0];

  return {
    activeMonthId,
    months,
    startDate: activeMonth.startDate,
    targetAmount: activeMonth.targetAmount,
    deadline: activeMonth.deadline,
    monthStartDay: activeMonth.monthStartDay,
    entries: activeMonth.entries,
  };
}

function normalizeFinance(raw: Partial<FinanceState> & Record<string, unknown>): FinanceState {
  const rates = raw.rates && typeof raw.rates === "object" ? raw.rates as Partial<Record<Currency, number>> : {};
  return {
    incomes: Array.isArray(raw.incomes) ? raw.incomes : [],
    expenses: Array.isArray(raw.expenses) ? raw.expenses : [],
    plannedExpenses: Array.isArray(raw.plannedExpenses) ? raw.plannedExpenses : [],
    debts: Array.isArray(raw.debts) ? raw.debts : [],
    rates: {
      USD: Number(rates.USD) || initialFinance.rates.USD,
      UZS: Number(rates.UZS) || initialFinance.rates.UZS,
      RUB: Number(rates.RUB) || initialFinance.rates.RUB,
    },
  };
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [salesPlan, setSalesPlan] = useState<SalesPlan>(initialSalesPlan);
  const [finance, setFinance] = useState<FinanceState>(initialFinance);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<PlannerContextValue["syncStatus"]>("loading");

  const tasksRef = useRef<Task[]>([]);
  const notesRef = useRef<NoteItem[]>([]);
  const salesPlanRef = useRef<SalesPlan>(initialSalesPlan);
  const financeRef = useRef<FinanceState>(initialFinance);
  const goalsRef = useRef<Goal[]>([]);
  const plannerRef = useRef<FirebaseDocumentRef | null>(null);
  const pendingWritesRef = useRef(0);

  const applyTasks = (next: Task[]) => {
    tasksRef.current = next;
    setTasks(next);
  };

  const applyNotes = (next: NoteItem[]) => {
    notesRef.current = next;
    setNotes(next);
  };

  const applySalesPlan = (next: SalesPlan) => {
    salesPlanRef.current = next;
    setSalesPlan(next);
  };

  const applyFinance = (next: FinanceState) => {
    financeRef.current = next;
    setFinance(next);
  };

  const applyGoals = (next: Goal[]) => {
    goalsRef.current = next;
    setGoals(next);
  };

  const persist = async (
    nextTasks: Task[],
    nextNotes: NoteItem[],
    nextSalesPlan: SalesPlan,
    nextGoals = goalsRef.current,
    nextFinance = financeRef.current,
  ) => {
    const ref = plannerRef.current;
    if (!ref) return;

    pendingWritesRef.current += 1;
    setSyncStatus("saving");

    try {
      await ref.set({
        tasks: nextTasks,
        notes: nextNotes,
        salesPlan: nextSalesPlan,
        finance: nextFinance,
        goals: nextGoals,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSyncStatus("synced");
    } catch (reason) {
      console.error(reason);
      setSyncStatus("error");
    } finally {
      pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
    }
  };

  useEffect(() => {
    setLoading(true);
    setSyncStatus("loading");
    pendingWritesRef.current = 0;
    plannerRef.current = null;

    if (!user) {
      applyTasks([]);
      applyNotes([]);
      applySalesPlan(initialSalesPlan);
      applyFinance(initialFinance);
      applyGoals([]);
      setLoading(false);
      return;
    }

    const ref = firestore.collection("users").doc(user.uid).collection("planner").doc("main");
    plannerRef.current = ref;

    const unsubscribe = ref.onSnapshot(async (snapshot) => {
      if (!snapshot.exists) {
        const initial: PlannerDocument = {
          tasks: initialTasks,
          notes: initialNotes,
          salesPlan: initialSalesPlan,
          finance: initialFinance,
          goals: initialGoals,
        };
        applyTasks(initial.tasks);
        applyNotes(initial.notes);
        applySalesPlan(initial.salesPlan);
        applyFinance(initial.finance);
        applyGoals(initial.goals);
        await ref.set({ ...initial, updatedAt: serverTimestamp() });
      } else if (pendingWritesRef.current === 0) {
        const remote = snapshot.data() as Partial<PlannerDocument>;
        const normalizedTasks = Array.isArray(remote.tasks)
          ? remote.tasks.map((task) => ({ ...task, date: task.date || today }))
          : [];
        applyTasks(normalizedTasks);
        applyNotes(Array.isArray(remote.notes) ? remote.notes : []);
        applySalesPlan(remote.salesPlan && typeof remote.salesPlan === "object"
          ? normalizeSalesPlan(remote.salesPlan as Partial<SalesPlan> & Record<string, unknown>)
          : initialSalesPlan);
        applyFinance(remote.finance && typeof remote.finance === "object"
          ? normalizeFinance(remote.finance as Partial<FinanceState> & Record<string, unknown>)
          : initialFinance);
        applyGoals(Array.isArray(remote.goals)
          ? remote.goals.map((goal) => normalizeGoal(
              goal as unknown as Partial<Goal> & Record<string, unknown>,
              today,
            ))
          : initialGoals);
      }

      setLoading(false);
      if (pendingWritesRef.current === 0) setSyncStatus("synced");
    }, (reason) => {
      console.error(reason);
      setLoading(false);
      setSyncStatus("error");
    });

    return () => {
      plannerRef.current = null;
      unsubscribe();
    };
  }, [user]);

  const value = useMemo<PlannerContextValue>(() => ({
    tasks,
    notes,
    salesPlan,
    finance,
    goals,
    loading,
    syncStatus,

    addTask: (input) => {
      const nextTasks = [
        ...tasksRef.current,
        { id: crypto.randomUUID(), done: false, ...input },
      ];
      applyTasks(nextTasks);
      void persist(nextTasks, notesRef.current, salesPlanRef.current);
    },

    toggleTask: (id) => {
      const nextTasks = tasksRef.current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      );
      applyTasks(nextTasks);
      void persist(nextTasks, notesRef.current, salesPlanRef.current);
    },

    deleteTask: (id) => {
      const nextTasks = tasksRef.current.filter((task) => task.id !== id);
      applyTasks(nextTasks);
      void persist(nextTasks, notesRef.current, salesPlanRef.current);
    },

    updateTask: (id, input) => {
      const nextTasks = tasksRef.current.map((task) =>
        task.id === id ? { ...task, ...input } : task,
      );
      applyTasks(nextTasks);
      void persist(nextTasks, notesRef.current, salesPlanRef.current);
    },

    addNote: (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const nextNotes = [{
        id: crypto.randomUUID(),
        text: trimmed,
        timestamp: new Intl.DateTimeFormat("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      }, ...notesRef.current];

      applyNotes(nextNotes);
      void persist(tasksRef.current, nextNotes, salesPlanRef.current);
    },

    deleteNote: (id) => {
      const nextNotes = notesRef.current.filter((note) => note.id !== id);
      applyNotes(nextNotes);
      void persist(tasksRef.current, nextNotes, salesPlanRef.current);
    },

    addSalesMonth: (targetAmount, startDate, endDate) => {
      if (!startDate || !endDate || endDate < startDate) return;
      const month: SalesMonthPlan = {
        id: crypto.randomUUID(),
        label: monthLabel(startDate, endDate),
        startDate,
        targetAmount: Math.max(0, targetAmount),
        deadline: endDate,
        monthStartDay: clampMonthStartDay(new Date(`${startDate}T12:00:00`).getDate()),
        entries: [],
      };
      const next = normalizeSalesPlan({
        ...salesPlanRef.current,
        activeMonthId: month.id,
        months: [month, ...salesPlanRef.current.months],
      });
      applySalesPlan(next);
      void persist(tasksRef.current, notesRef.current, next);
    },

    selectSalesMonth: (monthId) => {
      const next = normalizeSalesPlan({
        ...salesPlanRef.current,
        activeMonthId: monthId,
      });
      applySalesPlan(next);
    },

    deleteSalesMonth: (monthId) => {
      const remainingMonths = salesPlanRef.current.months.filter((month) => month.id !== monthId);
      if (remainingMonths.length === 0) return;
      const nextActiveMonthId = salesPlanRef.current.activeMonthId === monthId
        ? remainingMonths[0].id
        : salesPlanRef.current.activeMonthId;
      const next = normalizeSalesPlan({
        ...salesPlanRef.current,
        activeMonthId: nextActiveMonthId,
        months: remainingMonths,
      });
      applySalesPlan(next);
      void persist(tasksRef.current, notesRef.current, next);
    },

    addFinanceIncome: (input) => {
      const savingsAmount = Math.max(0, input.amount * (Number(input.savingsPercent || 0) / 100));
      const nextFinance = {
        ...financeRef.current,
        incomes: [{ id: crypto.randomUUID(), ...input, savingsAmount }, ...financeRef.current.incomes],
      };
      applyFinance(nextFinance);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, goalsRef.current, nextFinance);
    },

    deleteFinanceIncome: (id) => {
      const nextFinance = {
        ...financeRef.current,
        incomes: financeRef.current.incomes.filter((income) => income.id !== id),
      };
      applyFinance(nextFinance);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, goalsRef.current, nextFinance);
    },

    addFinanceExpense: (input) => {
      const nextFinance = {
        ...financeRef.current,
        expenses: [{ id: crypto.randomUUID(), ...input }, ...financeRef.current.expenses],
      };
      applyFinance(nextFinance);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, goalsRef.current, nextFinance);
    },

    deleteFinanceExpense: (id) => {
      const nextFinance = {
        ...financeRef.current,
        expenses: financeRef.current.expenses.filter((expense) => expense.id !== id),
      };
      applyFinance(nextFinance);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, goalsRef.current, nextFinance);
    },

    addPlannedExpense: (input) => {
      const nextFinance = {
        ...financeRef.current,
        plannedExpenses: [{ id: crypto.randomUUID(), ...input }, ...financeRef.current.plannedExpenses],
      };
      applyFinance(nextFinance);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, goalsRef.current, nextFinance);
    },

    updatePlannedExpenseStatus: (id, status) => {
      const nextFinance = {
        ...financeRef.current,
        plannedExpenses: financeRef.current.plannedExpenses.map((expense) =>
          expense.id === id ? { ...expense, status } : expense,
        ),
      };
      applyFinance(nextFinance);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, goalsRef.current, nextFinance);
    },

    deletePlannedExpense: (id) => {
      const nextFinance = {
        ...financeRef.current,
        plannedExpenses: financeRef.current.plannedExpenses.filter((expense) => expense.id !== id),
      };
      applyFinance(nextFinance);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, goalsRef.current, nextFinance);
    },

    addDebt: (input) => {
      const paidAmount = Math.max(0, Math.min(input.amount, input.paidAmount || 0));
      const nextFinance = {
        ...financeRef.current,
        debts: [{
          id: crypto.randomUUID(),
          ...input,
          paidAmount,
          status: paidAmount >= input.amount ? "closed" as const : paidAmount > 0 ? "partial" as const : "active" as const,
        }, ...financeRef.current.debts],
      };
      applyFinance(nextFinance);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, goalsRef.current, nextFinance);
    },

    updateDebt: (id, paidAmount) => {
      const nextFinance = {
        ...financeRef.current,
        debts: financeRef.current.debts.map((debt) => {
          if (debt.id !== id) return debt;
          const nextPaid = Math.max(0, Math.min(debt.amount, paidAmount));
          return {
            ...debt,
            paidAmount: nextPaid,
            status: nextPaid >= debt.amount ? "closed" as const : nextPaid > 0 ? "partial" as const : "active" as const,
          };
        }),
      };
      applyFinance(nextFinance);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, goalsRef.current, nextFinance);
    },

    deleteDebt: (id) => {
      const nextFinance = {
        ...financeRef.current,
        debts: financeRef.current.debts.filter((debt) => debt.id !== id),
      };
      applyFinance(nextFinance);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, goalsRef.current, nextFinance);
    },

    updateExchangeRate: (currency, rate) => {
      if (!Number.isFinite(rate) || rate <= 0) return;
      const nextFinance = {
        ...financeRef.current,
        rates: { ...financeRef.current.rates, [currency]: rate },
      };
      applyFinance(nextFinance);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, goalsRef.current, nextFinance);
    },

    updateSalesMonth: (monthId, targetAmount, startDate, endDate) => {
      if (!startDate || !endDate || endDate < startDate || targetAmount <= 0) return;
      const nextMonths = salesPlanRef.current.months.map((month) =>
        month.id === monthId
          ? {
              ...month,
              label: monthLabel(startDate, endDate),
              startDate,
              targetAmount: Math.max(0, targetAmount),
              deadline: endDate,
              monthStartDay: clampMonthStartDay(new Date(`${startDate}T12:00:00`).getDate()),
            }
          : month,
      );
      const next = normalizeSalesPlan({
        ...salesPlanRef.current,
        activeMonthId: monthId,
        months: nextMonths,
      });
      applySalesPlan(next);
      void persist(tasksRef.current, notesRef.current, next);
    },

    updateSalesTarget: (targetAmount, deadline, monthStartDay) => {
      const activeMonthId = salesPlanRef.current.activeMonthId;
      const nextMonths = salesPlanRef.current.months.map((month) => {
        if (month.id !== activeMonthId) return month;
        const safeStartDay = clampMonthStartDay(monthStartDay ?? month.monthStartDay);
        const period = salesPeriodFor(deadline, safeStartDay);
        return {
          ...month,
          label: monthLabel(period.start, period.end),
          targetAmount: Math.max(0, targetAmount),
          deadline,
          monthStartDay: safeStartDay,
        };
      });
      const next = normalizeSalesPlan({
        ...salesPlanRef.current,
        months: nextMonths,
      });
      applySalesPlan(next);
      void persist(tasksRef.current, notesRef.current, next);
    },

    addSaleEntry: (source, amount, date) => {
      const trimmed = source.trim();
      if (!trimmed || amount <= 0) return;
      const activeMonthId = salesPlanRef.current.activeMonthId;
      const nextMonths = salesPlanRef.current.months.map((month) =>
        month.id === activeMonthId
          ? {
              ...month,
              entries: [
                { id: crypto.randomUUID(), source: trimmed, amount, date },
                ...month.entries,
              ],
            }
          : month,
      );
      const next = normalizeSalesPlan({
        ...salesPlanRef.current,
        months: nextMonths,
      });
      applySalesPlan(next);
      void persist(tasksRef.current, notesRef.current, next);
    },

    updateSaleEntry: (id, source, amount, date) => {
      const trimmed = source.trim();
      if (!trimmed || amount <= 0 || !date) return;
      const nextMonths = salesPlanRef.current.months.map((month) => ({
        ...month,
        entries: month.entries.map((entry) =>
          entry.id === id ? { ...entry, source: trimmed, amount, date } : entry,
        ),
      }));
      const next = normalizeSalesPlan({
        ...salesPlanRef.current,
        months: nextMonths,
      });
      applySalesPlan(next);
      void persist(tasksRef.current, notesRef.current, next);
    },

    deleteSaleEntry: (id) => {
      const nextMonths = salesPlanRef.current.months.map((month) => ({
        ...month,
        entries: month.entries.filter((entry) => entry.id !== id),
      }));
      const next = normalizeSalesPlan({
        ...salesPlanRef.current,
        months: nextMonths,
      });
      applySalesPlan(next);
      void persist(tasksRef.current, notesRef.current, next);
    },

    addGoal: (input) => {
      const goalId = crypto.randomUUID();
      const nextGoal = recalculateGoal({
        id: goalId,
        createdAt: new Date().toISOString(),
        currentValue: input.startValue,
        entries: [],
        checklistItems: [],
        gallery: [],
        ...input,
      });
      const nextGoals = [nextGoal, ...goalsRef.current];
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
      return goalId;
    },

    updateGoal: (id, input) => {
      const nextGoals = goalsRef.current.map((goal) =>
        goal.id === id ? recalculateGoal({ ...goal, ...input }) : goal,
      );
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
    },

    deleteGoal: (id) => {
      const nextGoals = goalsRef.current.filter((goal) => goal.id !== id);
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
    },

    reorderGoals: (sourceId, targetId) => {
      if (!sourceId || !targetId || sourceId === targetId) return;
      const current = [...goalsRef.current];
      const sourceIndex = current.findIndex((goal) => goal.id === sourceId);
      const targetIndex = current.findIndex((goal) => goal.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return;

      const [moved] = current.splice(sourceIndex, 1);
      current.splice(targetIndex, 0, moved);
      applyGoals(current);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, current);
    },

    addGoalEntry: (goalId, entryValue, date, note) => {
      if (!Number.isFinite(entryValue) || !date) return;
      const nextGoals = goalsRef.current.map((goal) => {
        if (goal.id !== goalId || goal.trackingType === "checklist") return goal;
        if (goal.trackingType === "accumulative" && entryValue <= 0) return goal;
        const entry: GoalProgressEntry = {
          id: crypto.randomUUID(),
          value: entryValue,
          date,
          note: note?.trim() || "",
          createdAt: new Date().toISOString(),
        };
        return recalculateGoal({ ...goal, entries: [...goal.entries, entry] });
      });
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
    },

    updateGoalEntry: (goalId, entryId, entryValue, date, note) => {
      if (!Number.isFinite(entryValue) || !date) return;
      const nextGoals = goalsRef.current.map((goal) => {
        if (goal.id !== goalId || goal.trackingType === "checklist") return goal;
        if (goal.trackingType === "accumulative" && entryValue <= 0) return goal;
        const entries = goal.entries.map((entry) =>
          entry.id === entryId
            ? { ...entry, value: entryValue, date, note: note?.trim() || "" }
            : entry,
        );
        return recalculateGoal({ ...goal, entries });
      });
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
    },

    deleteGoalEntry: (goalId, entryId) => {
      const nextGoals = goalsRef.current.map((goal) => {
        if (goal.id !== goalId) return goal;
        return recalculateGoal({
          ...goal,
          entries: goal.entries.filter((entry) => entry.id !== entryId),
        });
      });
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
    },

    addGoalChecklistItem: (goalId, title) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const nextGoals = goalsRef.current.map((goal) => {
        if (goal.id !== goalId || goal.trackingType !== "checklist") return goal;
        return recalculateGoal({
          ...goal,
          checklistItems: [
            ...goal.checklistItems,
            {
              id: crypto.randomUUID(),
              title: trimmed,
              done: false,
              createdAt: new Date().toISOString(),
              completedAt: "",
            },
          ],
        });
      });
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
    },

    updateGoalChecklistItem: (goalId, itemId, title) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const nextGoals = goalsRef.current.map((goal) => {
        if (goal.id !== goalId || goal.trackingType !== "checklist") return goal;
        return recalculateGoal({
          ...goal,
          checklistItems: goal.checklistItems.map((item) =>
            item.id === itemId ? { ...item, title: trimmed } : item,
          ),
        });
      });
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
    },

    toggleGoalChecklistItem: (goalId, itemId) => {
      const nextGoals = goalsRef.current.map((goal) => {
        if (goal.id !== goalId || goal.trackingType !== "checklist") return goal;
        return recalculateGoal({
          ...goal,
          checklistItems: goal.checklistItems.map((item) => {
            if (item.id !== itemId) return item;
            const done = !item.done;
            return {
              ...item,
              done,
              completedAt: done ? new Date().toISOString() : "",
            };
          }),
        });
      });
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
    },

    deleteGoalChecklistItem: (goalId, itemId) => {
      const nextGoals = goalsRef.current.map((goal) => {
        if (goal.id !== goalId || goal.trackingType !== "checklist") return goal;
        return recalculateGoal({
          ...goal,
          checklistItems: goal.checklistItems.filter((item) => item.id !== itemId),
        });
      });
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
    },

    addGoalPhoto: (goalId, dataUrl, date, caption) => {
      if (!dataUrl || !date) return;
      const nextGoals = goalsRef.current.map((goal) => {
        if (goal.id !== goalId || goal.gallery.length >= 5) return goal;
        const photo: GoalPhoto = {
          id: crypto.randomUUID(),
          dataUrl,
          date,
          caption: caption?.trim() || "",
          createdAt: new Date().toISOString(),
        };
        return {
          ...goal,
          gallery: [...goal.gallery, photo],
        };
      });
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
    },

    updateGoalPhoto: (goalId, photoId, dataUrl, date, caption) => {
      if (!dataUrl || !date) return;
      const nextGoals = goalsRef.current.map((goal) => {
        if (goal.id !== goalId) return goal;
        const previous = goal.gallery.find((photo) => photo.id === photoId);
        return {
          ...goal,
          imageDataUrl: previous && goal.imageDataUrl === previous.dataUrl ? dataUrl : goal.imageDataUrl,
          gallery: goal.gallery.map((photo) =>
            photo.id === photoId
              ? { ...photo, dataUrl, date, caption: caption?.trim() || "" }
              : photo,
          ),
        };
      });
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
    },

    deleteGoalPhoto: (goalId, photoId) => {
      const nextGoals = goalsRef.current.map((goal) => {
        if (goal.id !== goalId) return goal;
        const deleted = goal.gallery.find((photo) => photo.id === photoId);
        const gallery = goal.gallery.filter((photo) => photo.id !== photoId);
        const newest = [...gallery].sort((a, b) => {
          const dateOrder = b.date.localeCompare(a.date);
          if (dateOrder !== 0) return dateOrder;
          return b.createdAt.localeCompare(a.createdAt);
        })[0];
        return {
          ...goal,
          imageDataUrl: deleted && goal.imageDataUrl === deleted.dataUrl
            ? newest?.dataUrl || ""
            : goal.imageDataUrl,
          gallery,
        };
      });
      applyGoals(nextGoals);
      void persist(tasksRef.current, notesRef.current, salesPlanRef.current, nextGoals);
    },
  }), [tasks, notes, salesPlan, goals, loading, syncStatus]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) throw new Error("usePlanner must be used inside PlannerProvider");
  return context;
}
