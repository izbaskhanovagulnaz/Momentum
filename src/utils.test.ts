import { describe, expect, it } from "vitest";
import {
  financeTotals,
  formatMoneyInput,
  formatTimeRange,
  localDate,
  parseMoneyInput,
  salesPeriodFor,
  timeToMinutes,
} from "./utils";
import type { FinanceExpense, FinanceIncome } from "./types";

describe("money input", () => {
  it.each([
    ["1000", 1000],
    ["1 000", 1000],
    ["1\u00a0000", 1000],
    ["1,5", 1.5],
    ["1.5", 1.5],
    ["1.000", 1000],
    ["1.000,50", 1000.5],
    ["1,000.50", 1000.5],
  ])("parses %s", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(["", "abc", "1-2", "1,2,3,4"])("rejects %s", (input) => {
    expect(parseMoneyInput(input)).toBeNaN();
  });

  it("formats both decimal separators without changing their value", () => {
    expect(formatMoneyInput("1234.5")).toBe("1 234,5");
    expect(formatMoneyInput("1234,5")).toBe("1 234,5");
  });
});

describe("task time ranges", () => {
  it.each([
    ["00:00", 0],
    ["09:05", 545],
    ["23:59", 1439],
  ])("converts %s to minutes", (input, expected) => {
    expect(timeToMinutes(input)).toBe(expected);
  });

  it.each([undefined, "", "9", "24:00", "10:60", "abc"])("rejects %s", (input) => {
    expect(timeToMinutes(input)).toBeNull();
  });

  it("shows an interval only when the end is later than the start", () => {
    expect(formatTimeRange("10:00", "11:30")).toBe("10:00 – 11:30");
    expect(formatTimeRange("10:00", "10:00")).toBe("10:00");
    expect(formatTimeRange("10:00", "09:00")).toBe("10:00");
    expect(formatTimeRange("10:00")).toBe("10:00");
    expect(formatTimeRange(undefined, "11:00")).toBe("");
  });
});

describe("date and sales periods", () => {
  it("returns a local YYYY-MM-DD date", () => {
    expect(localDate(new Date(2026, 7, 14, 23, 30))).toBe("2026-08-14");
  });

  it("handles a sales month that starts on the 15th", () => {
    expect(salesPeriodFor("2026-08-14", 15)).toEqual({ start: "2026-07-15", end: "2026-08-14" });
    expect(salesPeriodFor("2026-08-15", 15)).toEqual({ start: "2026-08-15", end: "2026-09-14" });
  });

  it("clamps invalid month start days", () => {
    expect(salesPeriodFor("2026-02-10", 31)).toEqual({ start: "2026-01-28", end: "2026-02-27" });
  });
});

describe("finance fact and plan", () => {
  const rates = { USD: 1, UZS: 10_000, RUB: 100 } as const;
  const incomes = [
    { id: "i1", amount: 100, currency: "USD", status: "completed" },
    { id: "i2", amount: 50, currency: "USD", status: "planned" },
    { id: "i3", amount: 999, currency: "USD", status: "cancelled" },
  ] as FinanceIncome[];
  const expenses = [
    { id: "e1", amount: 20, currency: "USD", status: "completed" },
    { id: "e2", amount: 10, currency: "USD", status: "planned" },
  ] as FinanceExpense[];

  it("excludes planned operations from actual totals", () => {
    expect(financeTotals(incomes, expenses, rates, "actual")).toEqual({ incomes: 100, expenses: 20, balance: 80 });
  });

  it("includes planned operations only in forecast totals", () => {
    expect(financeTotals(incomes, expenses, rates, "plan")).toEqual({ incomes: 150, expenses: 30, balance: 120 });
  });
});
