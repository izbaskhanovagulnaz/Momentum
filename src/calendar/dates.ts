import { localDate } from "../utils";

export const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

/** Полдень, чтобы перевод часов и таймзона не сдвигали дату. */
export function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function shiftDate(value: string, days: number) {
  return localDate(addDays(toDate(value), days));
}

/** Понедельник недели, в которую попадает дата. */
export function startOfWeek(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

export function weekDays(date: Date) {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/** Номер недели по ISO 8601 — тот же, что в производственных календарях. */
export function isoWeek(date: Date) {
  const anchor = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  anchor.setDate(anchor.getDate() + 3 - ((anchor.getDay() + 6) % 7));
  const firstThursday = new Date(anchor.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((anchor.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

export function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Сетка месяца, обрезанная по факту: если месяц укладывается в пять недель,
 * шестая строка не рисуется и календарь не «прыгает» по высоте.
 */
export function buildMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const mondayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((mondayIndex + daysInMonth) / 7);
  const start = new Date(year, month, 1 - mondayIndex);

  return Array.from({ length: weeks * 7 }, (_, index) => addDays(start, index));
}

export function chunkWeeks(days: Date[]) {
  return Array.from({ length: days.length / 7 }, (_, index) =>
    days.slice(index * 7, index * 7 + 7),
  );
}

const monthYearFormat = new Intl.DateTimeFormat("ru-RU", { month: "long" });
const longDayFormat = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const shortDayFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
});
const weekdayShortFormat = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });

export function monthName(date: Date) {
  return monthYearFormat.format(date);
}

export function longDayLabel(value: string) {
  return longDayFormat.format(toDate(value));
}

export function shortDayLabel(value: string) {
  return shortDayFormat.format(toDate(value));
}

export function weekdayLabel(value: string) {
  return weekdayShortFormat.format(toDate(value));
}

/** «сегодня» / «завтра» / «вчера», иначе пусто. */
export function relativeDayLabel(value: string, today = localDate()) {
  if (value === today) return "сегодня";
  if (value === shiftDate(today, 1)) return "завтра";
  if (value === shiftDate(today, -1)) return "вчера";
  return "";
}

export function minutesToClock(minutes: number) {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  return `${String(hours).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** «2 ч 40 мин» / «40 мин» / «2 ч». */
export function formatDuration(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} мин`;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}
