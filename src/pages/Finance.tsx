import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Pencil, RotateCcw, Trash2, Wallet, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import HeroCard from "../components/HeroCard";
import { usePlanner } from "../PlannerContext";
import type { Currency, FinanceExpense, FinanceIncome, FinanceOperationStatus } from "../types";
import { formatMoneyInput, localDate, parseMoneyInput } from "../utils";

const currencies: Currency[] = ["USD", "UZS", "RUB"];
const expenseCategories = ["Еда", "Транспорт", "Дом", "Связь", "Здоровье", "Семья", "Работа", "Другое"];
const cashTargetDateStorageKey = "momentum:finance-cash-target-date";

function money(value: number, currency: Currency) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "UZS" ? 0 : 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

// Списки операций идут по дате возрастания: ближайшие сверху.
function byDateAsc<T extends { date: string }>(a: T, b: T) {
  return a.date.localeCompare(b.date);
}

/** Сколько дней вперёд операция считается «ближайшей». */
const SOON_DAYS = 3;

type RowTone = "default" | "soon" | "overdue" | "done";

const rowTone: Record<RowTone, string> = {
  default: "border-transparent bg-surface-subtle",
  soon: "border-warning bg-warning-soft",
  overdue: "border-danger bg-danger-soft",
  done: "border-transparent bg-surface-subtle opacity-60",
};

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

const operationStatusLabel = {
  planned: "ожидается",
  completed: "выполнено",
  cancelled: "отменено",
};

type Operation = { date: string; status?: FinanceOperationStatus };

/**
 * Оттенок незакрытой операции: дата прошла — красный, ближайшие дни — янтарный.
 * Янтарь включаем только для расходов: у доходов «скоро придут» — не повод для внимания.
 */
function operationTone(item: Operation, today: string, highlightSoon: boolean): RowTone {
  if (item.status === "completed") return "done";
  if (item.status === "cancelled") return "default";
  if (item.date < today) return "overdue";
  if (!highlightSoon) return "default";
  return item.date <= shiftDate(today, SOON_DAYS) ? "soon" : "default";
}

function operationStatusText(item: Operation, today: string, overdueLabel: string) {
  const status = item.status || "planned";
  if (status === "planned" && item.date < today) return overdueLabel;
  return operationStatusLabel[status];
}

interface FinanceSummary {
  incomes: number;
  expenses: number;
  savings: number;
  balance: number;
}

interface CashNeedSummary {
  targetDate: string | null;
  required: number;
  shortage: number;
}

export default function Finance() {
  const {
    finance,
    addFinanceIncome,
    updateFinanceIncome,
    deleteFinanceIncome,
    addFinanceExpense,
    updateFinanceExpense,
    deleteFinanceExpense,
    addDebt,
    updateDebt,
    deleteDebt,
    salesPlan,
    addSalesMonth,
    selectSalesMonth,
    deleteSalesMonth,
    updateSalesMonth,
    updateSalesTarget,
    addSaleEntry,
    updateSaleEntry,
    deleteSaleEntry,
  } = usePlanner();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "sales" ? "sales" : "cashflow";
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "sales" || requestedTab === "cashflow" || requestedTab === "debts") {
      setTab(requestedTab);
    }
  }, [searchParams]);
  const today = localDate();
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeCurrency, setIncomeCurrency] = useState<Currency>("UZS");
  const [incomeSource, setIncomeSource] = useState("Зарплата");
  const [incomeDate, setIncomeDate] = useState(localDate());
  const [incomeSavingsPercent, setIncomeSavingsPercent] = useState("0");
  const [incomeFromSavings, setIncomeFromSavings] = useState("0");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCurrency, setExpenseCurrency] = useState<Currency>("UZS");
  const [expenseCategory, setExpenseCategory] = useState("Еда");
  const [expenseDate, setExpenseDate] = useState(localDate());
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [debtPerson, setDebtPerson] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtCurrency, setDebtCurrency] = useState<Currency>("UZS");
  const [debtDate, setDebtDate] = useState(localDate());
  const [cashTargetDate, setCashTargetDate] = useState(() => localStorage.getItem(cashTargetDateStorageKey) || "");
  const [expenseListCategory, setExpenseListCategory] = useState("Все");
  const [incomeListSource, setIncomeListSource] = useState("Все");
  const [expenseListDateFrom, setExpenseListDateFrom] = useState("");
  const [expenseListDateTo, setExpenseListDateTo] = useState("");
  const [incomeListDateFrom, setIncomeListDateFrom] = useState("");
  const [incomeListDateTo, setIncomeListDateTo] = useState("");

  const toUsd = (amount: number, currency: Currency) => amount / finance.rates[currency];
  const fromUsd = (amount: number, currency: Currency) => amount * finance.rates[currency];

  const summaries = useMemo(() => {
    const calculate = (includePlanned: boolean): FinanceSummary => {
    const activeIncomes = finance.incomes.filter((item) => item.status === "completed" || (includePlanned && item.status === "planned"));
    const activeExpenses = finance.expenses.filter((item) => item.status === "completed" || (includePlanned && item.status === "planned"));
    const incomes = activeIncomes.reduce((sum, item) => sum + toUsd(item.amount, item.currency), 0);
    const savings = activeIncomes.reduce((sum, item) => sum + toUsd(item.savingsAmount, item.currency), 0);
    const fromSavings = activeIncomes.reduce((sum, item) => sum + toUsd(item.fromSavingsAmount, item.currency), 0);
    const expenses = activeExpenses.reduce((sum, item) => sum + toUsd(item.amount, item.currency), 0);
    const debts = finance.debts
      .filter((item) => item.status !== "closed")
      .reduce((sum, item) => sum + toUsd(item.amount - item.paidAmount, item.currency), 0);
    const totalExpenses = expenses + debts + savings;

    return { incomes: incomes + fromSavings, expenses: totalExpenses, savings, balance: incomes + fromSavings - totalExpenses };
    };
    return { actual: calculate(false), plan: calculate(true) };
  }, [finance]);

  const nearestIncomeDate = useMemo(() => {
    const currentDate = localDate();
    return finance.incomes
      .filter((item) => item.status !== "cancelled" && item.date > currentDate)
      .sort((a, b) => a.date.localeCompare(b.date))[0]?.date || "";
  }, [finance.incomes]);

  useEffect(() => {
    if (!cashTargetDate && nearestIncomeDate) {
      setCashTargetDate(nearestIncomeDate);
    }
  }, [cashTargetDate, nearestIncomeDate]);

  const changeCashTargetDate = (value: string) => {
    setCashTargetDate(value);
    localStorage.setItem(cashTargetDateStorageKey, value);
  };

  const cashNeed = useMemo<CashNeedSummary>(() => {
    const targetDate = cashTargetDate || nearestIncomeDate || null;
    const activeIncomes = finance.incomes.filter((item) => item.status !== "cancelled");
    const activeExpenses = finance.expenses.filter((item) => item.status !== "cancelled");

    if (!targetDate) return { targetDate: null, required: 0, shortage: 0 };

    const incomesUntilTarget = activeIncomes
      .filter((item) => item.date <= targetDate)
      .reduce((sum, item) => sum + toUsd(item.amount + item.fromSavingsAmount - item.savingsAmount, item.currency), 0);
    const expensesUntilTarget = activeExpenses
      .filter((item) => item.date <= targetDate)
      .reduce((sum, item) => sum + toUsd(item.amount, item.currency), 0);
    const debtsUntilTarget = finance.debts
      .filter((item) => item.status !== "closed" && item.dueDate <= targetDate)
      .reduce((sum, item) => sum + toUsd(item.amount - item.paidAmount, item.currency), 0);
    const required = expensesUntilTarget + debtsUntilTarget;
    const shortage = Math.max(0, required - incomesUntilTarget);

    return { targetDate, required, shortage };
  }, [cashTargetDate, finance, nearestIncomeDate]);

  const expenseListCategories = useMemo(() => {
    const values = finance.expenses.map((item) => item.category).filter(Boolean);
    return ["Все", ...Array.from(new Set([...expenseCategories, ...values]))];
  }, [finance.expenses]);

  const expenseCategoryOptions = useMemo(() => (
    expenseListCategories.filter((item) => item !== "Все")
  ), [expenseListCategories]);

  const incomeListSources = useMemo(() => {
    const values = finance.incomes.map((item) => item.source).filter(Boolean);
    return ["Все", ...Array.from(new Set(["Зарплата", ...values]))];
  }, [finance.incomes]);

  const visibleExpenses = useMemo(() => (
    finance.expenses.filter((item) => (
      (expenseListCategory === "Все" || item.category === expenseListCategory)
      && (!expenseListDateFrom || item.date >= expenseListDateFrom)
      && (!expenseListDateTo || item.date <= expenseListDateTo)
    )).sort(byDateAsc)
  ), [expenseListCategory, expenseListDateFrom, expenseListDateTo, finance.expenses]);

  const visibleIncomes = useMemo(() => (
    finance.incomes.filter((item) => (
      (incomeListSource === "Все" || item.source === incomeListSource)
      && (!incomeListDateFrom || item.date >= incomeListDateFrom)
      && (!incomeListDateTo || item.date <= incomeListDateTo)
    )).sort(byDateAsc)
  ), [finance.incomes, incomeListDateFrom, incomeListDateTo, incomeListSource]);

  const visibleExpensesTotal = useMemo(() => (
    visibleExpenses.reduce((sum, item) => sum + toUsd(item.amount, item.currency), 0)
  ), [visibleExpenses, finance.rates]);

  const visibleIncomesTotal = useMemo(() => (
    visibleIncomes.reduce((sum, item) => sum + toUsd(item.amount, item.currency), 0)
  ), [visibleIncomes, finance.rates]);

  const addIncome = () => {
    const amount = parseMoneyInput(incomeAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !incomeSource.trim()) return;
    const input = {
      amount,
      currency: incomeCurrency,
      date: incomeDate,
      source: incomeSource.trim(),
      note: "",
      savingsPercent: Math.max(0, parseMoneyInput(incomeSavingsPercent || "0")),
      fromSavingsAmount: Math.max(0, parseMoneyInput(incomeFromSavings || "0")),
    };
    if (editingIncomeId) {
      updateFinanceIncome(editingIncomeId, input);
    } else {
      addFinanceIncome(input);
    }
    clearIncomeForm();
  };

  const addExpense = () => {
    const amount = parseMoneyInput(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const input = { amount, currency: expenseCurrency, date: expenseDate, category: expenseCategory, note: "" };
    if (editingExpenseId) {
      updateFinanceExpense(editingExpenseId, input);
    } else {
      addFinanceExpense(input);
    }
    clearExpenseForm();
  };

  const clearExpenseForm = () => {
    setEditingExpenseId(null);
    setExpenseAmount("");
    setExpenseCurrency("UZS");
    setExpenseCategory("Еда");
    setExpenseDate(localDate());
  };

  const clearIncomeForm = () => {
    setEditingIncomeId(null);
    setIncomeAmount("");
    setIncomeCurrency("UZS");
    setIncomeSource("Зарплата");
    setIncomeDate(localDate());
    setIncomeSavingsPercent("0");
    setIncomeFromSavings("0");
  };

  const editExpense = (item: FinanceExpense) => {
    setEditingExpenseId(item.id);
    setExpenseAmount(formatMoneyInput(String(item.amount)));
    setExpenseCurrency(item.currency);
    setExpenseCategory(item.category);
    setExpenseDate(item.date);
  };

  const editIncome = (item: FinanceIncome) => {
    setEditingIncomeId(item.id);
    setIncomeAmount(formatMoneyInput(String(item.amount)));
    setIncomeCurrency(item.currency);
    setIncomeSource(item.source);
    setIncomeDate(item.date);
    setIncomeSavingsPercent(formatMoneyInput(String(item.savingsPercent || 0)));
    setIncomeFromSavings(formatMoneyInput(String(item.fromSavingsAmount || 0)));
  };

  const toggleExpenseCompleted = (item: FinanceExpense) => {
    updateFinanceExpense(item.id, { status: item.status === "completed" ? "planned" : "completed" });
  };

  const toggleIncomeCompleted = (item: FinanceIncome) => {
    updateFinanceIncome(item.id, { status: item.status === "completed" ? "planned" : "completed" });
  };

  const saveDebt = () => {
    const amount = parseMoneyInput(debtAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !debtPerson.trim()) return;
    addDebt({ person: debtPerson.trim(), amount, paidAmount: 0, currency: debtCurrency, dueDate: debtDate, note: "" });
    setDebtPerson("");
    setDebtAmount("");
  };

  const tabs = [
    ["cashflow", "Операции"],
    ["sales", "Продажи"],
    ["debts", "Долги"],
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 lg:mb-4">
        <span className="neu-icon h-11 w-11 bg-success-soft text-success">
          <Wallet size={19} />
        </span>
        <h1 className="text-[26px] font-semibold text-ink md:text-[30px]">Финансы</h1>
      </div>

      <FinanceSummaryPanel
        actual={summaries.actual}
        plan={summaries.plan}
        cashNeed={cashNeed}
        cashTargetDate={cashTargetDate || nearestIncomeDate}
        onCashTargetDateChange={changeCashTargetDate}
        fromUsd={fromUsd}
      />

      <div className="neu-flat mb-5 flex w-full flex-wrap gap-1 p-1.5">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              tab === id ? "bg-white text-ink shadow-neu-sm" : "text-ink-secondary hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "cashflow" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <List
            title="Расходы"
            total={money(fromUsd(visibleExpensesTotal, "UZS"), "UZS")}
            filter={(
              <>
                <Select label="Категория" value={expenseListCategory} onChange={setExpenseListCategory} options={expenseListCategories} />
                <DateFilter label="С" value={expenseListDateFrom} onChange={setExpenseListDateFrom} />
                <DateFilter label="До" value={expenseListDateTo} onChange={setExpenseListDateTo} />
              </>
            )}
            items={visibleExpenses.map((item) => ({
              id: item.id,
              title: item.category,
              meta: `${item.date} · ${operationStatusText(item, today, "просрочено")}`,
              value: money(item.amount, item.currency),
              tone: operationTone(item, today, true),
              onDelete: () => deleteFinanceExpense(item.id),
              actions: (
                <>
                  <IconButton label="Редактировать расход" onClick={() => editExpense(item)}><Pencil size={15} /></IconButton>
                  <IconButton label={item.status === "completed" ? "Вернуть в ожидание" : "Отметить выполнено"} onClick={() => toggleExpenseCompleted(item)}>
                    {item.status === "completed" ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
                  </IconButton>
                </>
              ),
            }))}
          />
          <List
            title="Доходы"
            total={money(fromUsd(visibleIncomesTotal, "UZS"), "UZS")}
            filter={(
              <>
                <Select label="Источник" value={incomeListSource} onChange={setIncomeListSource} options={incomeListSources} />
                <DateFilter label="С" value={incomeListDateFrom} onChange={setIncomeListDateFrom} />
                <DateFilter label="До" value={incomeListDateTo} onChange={setIncomeListDateTo} />
              </>
            )}
            items={visibleIncomes.map((item) => ({
              id: item.id,
              title: item.source,
              meta: `${item.date} · ${operationStatusText(item, today, "не поступило")}`,
              value: money(item.amount, item.currency),
              tone: operationTone(item, today, false),
              onDelete: () => deleteFinanceIncome(item.id),
              actions: (
                <>
                  <IconButton label="Редактировать доход" onClick={() => editIncome(item)}><Pencil size={15} /></IconButton>
                  <IconButton label={item.status === "completed" ? "Вернуть в ожидание" : "Отметить выполнено"} onClick={() => toggleIncomeCompleted(item)}>
                    {item.status === "completed" ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
                  </IconButton>
                </>
              ),
            }))}
          />
          <Panel title={editingExpenseId ? "Редактировать расход" : "Добавить расход"} action={<DarkButton onClick={addExpense}>{editingExpenseId ? "Сохранить" : "Сохранить расход"}</DarkButton>}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Сумма" value={expenseAmount} onChange={setExpenseAmount} moneyInput />
              <Select label="Валюта" value={expenseCurrency} onChange={(value) => setExpenseCurrency(value as Currency)} options={currencies} />
              <Select label="Категория" value={expenseCategory} onChange={setExpenseCategory} options={expenseCategoryOptions} />
              <Input label="Дата" type="date" value={expenseDate} onChange={setExpenseDate} />
            </div>
            {editingExpenseId && <div className="mt-3 flex justify-end"><IconButton label="Отменить редактирование" onClick={clearExpenseForm}><X size={16} /></IconButton></div>}
          </Panel>
          <Panel title={editingIncomeId ? "Редактировать доход" : "Добавить доход"} action={<PrimaryButton onClick={addIncome}>{editingIncomeId ? "Сохранить" : "Сохранить доход"}</PrimaryButton>}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Сумма" value={incomeAmount} onChange={setIncomeAmount} moneyInput />
              <Select label="Валюта" value={incomeCurrency} onChange={(value) => setIncomeCurrency(value as Currency)} options={currencies} />
              <Input label="Откуда" value={incomeSource} onChange={setIncomeSource} />
              <Input label="Дата" type="date" value={incomeDate} onChange={setIncomeDate} />
              <Input label="% в накопления" value={incomeSavingsPercent} onChange={setIncomeSavingsPercent} moneyInput />
              <Input label="Взять из накоплений" value={incomeFromSavings} onChange={setIncomeFromSavings} moneyInput />
            </div>
            {editingIncomeId && <div className="mt-3 flex justify-end"><IconButton label="Отменить редактирование" onClick={clearIncomeForm}><X size={16} /></IconButton></div>}
          </Panel>
        </div>
      )}

      {tab === "sales" && (
        <HeroCard
          salesPlan={salesPlan}
          onAddMonth={addSalesMonth}
          onSelectMonth={selectSalesMonth}
          onDeleteMonth={deleteSalesMonth}
          onUpdateMonth={updateSalesMonth}
          onUpdateTarget={updateSalesTarget}
          onAddEntry={addSaleEntry}
          onUpdateEntry={updateSaleEntry}
          onDeleteEntry={deleteSaleEntry}
        />
      )}

      {tab === "debts" && (
        <Panel title="Долги">
          <div className="grid gap-3 md:grid-cols-[1fr_140px_120px_160px_auto]">
            <Input label="Кому" value={debtPerson} onChange={setDebtPerson} />
            <Input label="Сумма" value={debtAmount} onChange={setDebtAmount} moneyInput />
            <Select label="Валюта" value={debtCurrency} onChange={(value) => setDebtCurrency(value as Currency)} options={currencies} />
            <Input label="До какого" type="date" value={debtDate} onChange={setDebtDate} />
            <PrimaryButton onClick={saveDebt}>Сохранить</PrimaryButton>
          </div>
          <FinanceRows items={finance.debts.map((item) => ({
            id: item.id,
            title: item.person,
            meta: `${item.dueDate} · погашено ${money(item.paidAmount, item.currency)}`,
            value: money(item.amount, item.currency),
            onDelete: () => deleteDebt(item.id),
            actions: <IconButton label="Закрыть долг" onClick={() => updateDebt(item.id, item.amount)}><CheckCircle2 size={15} /></IconButton>,
          }))} />
        </Panel>
      )}

    </div>
  );
}

function FinanceSummaryPanel({
  actual,
  plan,
  cashNeed,
  cashTargetDate,
  onCashTargetDateChange,
  fromUsd,
}: {
  actual: FinanceSummary;
  plan: FinanceSummary;
  cashNeed: CashNeedSummary;
  cashTargetDate: string;
  onCashTargetDateChange: (value: string) => void;
  fromUsd: (amount: number, currency: Currency) => number;
}) {
  const moneyUzs = (value: number) => money(fromUsd(value, "UZS"), "UZS");

  return (
    <section className="neu-card mb-5 p-5 md:p-6 lg:mb-4 lg:p-4">
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="neu-flat p-4 lg:p-3">
          <p className="text-[12px] text-ink-muted">Фактический баланс</p>
          <h2 className={`mt-1 text-[24px] font-semibold lg:text-[21px] ${actual.balance < 0 ? "text-danger" : "text-ink"}`}>{moneyUzs(actual.balance)}</h2>
          <p className="mt-2 text-[12px] text-ink-muted">Плановый баланс: {moneyUzs(plan.balance)}</p>
        </div>
        <div className="neu-flat px-4 py-3">
          <div className="mb-2 grid gap-2 sm:grid-cols-[1fr_150px]">
            <p className="text-[12px] text-ink-muted">{cashNeed.targetDate ? `Нужно на расходы до ${formatDate(cashNeed.targetDate)}` : "Выберите дату для расчета"}</p>
            <input
              type="date"
              value={cashTargetDate}
              onChange={(event) => onCashTargetDateChange(event.target.value)}
              className="neu-input h-9 bg-white text-[13px]"
            />
          </div>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
            <strong className="text-[20px] text-ink lg:text-[18px]">{moneyUzs(cashNeed.required)}</strong>
            <span className={`rounded-2xl px-3 py-2 text-[12px] font-medium ${cashNeed.shortage > 0 ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>
              {cashNeed.targetDate ? cashNeed.shortage > 0 ? `Не хватает ${moneyUzs(cashNeed.shortage)}` : "Хватает" : "Выберите дату"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <CompactMetric label="Доходы, факт" value={moneyUzs(actual.incomes)} />
        <CompactMetric label="Расходы, факт" value={moneyUzs(actual.expenses)} />
        <CompactMetric label="Баланс, факт" value={moneyUzs(actual.balance)} tone={actual.balance < 0 ? "danger" : "default"} />
      </div>
    </section>
  );
}

function CompactMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "danger" }) {
  return (
    <div className="neu-flat min-w-0 px-3 py-2.5">
      <p className="truncate text-[11px] text-ink-muted">{label}</p>
      <p className={`mt-1 break-words text-[13px] font-semibold ${tone === "danger" ? "text-danger" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="neu-card p-5 lg:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 lg:mb-3">
        <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
      </div>
      {children}
      {action && <div className="mt-4 flex justify-end">{action}</div>}
    </section>
  );
}

function Input({ label, value, onChange, type = "text", moneyInput = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; moneyInput?: boolean }) {
  const handleChange = (nextValue: string) => {
    if (moneyInput) {
      onChange(formatMoneyInput(nextValue));
      return;
    }
    onChange(nextValue);
  };

  return <label className="grid gap-1.5 text-[12px] text-ink-muted">{label}<input type={type} inputMode={moneyInput ? "decimal" : undefined} value={value} onChange={(event) => handleChange(event.target.value)} className="neu-input h-12 bg-white text-[16px] lg:h-10 lg:text-[14px]" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="grid gap-1.5 text-[12px] text-ink-muted">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="neu-input h-12 bg-white text-[16px] lg:h-10 lg:text-[14px]">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-1.5 text-[12px] text-ink-muted">
      {label}
      <div className="flex gap-2">
        <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="neu-input h-12 min-w-0 flex-1 bg-white text-[16px] lg:h-10 lg:text-[14px]" />
        {value && <IconButton label="Показать все даты" onClick={() => onChange("")}><X size={16} /></IconButton>}
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, className = "" }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return <button type="button" onClick={onClick} className={`neu-pill min-h-10 w-full bg-accent px-4 py-2 text-white shadow-none hover:brightness-105 sm:w-auto ${className}`}>{children}</button>;
}

function DarkButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="neu-pill min-h-10 w-full bg-ink px-4 py-2 text-white shadow-none hover:brightness-110 sm:w-auto">{children}</button>;
}

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="grid h-9 w-9 place-items-center rounded-xl text-ink-muted transition hover:bg-surface-subtle hover:text-ink" aria-label={label} title={label}>{children}</button>;
}

function List({
  title,
  total,
  filter,
  items,
}: {
  title: string;
  total?: string;
  filter?: React.ReactNode;
  items: Array<{ id: string; title: string; meta: string; value: string; tone?: RowTone; onDelete: () => void; actions?: React.ReactNode }>;
}) {
  return (
    <Panel title={title}>
      {filter && (
        <div className="neu-flat mb-3 grid gap-3 p-3 sm:grid-cols-3">
          {filter}
        </div>
      )}
      {total && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5 shadow-neu-sm">
          <p className="text-[11px] text-ink-muted">Итого</p>
          <p className="min-w-0 break-words text-right text-[14px] font-semibold leading-snug text-ink">{total}</p>
        </div>
      )}
      <FinanceRows items={items} />
    </Panel>
  );
}

function FinanceRows({ items }: { items: Array<{ id: string; title: string; meta: string; value: string; tone?: RowTone; onDelete: () => void; actions?: React.ReactNode }> }) {
  return (
    <div className="mt-4 flex flex-col gap-2 lg:mt-3">
      {items.length === 0 && <p className="neu-flat py-5 text-center text-[13px] text-ink-muted">Пока здесь пусто</p>}
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex flex-wrap items-center gap-3 rounded-2xl border-l-[3px] px-4 py-3 ${rowTone[item.tone || "default"]}`}
        >
          <div className="min-w-[160px] flex-1">
            <p className="truncate text-[14px] font-medium text-ink">{item.title}</p>
            <p
              className={`text-[11px] ${
                item.tone === "overdue" ? "font-medium text-danger" : "text-ink-muted"
              }`}
            >
              {item.meta}
            </p>
          </div>
          <strong className="ml-auto shrink-0 text-[13px] text-ink">{item.value}</strong>
          <div className="flex shrink-0 items-center gap-1.5">
            {item.actions}
            <IconButton label="Удалить" onClick={item.onDelete}><Trash2 size={15} /></IconButton>
          </div>
        </div>
      ))}
    </div>
  );
}
