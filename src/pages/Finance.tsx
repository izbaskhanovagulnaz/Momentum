import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { usePlanner } from "../PlannerContext";
import type { Currency } from "../types";

const currencies: Currency[] = ["USD", "UZS", "RUB"];
const expenseCategories = ["Еда", "Транспорт", "Дом", "Связь", "Здоровье", "Семья", "Работа", "Другое"];

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function numberValue(value: string) {
  return Number(value.replace(/\s/g, "").replace(",", "."));
}

function money(value: number, currency: Currency) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "UZS" ? 0 : 2,
  }).format(value);
}

export default function Finance() {
  const {
    finance,
    salesPlan,
    addFinanceIncome,
    deleteFinanceIncome,
    addFinanceExpense,
    deleteFinanceExpense,
    addPlannedExpense,
    updatePlannedExpenseStatus,
    deletePlannedExpense,
    addDebt,
    updateDebt,
    deleteDebt,
    updateExchangeRate,
  } = usePlanner();
  const [tab, setTab] = useState("overview");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeCurrency, setIncomeCurrency] = useState<Currency>("USD");
  const [incomeSource, setIncomeSource] = useState("Зарплата");
  const [incomeDate, setIncomeDate] = useState(today());
  const [incomeSavingsPercent, setIncomeSavingsPercent] = useState("0");
  const [incomeFromSavings, setIncomeFromSavings] = useState("0");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCurrency, setExpenseCurrency] = useState<Currency>("USD");
  const [expenseCategory, setExpenseCategory] = useState("Еда");
  const [expenseDate, setExpenseDate] = useState(today());
  const [plannedTitle, setPlannedTitle] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [plannedCurrency, setPlannedCurrency] = useState<Currency>("USD");
  const [plannedDate, setPlannedDate] = useState(today());
  const [debtPerson, setDebtPerson] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtCurrency, setDebtCurrency] = useState<Currency>("USD");
  const [debtDate, setDebtDate] = useState(today());
  const [convertAmount, setConvertAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState<Currency>("USD");
  const [toCurrency, setToCurrency] = useState<Currency>("UZS");

  const toUsd = (amount: number, currency: Currency) => amount / finance.rates[currency];
  const fromUsd = (amount: number, currency: Currency) => amount * finance.rates[currency];

  const summary = useMemo(() => {
    const incomes = finance.incomes.reduce((sum, item) => sum + toUsd(item.amount, item.currency), 0);
    const savings = finance.incomes.reduce((sum, item) => sum + toUsd(item.savingsAmount, item.currency), 0);
    const fromSavings = finance.incomes.reduce((sum, item) => sum + toUsd(item.fromSavingsAmount, item.currency), 0);
    const expenses = finance.expenses.reduce((sum, item) => sum + toUsd(item.amount, item.currency), 0);
    const planned = finance.plannedExpenses
      .filter((item) => item.status === "planned")
      .reduce((sum, item) => sum + toUsd(item.amount, item.currency), 0);
    const debts = finance.debts
      .filter((item) => item.status !== "closed")
      .reduce((sum, item) => sum + toUsd(item.amount - item.paidAmount, item.currency), 0);
    const available = incomes + fromSavings - expenses - savings;
    const futureNeed = planned + debts;
    const expectedSalary = salesPlan.entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0) * 0.1;

    return { incomes, savings, expenses, planned, debts, available, shortage: Math.max(0, futureNeed - available), expectedSalary };
  }, [finance, salesPlan.entries]);

  const addIncome = () => {
    const amount = numberValue(incomeAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !incomeSource.trim()) return;
    addFinanceIncome({
      amount,
      currency: incomeCurrency,
      date: incomeDate,
      source: incomeSource.trim(),
      note: "",
      savingsPercent: Math.max(0, numberValue(incomeSavingsPercent || "0")),
      fromSavingsAmount: Math.max(0, numberValue(incomeFromSavings || "0")),
    });
    setIncomeAmount("");
  };

  const addExpense = () => {
    const amount = numberValue(expenseAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    addFinanceExpense({ amount, currency: expenseCurrency, date: expenseDate, category: expenseCategory, note: "" });
    setExpenseAmount("");
  };

  const savePlanned = () => {
    const amount = numberValue(plannedAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !plannedTitle.trim()) return;
    addPlannedExpense({ title: plannedTitle.trim(), amount, currency: plannedCurrency, dueDate: plannedDate, priority: "medium", status: "planned" });
    setPlannedTitle("");
    setPlannedAmount("");
  };

  const saveDebt = () => {
    const amount = numberValue(debtAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !debtPerson.trim()) return;
    addDebt({ person: debtPerson.trim(), amount, paidAmount: 0, currency: debtCurrency, dueDate: debtDate, note: "" });
    setDebtPerson("");
    setDebtAmount("");
  };

  const converted = useMemo(() => {
    const amount = numberValue(convertAmount || "0");
    if (!Number.isFinite(amount)) return 0;
    return fromUsd(toUsd(amount, fromCurrency), toCurrency);
  }, [convertAmount, fromCurrency, toCurrency, finance.rates]);

  const tabs = [
    ["overview", "Обзор"],
    ["cashflow", "Доходы и расходы"],
    ["planned", "План расходов"],
    ["debts", "Долги"],
    ["converter", "Конвертер"],
  ];

  return (
    <div>
      <h1 className="mb-6 text-[28px] font-semibold text-ink">Финансы</h1>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-full px-4 py-2 text-[13px] font-medium ${tab === id ? "bg-ink text-white" : "bg-surface-subtle text-ink-secondary"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <Metric label="Сейчас есть" value={money(summary.available, "USD")} />
        <Metric label="Доходы" value={money(summary.incomes, "USD")} />
        <Metric label="Расходы" value={money(summary.expenses, "USD")} />
        <Metric label="Не хватает" value={money(summary.shortage, "USD")} />
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Metric label="Накопления" value={money(summary.savings, "USD")} />
          <Metric label="Будущие расходы" value={money(summary.planned, "USD")} />
          <Metric label="Долги" value={money(summary.debts, "USD")} />
          <Metric label="Ожидаемая зарплата от продаж" value={money(summary.expectedSalary, "USD")} />
        </div>
      )}

      {tab === "cashflow" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Добавить доход">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Сумма" value={incomeAmount} onChange={setIncomeAmount} />
              <Select label="Валюта" value={incomeCurrency} onChange={(value) => setIncomeCurrency(value as Currency)} options={currencies} />
              <Input label="Откуда" value={incomeSource} onChange={setIncomeSource} />
              <Input label="Дата" type="date" value={incomeDate} onChange={setIncomeDate} />
              <Input label="% в накопления" value={incomeSavingsPercent} onChange={setIncomeSavingsPercent} />
              <Input label="Взять из накоплений" value={incomeFromSavings} onChange={setIncomeFromSavings} />
            </div>
            <button type="button" onClick={addIncome} className="mt-3 rounded-xl bg-primary px-4 py-3 text-[13px] font-medium text-white">Сохранить доход</button>
          </Panel>
          <Panel title="Добавить расход">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Сумма" value={expenseAmount} onChange={setExpenseAmount} />
              <Select label="Валюта" value={expenseCurrency} onChange={(value) => setExpenseCurrency(value as Currency)} options={currencies} />
              <Select label="Категория" value={expenseCategory} onChange={setExpenseCategory} options={expenseCategories} />
              <Input label="Дата" type="date" value={expenseDate} onChange={setExpenseDate} />
            </div>
            <button type="button" onClick={addExpense} className="mt-3 rounded-xl bg-ink px-4 py-3 text-[13px] font-medium text-white">Сохранить расход</button>
          </Panel>
          <List title="Доходы" items={finance.incomes.map((item) => ({ id: item.id, title: item.source, meta: item.date, value: money(item.amount, item.currency), onDelete: () => deleteFinanceIncome(item.id) }))} />
          <List title="Расходы" items={finance.expenses.map((item) => ({ id: item.id, title: item.category, meta: item.date, value: money(item.amount, item.currency), onDelete: () => deleteFinanceExpense(item.id) }))} />
        </div>
      )}

      {tab === "planned" && (
        <Panel title="План расходов">
          <div className="grid gap-3 md:grid-cols-[1fr_140px_120px_160px_auto]">
            <Input label="Название" value={plannedTitle} onChange={setPlannedTitle} />
            <Input label="Сумма" value={plannedAmount} onChange={setPlannedAmount} />
            <Select label="Валюта" value={plannedCurrency} onChange={(value) => setPlannedCurrency(value as Currency)} options={currencies} />
            <Input label="Дата оплаты" type="date" value={plannedDate} onChange={setPlannedDate} />
            <button type="button" onClick={savePlanned} className="self-end rounded-xl bg-primary px-4 py-3 text-[13px] font-medium text-white">Сохранить</button>
          </div>
          <FinanceRows items={finance.plannedExpenses.map((item) => ({ id: item.id, title: item.title, meta: `${item.dueDate} · ${item.status}`, value: money(item.amount, item.currency), onDelete: () => deletePlannedExpense(item.id), action: () => updatePlannedExpenseStatus(item.id, item.status === "paid" ? "planned" : "paid"), actionLabel: item.status === "paid" ? "Вернуть" : "Оплачено" }))} />
        </Panel>
      )}

      {tab === "debts" && (
        <Panel title="Долги">
          <div className="grid gap-3 md:grid-cols-[1fr_140px_120px_160px_auto]">
            <Input label="Кому" value={debtPerson} onChange={setDebtPerson} />
            <Input label="Сумма" value={debtAmount} onChange={setDebtAmount} />
            <Select label="Валюта" value={debtCurrency} onChange={(value) => setDebtCurrency(value as Currency)} options={currencies} />
            <Input label="До какого" type="date" value={debtDate} onChange={setDebtDate} />
            <button type="button" onClick={saveDebt} className="self-end rounded-xl bg-primary px-4 py-3 text-[13px] font-medium text-white">Сохранить</button>
          </div>
          <FinanceRows items={finance.debts.map((item) => ({ id: item.id, title: item.person, meta: `${item.dueDate} · погашено ${money(item.paidAmount, item.currency)}`, value: money(item.amount, item.currency), onDelete: () => deleteDebt(item.id), action: () => updateDebt(item.id, item.amount), actionLabel: "Закрыть" }))} />
        </Panel>
      )}

      {tab === "converter" && (
        <Panel title="Конвертер">
          <div className="grid gap-3 md:grid-cols-3">
            {currencies.map((currency) => (
              <Input key={currency} label={`Курс ${currency} к USD`} value={String(finance.rates[currency])} onChange={(value) => updateExchangeRate(currency, numberValue(value))} />
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_120px_1fr]">
            <Input label="Сумма" value={convertAmount} onChange={setConvertAmount} />
            <Select label="Из" value={fromCurrency} onChange={(value) => setFromCurrency(value as Currency)} options={currencies} />
            <Select label="В" value={toCurrency} onChange={(value) => setToCurrency(value as Currency)} options={currencies} />
            <Metric label="Результат" value={money(converted, toCurrency)} />
          </div>
        </Panel>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-3xl bg-surface-subtle p-5"><p className="text-[12px] text-ink-muted">{label}</p><p className="mt-2 text-[22px] font-semibold text-ink">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl bg-surface-subtle p-5"><h2 className="mb-4 text-[16px] font-semibold text-ink">{title}</h2>{children}</section>;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-1 text-[12px] text-ink-muted">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-line bg-white px-3 text-[14px] text-ink outline-none" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="grid gap-1 text-[12px] text-ink-muted">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-line bg-white px-3 text-[14px] text-ink outline-none">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function List({ title, items }: { title: string; items: Array<{ id: string; title: string; meta: string; value: string; onDelete: () => void }> }) {
  return <Panel title={title}><FinanceRows items={items} /></Panel>;
}

function FinanceRows({ items }: { items: Array<{ id: string; title: string; meta: string; value: string; onDelete: () => void; action?: () => void; actionLabel?: string }> }) {
  return <div className="mt-4 divide-y divide-line rounded-2xl bg-white px-4">{items.length === 0 && <p className="py-5 text-center text-[13px] text-ink-muted">Пока пусто</p>}{items.map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium text-ink">{item.title}</p><p className="text-[11px] text-ink-muted">{item.meta}</p></div><strong className="text-[13px] text-ink">{item.value}</strong>{item.action && <button type="button" onClick={item.action} className="rounded-xl bg-surface-subtle px-3 py-2 text-[12px] font-medium text-ink-secondary">{item.actionLabel}</button>}<button type="button" onClick={item.onDelete} className="rounded-lg p-2 text-ink-muted hover:text-danger" aria-label="Удалить"><Trash2 size={15} /></button></div>)}</div>;
}
