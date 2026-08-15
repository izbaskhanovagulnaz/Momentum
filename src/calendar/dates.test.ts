import { describe, expect, it } from "vitest";
import { buildMonth, isoWeek, shiftedEnd } from "./dates";

describe("shiftedEnd", () => {
  it("двигает интервал назад, сохраняя длительность", () => {
    expect(shiftedEnd("13:00", "18:30", "20:00")).toBe("14:30");
  });

  it("двигает интервал вперёд, сохраняя длительность", () => {
    expect(shiftedEnd("21:00", "18:30", "20:00")).toBe("22:30");
  });

  it("не меняет длительность при сдвиге на минуты", () => {
    expect(shiftedEnd("09:45", "09:30", "10:15")).toBe("10:30");
  });

  it("подставляет час, если прежний интервал был пустым или вывернутым", () => {
    expect(shiftedEnd("09:00", "", "")).toBe("10:00");
    expect(shiftedEnd("09:00", "12:00", "11:00")).toBe("10:00");
  });

  it("не выходит за пределы суток", () => {
    expect(shiftedEnd("23:30", "10:00", "13:00")).toBe("23:59");
  });

  it("оставляет конец как был, если начало нечитаемо", () => {
    expect(shiftedEnd("", "09:00", "10:00")).toBe("10:00");
  });
});

describe("buildMonth", () => {
  it("обрезает сетку до пяти недель, когда месяц в них укладывается", () => {
    // Февраль 2026 начинается в воскресенье и длится 28 дней.
    expect(buildMonth(new Date(2026, 1, 1))).toHaveLength(35);
  });

  it("оставляет шесть недель, когда месяц в пять не влезает", () => {
    // Август 2026 начинается в субботу и длится 31 день.
    expect(buildMonth(new Date(2026, 7, 1))).toHaveLength(42);
  });
});

describe("isoWeek", () => {
  it.each([
    [new Date(2026, 0, 1), 1],
    [new Date(2026, 7, 14), 33],
    [new Date(2026, 11, 31), 53],
  ])("считает номер недели по ISO для %s", (date, expected) => {
    expect(isoWeek(date)).toBe(expected);
  });
});
