import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import type {
  Currency,
  DebtItem,
  FinanceExpense,
  FinanceIncome,
  FinanceOperationStatus,
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
  TaskCategory,
  TaskRepeat,
} from "./types";
import { normalizeGoal, recalculateGoal } from "./goalUtils";
import { deleteField, firestore, serverTimestamp } from "./firebase";
import type { FirebaseCollectionRef, FirebaseDocumentRef } from "./firebase";
import { useAuth } from "./AuthContext";
import { clampMonthStartDay, localDate, salesPeriodFor } from "./utils";

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
  updateFinanceIncome: (id: string, input: Partial<Omit<FinanceIncome, "id" | "savingsAmount">>) => void;
  deleteFinanceIncome: (id: string) => void;
  addFinanceExpense: (input: Omit<FinanceExpense, "id">) => void;
  updateFinanceExpense: (id: string, input: Partial<Omit<FinanceExpense, "id">>) => void;
  deleteFinanceExpense: (id: string) => void;
  addPlannedExpense: (input: Omit<PlannedExpense, "id">) => void;
  updatePlannedExpense: (id: string, input: Omit<PlannedExpense, "id">) => void;
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
  setGoalsOrder: (orderedIds: string[]) => void;
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
  tasksMigrated?: boolean;
  notes: NoteItem[];
  salesPlan: SalesPlan;
  finance: FinanceState;
  goals: Goal[];
}

const telegramReminderWorkerUrl = "https://momentum-reminders.izbaskhanovagulnaz.workers.dev/?newTasks=1";

function notifyTelegramAboutNewTask() {
  void fetch(telegramReminderWorkerUrl, {
    method: "GET",
    mode: "no-cors",
    keepalive: true,
  }).catch((reason) => {
    console.warn("Telegram reminder check failed", reason);
  });
}

const initialTasks: Task[] = [
  { id: "1", title: "Тёплые лиды — follow up", done: false, priority: "high", date: localDate() },
  { id: "2", title: "Demo для клиента", done: false, time: "11:00", date: localDate() },
  { id: "3", title: "Запрос на оплату", done: true, date: localDate() },
  { id: "4", title: "Отчёт по воронке", done: false, time: "17:00", date: localDate() },
];

const initialNotes: NoteItem[] = [
  { id: "1", text: "Клиент просил скидку на VIP тариф", timestamp: "сегодня, 09:14" },
  { id: "2", text: "Уточнить сроки Didox интеграции", timestamp: "вчера, 18:40" },
];

const initialSalesPlan: SalesPlan = {
  activeMonthId: "sales-month-current",
  months: [{
    id: "sales-month-current",
    label: new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(`${localDate()}T12:00:00`)),
    startDate: localDate(),
    targetAmount: 25_000,
    deadline: localDate(),
    monthStartDay: 1,
    entries: [
      { id: "sale-1", source: "Основные продажи", amount: 16_800, date: localDate() },
    ],
  }],
  startDate: localDate(),
  targetAmount: 25_000,
  deadline: localDate(),
  monthStartDay: 1,
  entries: [
    { id: "sale-1", source: "Основные продажи", amount: 16_800, date: localDate() },
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
    deadline: localDate(),
    imageDataUrl: "",
    createdAt: new Date().toISOString(),
    entries: [],
    checklistItems: [],
    gallery: [],
  }),
];

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
  const deadline = typeof raw.deadline === "string" && raw.deadline ? raw.deadline : salesPeriodFor(localDate(), monthStartDay).end;
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
  const normalizeStatus = (status: unknown, date: unknown): FinanceOperationStatus => {
    if (status === "planned" || status === "completed" || status === "cancelled") return status;
    return typeof date === "string" && date > localDate() ? "planned" : "completed";
  };
  return {
    incomes: Array.isArray(raw.incomes)
      ? raw.incomes.map((income) => ({
          ...(income as FinanceIncome),
          status: normalizeStatus((income as Partial<FinanceIncome>).status, (income as Partial<FinanceIncome>).date),
          probability: Number((income as Partial<FinanceIncome>).probability) || 100,
        }))
      : [],
    expenses: Array.isArray(raw.expenses)
      ? raw.expenses.map((expense) => ({
          ...(expense as FinanceExpense),
          status: normalizeStatus((expense as Partial<FinanceExpense>).status, (expense as Partial<FinanceExpense>).date),
        }))
      : [],
    plannedExpenses: Array.isArray(raw.plannedExpenses) ? raw.plannedExpenses : [],
    debts: Array.isArray(raw.debts) ? raw.debts : [],
    rates: {
      USD: Number(rates.USD) || initialFinance.rates.USD,
      UZS: Number(rates.UZS) || initialFinance.rates.UZS,
      RUB: Number(rates.RUB) || initialFinance.rates.RUB,
    },
  };
}

function normalizeClock(raw: unknown) {
  const value = typeof raw === "string" ? raw.trim() : "";
  const normalized = /^\d{4}$/.test(value) ? `${value.slice(0, 2)}:${value.slice(2)}` : value;
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : undefined;
}

const TASK_CATEGORIES = new Set<TaskCategory>(["work", "personal", "health", "finance", "study"]);
const TASK_REPEATS = new Set<TaskRepeat>(["daily", "weekdays", "weekly", "monthly"]);

function normalizeDateList(raw: unknown) {
  if (!Array.isArray(raw)) return undefined;
  const dates = raw.filter(
    (value): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
  );
  return dates.length > 0 ? [...new Set(dates)].sort() : undefined;
}

function normalizeTask(raw: Partial<Task> & Record<string, unknown>, fallbackIndex: number): Task {
  const time = normalizeClock(raw.time);
  const endTime = normalizeClock(raw.endTime);
  const priority = raw.priority === "high" || raw.priority === "normal" || raw.priority === "low"
    ? raw.priority
    : "normal";
  const repeat = TASK_REPEATS.has(raw.repeat as TaskRepeat) ? (raw.repeat as TaskRepeat) : undefined;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : String(raw.id || `legacy-task-${fallbackIndex}`),
    title: typeof raw.title === "string" ? raw.title : "",
    done: Boolean(raw.done),
    date: typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : localDate(),
    time,
    // Конец без начала или раньше начала смысла не имеет.
    endTime: time && endTime && endTime > time ? endTime : undefined,
    priority,
    category: TASK_CATEGORIES.has(raw.category as TaskCategory) ? (raw.category as TaskCategory) : undefined,
    repeat,
    // Границы и исключения существуют только у серии.
    repeatUntil:
      repeat && typeof raw.repeatUntil === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.repeatUntil)
        ? raw.repeatUntil
        : undefined,
    repeatDone: repeat ? normalizeDateList(raw.repeatDone) : undefined,
    repeatSkip: repeat ? normalizeDateList(raw.repeatSkip) : undefined,
  };
}

function normalizeTasks(raw: unknown): Task[] {
  return Array.isArray(raw)
    ? raw.map((task, index) => normalizeTask(task as Partial<Task> & Record<string, unknown>, index))
    : [];
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
  const tasksCollectionRef = useRef<FirebaseCollectionRef | null>(null);
  const userRef = useRef<FirebaseDocumentRef | null>(null);
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

  const goalsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goalsSavePendingRef = useRef<Goal[] | null>(null);

  const flushGoalsSave = () => {
    if (goalsSaveTimerRef.current) {
      clearTimeout(goalsSaveTimerRef.current);
      goalsSaveTimerRef.current = null;
    }
    const pending = goalsSavePendingRef.current;
    if (pending) {
      goalsSavePendingRef.current = null;
      void persistField("goals", pending);
    }
  };

  // Goal edits (checklist toggles, entries, photos...) can fire in quick
  // succession — debounce the Firestore write instead of re-uploading the
  // whole goals array (incl. base64 photos) on every single change.
  const schedulePersistGoals = (next: Goal[]) => {
    goalsSavePendingRef.current = next;
    if (goalsSaveTimerRef.current) clearTimeout(goalsSaveTimerRef.current);
    goalsSaveTimerRef.current = setTimeout(() => {
      goalsSaveTimerRef.current = null;
      const pending = goalsSavePendingRef.current;
      goalsSavePendingRef.current = null;
      if (pending) void persistField("goals", pending);
    }, 600);
  };

  useEffect(() => {
    const onBeforeUnload = () => flushGoalsSave();
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onBeforeUnload);
      flushGoalsSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistField = async <K extends "notes" | "salesPlan" | "finance" | "goals">(
    field: K,
    value: PlannerDocument[K],
  ) => {
    const ref = plannerRef.current;
    const rootRef = userRef.current;
    if (!ref) return;

    pendingWritesRef.current += 1;
    setSyncStatus("saving");

    try {
      await ref.set({ [field]: value, updatedAt: serverTimestamp() }, { merge: true });
      await rootRef?.set({ planner: { [field]: value }, updatedAt: serverTimestamp() }, { merge: true });
      setSyncStatus("synced");
    } catch (reason) {
      console.error(reason);
      setSyncStatus("error");
    } finally {
      pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
    }
  };

  const persistTask = async (task: Task | null, id: string) => {
    const collection = tasksCollectionRef.current;
    if (!collection) return;
    pendingWritesRef.current += 1;
    setSyncStatus("saving");
    try {
      const ref = collection.doc(id);
      // Firestore не принимает undefined, а merge сам по себе не убирает
      // очищенные поля (снятое время, снятый конец) — нужен явный сентинел.
      if (task) {
        const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
        for (const [key, value] of Object.entries(task)) {
          payload[key] = value === undefined ? deleteField() : value;
        }
        await ref.set(payload, { merge: true });
      }
      else await ref.delete();
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
    tasksCollectionRef.current = null;
    userRef.current = null;

    if (!user) {
      applyTasks([]);
      applyNotes([]);
      applySalesPlan(initialSalesPlan);
      applyFinance(initialFinance);
      applyGoals([]);
      setLoading(false);
      return;
    }

    const rootRef = firestore.collection("users").doc(user.uid);
    const ref = rootRef.collection("planner").doc("main");
    const tasksRef = rootRef.collection("tasks");
    userRef.current = rootRef;
    plannerRef.current = ref;
    tasksCollectionRef.current = tasksRef;

    const unsubscribe = ref.onSnapshot(async (snapshot) => {
      // Колбэк асинхронный, и его отказ никто не ловит: без try/catch любая
      // упавшая запись (миграция, правила, оффлайн) оставила бы loading = true
      // навсегда, хотя данные уже пришли.
      let failed = false;

      try {
        if (!snapshot.exists) {
          const legacySnapshot = await rootRef.get();
          const legacyPlanner = legacySnapshot.exists
            ? (legacySnapshot.data() as { planner?: Partial<PlannerDocument> }).planner
            : null;
          const initial: PlannerDocument = legacyPlanner && typeof legacyPlanner === "object"
            ? {
                tasks: normalizeTasks(legacyPlanner.tasks),
                notes: Array.isArray(legacyPlanner.notes) ? legacyPlanner.notes : initialNotes,
                salesPlan: legacyPlanner.salesPlan && typeof legacyPlanner.salesPlan === "object"
                  ? normalizeSalesPlan(legacyPlanner.salesPlan as Partial<SalesPlan> & Record<string, unknown>)
                  : initialSalesPlan,
                finance: legacyPlanner.finance && typeof legacyPlanner.finance === "object"
                  ? normalizeFinance(legacyPlanner.finance as Partial<FinanceState> & Record<string, unknown>)
                  : initialFinance,
                goals: Array.isArray(legacyPlanner.goals)
                  ? legacyPlanner.goals.map((goal) => normalizeGoal(
                      goal as unknown as Partial<Goal> & Record<string, unknown>,
                      localDate(),
                    ))
                  : initialGoals,
              }
            : {
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
          await ref.set({ ...initial, tasksMigrated: false, updatedAt: serverTimestamp() });
          await rootRef.set({ planner: initial, updatedAt: serverTimestamp() }, { merge: true });
        } else {
          const remote = snapshot.data() as Partial<PlannerDocument>;
          const normalizedSalesPlan = remote.salesPlan && typeof remote.salesPlan === "object"
            ? normalizeSalesPlan(remote.salesPlan as Partial<SalesPlan> & Record<string, unknown>)
            : initialSalesPlan;
          const normalizedFinance = remote.finance && typeof remote.finance === "object"
            ? normalizeFinance(remote.finance as Partial<FinanceState> & Record<string, unknown>)
            : initialFinance;
          const normalizedGoals = Array.isArray(remote.goals)
            ? remote.goals.map((goal) => normalizeGoal(
                goal as unknown as Partial<Goal> & Record<string, unknown>,
                localDate(),
              ))
            : initialGoals;
          applyNotes(Array.isArray(remote.notes) ? remote.notes : []);
          applySalesPlan(normalizedSalesPlan);
          applyFinance(normalizedFinance);
          applyGoals(normalizedGoals);

          const normalizedDocument = {
            notes: Array.isArray(remote.notes) ? remote.notes : [],
            salesPlan: normalizedSalesPlan,
            finance: normalizedFinance,
            goals: normalizedGoals,
          };
          void rootRef.set({ planner: normalizedDocument, updatedAt: serverTimestamp() }, { merge: true });
          if (!remote.tasksMigrated) {
            const legacyTasks = normalizeTasks(remote.tasks);
            await Promise.all(legacyTasks.map((task) => tasksRef.doc(task.id).set({ ...task }, { merge: true })));
            await ref.set({ tasksMigrated: true, updatedAt: serverTimestamp() }, { merge: true });
          }
        }
      } catch (reason) {
        console.error(reason);
        failed = true;
      }

      setLoading(false);
      if (failed) setSyncStatus("error");
      else if (pendingWritesRef.current === 0) setSyncStatus("synced");
    }, (reason) => {
      console.error(reason);
      setLoading(false);
      setSyncStatus("error");
    });

    const unsubscribeTasks = tasksRef.onSnapshot((snapshot) => {
      const remoteTasks = snapshot.docs.map((document, index) => normalizeTask({
        ...document.data(),
        id: document.id,
      }, index));
      applyTasks(remoteTasks);
      if (pendingWritesRef.current === 0) setSyncStatus("synced");
    }, (reason) => {
      console.error(reason);
      setSyncStatus("error");
    });

    return () => {
      plannerRef.current = null;
      tasksCollectionRef.current = null;
      unsubscribe();
      unsubscribeTasks();
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
      const task: Task = { id: crypto.randomUUID(), done: false, ...input };
      const nextTasks = [
        ...tasksRef.current,
        task,
      ];
      applyTasks(nextTasks);
      void persistTask(task, task.id).then(() => {
        notifyTelegramAboutNewTask();
      });
    },

    toggleTask: (id) => {
      const nextTasks = tasksRef.current.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      );
      applyTasks(nextTasks);
      const changed = nextTasks.find((task) => task.id === id);
      if (changed) void persistTask(changed, id);
    },

    deleteTask: (id) => {
      const nextTasks = tasksRef.current.filter((task) => task.id !== id);
      applyTasks(nextTasks);
      void persistTask(null, id);
    },

    updateTask: (id, input) => {
      const nextTasks = tasksRef.current.map((task) =>
        task.id === id ? { ...task, ...input } : task,
      );
      applyTasks(nextTasks);
      const changed = nextTasks.find((task) => task.id === id);
      if (changed) void persistTask(changed, id);
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
      void persistField("notes", nextNotes);
    },

    deleteNote: (id) => {
      const nextNotes = notesRef.current.filter((note) => note.id !== id);
      applyNotes(nextNotes);
      void persistField("notes", nextNotes);
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
      void persistField("salesPlan", next);
    },

    selectSalesMonth: (monthId) => {
      const next = normalizeSalesPlan({
        ...salesPlanRef.current,
        activeMonthId: monthId,
      });
      applySalesPlan(next);
      void persistField("salesPlan", next);
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
      void persistField("salesPlan", next);
    },

    addFinanceIncome: (input) => {
      const savingsAmount = Math.max(0, input.amount * (Number(input.savingsPercent || 0) / 100));
      const nextFinance = {
        ...financeRef.current,
        incomes: [{
          id: crypto.randomUUID(),
          ...input,
          savingsAmount,
          status: input.date > localDate() ? "planned" as const : "completed" as const,
          probability: input.probability ?? 100,
        }, ...financeRef.current.incomes],
      };
      applyFinance(nextFinance);
      void persistField("finance", nextFinance);
    },

    deleteFinanceIncome: (id) => {
      const nextFinance = {
        ...financeRef.current,
        incomes: financeRef.current.incomes.filter((income) => income.id !== id),
      };
      applyFinance(nextFinance);
      void persistField("finance", nextFinance);
    },

    updateFinanceIncome: (id, input) => {
      const nextFinance = {
        ...financeRef.current,
        incomes: financeRef.current.incomes.map((income) => {
          if (income.id !== id) return income;
          const nextIncome = { ...income, ...input };
          const savingsAmount = Math.max(0, nextIncome.amount * (Number(nextIncome.savingsPercent || 0) / 100));
          return { ...nextIncome, savingsAmount };
        }),
      };
      applyFinance(nextFinance);
      void persistField("finance", nextFinance);
    },

    addFinanceExpense: (input) => {
      const nextFinance = {
        ...financeRef.current,
        expenses: [{
          id: crypto.randomUUID(),
          ...input,
          status: input.date > localDate() ? "planned" as const : "completed" as const,
        }, ...financeRef.current.expenses],
      };
      applyFinance(nextFinance);
      void persistField("finance", nextFinance);
    },

    updateFinanceExpense: (id, input) => {
      const nextFinance = {
        ...financeRef.current,
        expenses: financeRef.current.expenses.map((expense) => (
          expense.id === id ? { ...expense, ...input } : expense
        )),
      };
      applyFinance(nextFinance);
      void persistField("finance", nextFinance);
    },

    deleteFinanceExpense: (id) => {
      const nextFinance = {
        ...financeRef.current,
        expenses: financeRef.current.expenses.filter((expense) => expense.id !== id),
      };
      applyFinance(nextFinance);
      void persistField("finance", nextFinance);
    },

    addPlannedExpense: (input) => {
      const nextFinance = {
        ...financeRef.current,
        expenses: [{
          id: crypto.randomUUID(),
          amount: input.amount,
          currency: input.currency,
          date: input.dueDate,
          category: input.title,
          title: input.title,
          note: "",
          status: "planned" as const,
        }, ...financeRef.current.expenses],
      };
      applyFinance(nextFinance);
      void persistField("finance", nextFinance);
    },

    updatePlannedExpense: (id, input) => {
      const nextFinance = {
        ...financeRef.current,
        expenses: financeRef.current.expenses.map((expense) =>
          expense.id === id
            ? {
                ...expense,
                amount: input.amount,
                currency: input.currency,
                date: input.dueDate,
                category: input.title,
                title: input.title,
                status: input.status === "paid" ? "completed" as const : input.status === "cancelled" ? "cancelled" as const : "planned" as const,
              }
            : expense,
        ),
        plannedExpenses: financeRef.current.plannedExpenses.map((expense) =>
          expense.id === id ? { id, ...input } : expense,
        ),
      };
      applyFinance(nextFinance);
      void persistField("finance", nextFinance);
    },

    updatePlannedExpenseStatus: (id, status) => {
      const nextFinance = {
        ...financeRef.current,
        expenses: financeRef.current.expenses.map((expense) =>
          expense.id === id
            ? { ...expense, status: status === "paid" ? "completed" as const : status === "cancelled" ? "cancelled" as const : "planned" as const }
            : expense,
        ),
        plannedExpenses: financeRef.current.plannedExpenses.map((expense) =>
          expense.id === id ? { ...expense, status } : expense,
        ),
      };
      applyFinance(nextFinance);
      void persistField("finance", nextFinance);
    },

    deletePlannedExpense: (id) => {
      const nextFinance = {
        ...financeRef.current,
        expenses: financeRef.current.expenses.filter((expense) => expense.id !== id),
        plannedExpenses: financeRef.current.plannedExpenses.filter((expense) => expense.id !== id),
      };
      applyFinance(nextFinance);
      void persistField("finance", nextFinance);
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
      void persistField("finance", nextFinance);
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
      void persistField("finance", nextFinance);
    },

    deleteDebt: (id) => {
      const nextFinance = {
        ...financeRef.current,
        debts: financeRef.current.debts.filter((debt) => debt.id !== id),
      };
      applyFinance(nextFinance);
      void persistField("finance", nextFinance);
    },

    updateExchangeRate: (currency, rate) => {
      if (!Number.isFinite(rate) || rate <= 0) return;
      const nextFinance = {
        ...financeRef.current,
        rates: { ...financeRef.current.rates, [currency]: rate },
      };
      applyFinance(nextFinance);
      void persistField("finance", nextFinance);
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
      void persistField("salesPlan", next);
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
      void persistField("salesPlan", next);
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
      void persistField("salesPlan", next);
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
      void persistField("salesPlan", next);
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
      void persistField("salesPlan", next);
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
      schedulePersistGoals(nextGoals);
      return goalId;
    },

    updateGoal: (id, input) => {
      const nextGoals = goalsRef.current.map((goal) =>
        goal.id === id ? recalculateGoal({ ...goal, ...input }) : goal,
      );
      applyGoals(nextGoals);
      schedulePersistGoals(nextGoals);
    },

    deleteGoal: (id) => {
      const nextGoals = goalsRef.current.filter((goal) => goal.id !== id);
      applyGoals(nextGoals);
      schedulePersistGoals(nextGoals);
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
      schedulePersistGoals(current);
    },

    // Commits a full drag-reorder in one shot instead of one write per hop
    // over intermediate cards. Any goal id missing from `orderedIds` (e.g.
    // one that arrived via sync mid-drag) is appended at the end so nothing
    // is silently dropped from the list.
    setGoalsOrder: (orderedIds) => {
      const byId = new Map(goalsRef.current.map((goal) => [goal.id, goal]));
      const ordered = orderedIds
        .map((id) => byId.get(id))
        .filter((goal): goal is Goal => Boolean(goal));
      const seen = new Set(ordered.map((goal) => goal.id));
      const missing = goalsRef.current.filter((goal) => !seen.has(goal.id));
      const next = [...ordered, ...missing];
      applyGoals(next);
      schedulePersistGoals(next);
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
      schedulePersistGoals(nextGoals);
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
      schedulePersistGoals(nextGoals);
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
      schedulePersistGoals(nextGoals);
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
      schedulePersistGoals(nextGoals);
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
      schedulePersistGoals(nextGoals);
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
      schedulePersistGoals(nextGoals);
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
      schedulePersistGoals(nextGoals);
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
      schedulePersistGoals(nextGoals);
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
      schedulePersistGoals(nextGoals);
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
      schedulePersistGoals(nextGoals);
    },
  }), [tasks, notes, salesPlan, finance, goals, loading, syncStatus]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) throw new Error("usePlanner must be used inside PlannerProvider");
  return context;
}
