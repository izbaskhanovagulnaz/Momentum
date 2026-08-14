import type { Task, TaskCategory, TaskOccurrence, TaskRepeat } from "../types";
import { timeToMinutes } from "../utils";
import { addDays, toDate } from "./dates";

export const REPEAT_LABELS: Record<TaskRepeat, string> = {
  daily: "Каждый день",
  weekdays: "По будням",
  weekly: "Каждую неделю",
  monthly: "Каждый месяц",
};

export const REPEAT_SHORT: Record<TaskRepeat, string> = {
  daily: "ежедневно",
  weekdays: "по будням",
  weekly: "еженедельно",
  monthly: "ежемесячно",
};

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  work: "Работа",
  personal: "Личное",
  health: "Здоровье",
  finance: "Финансы",
  study: "Учёба",
};

/** Цвета категорий берут те же токены, что и остальной интерфейс. */
export const CATEGORY_COLORS: Record<TaskCategory, { dot: string; chip: string; text: string }> = {
  work: { dot: "bg-accent", chip: "bg-accent-soft", text: "text-accent" },
  personal: { dot: "bg-peach", chip: "bg-peach-soft", text: "text-peach" },
  health: { dot: "bg-mint", chip: "bg-mint-soft", text: "text-mint" },
  finance: { dot: "bg-warning", chip: "bg-warning-soft", text: "text-warning" },
  study: { dot: "bg-sky", chip: "bg-sky-soft", text: "text-sky" },
};

function matchesRepeat(base: Date, day: Date, repeat: TaskRepeat) {
  if (repeat === "daily") return true;
  if (repeat === "weekdays") return day.getDay() >= 1 && day.getDay() <= 5;
  if (repeat === "weekly") return day.getDay() === base.getDay();
  return day.getDate() === base.getDate();
}

function occurrenceOf(task: Task, date: string, virtual: boolean): TaskOccurrence {
  return {
    ...task,
    date,
    done: virtual ? (task.repeatDone || []).includes(date) : task.done,
    key: virtual ? `${task.id}::${date}` : task.id,
    virtual,
    seriesStart: task.date,
  };
}

/**
 * Разворачивает задачи (включая повторы) в отдельные вхождения по дням.
 * Диапазон всегда ограничен видимой областью, поэтому бесконечные серии
 * не разворачиваются дальше нужного.
 */
export function occurrencesInRange(tasks: Task[], from: string, to: string) {
  const byDate = new Map<string, TaskOccurrence[]>();

  const push = (date: string, occurrence: TaskOccurrence) => {
    const list = byDate.get(date);
    if (list) list.push(occurrence);
    else byDate.set(date, [occurrence]);
  };

  for (const task of tasks) {
    if (!task.repeat) {
      if (task.date >= from && task.date <= to) push(task.date, occurrenceOf(task, task.date, false));
      continue;
    }

    const base = toDate(task.date);
    const skip = new Set(task.repeatSkip || []);
    const limit = task.repeatUntil && task.repeatUntil < to ? task.repeatUntil : to;
    let cursor = toDate(task.date > from ? task.date : from);

    for (let value = isoOf(cursor); value <= limit; cursor = addDays(cursor, 1), value = isoOf(cursor)) {
      if (value < task.date || skip.has(value)) continue;
      if (!matchesRepeat(base, cursor, task.repeat)) continue;
      push(value, occurrenceOf(task, value, true));
    }
  }

  for (const list of byDate.values()) list.sort(compareOccurrences);
  return byDate;
}

function isoOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function compareOccurrences(a: TaskOccurrence, b: TaskOccurrence) {
  const timeOrder = (a.time || "99:99").localeCompare(b.time || "99:99");
  if (timeOrder !== 0) return timeOrder;
  return a.title.localeCompare(b.title);
}

export function occurrencesForDate(tasks: Task[], date: string) {
  return occurrencesInRange(tasks, date, date).get(date) || [];
}

/** Занятые минуты дня без учёта пересечений — для «градусника» загрузки. */
export function busyMinutes(occurrences: TaskOccurrence[]) {
  const spans = occurrences
    .map((item) => {
      const start = timeToMinutes(item.time);
      if (start === null) return null;
      const end = timeToMinutes(item.endTime);
      return { start, end: end !== null && end > start ? end : Math.min(start + 60, 1440) };
    })
    .filter((span): span is { start: number; end: number } => span !== null)
    .sort((a, b) => a.start - b.start);

  let total = 0;
  let cursor = -1;
  for (const span of spans) {
    const start = Math.max(span.start, cursor);
    if (span.end > start) total += span.end - start;
    cursor = Math.max(cursor, span.end);
  }
  return total;
}

/** Патч задачи для переключения статуса конкретного вхождения. */
export function toggleOccurrencePatch(occurrence: TaskOccurrence): Partial<Task> {
  if (!occurrence.virtual) return { done: !occurrence.done };
  const done = new Set(occurrence.repeatDone || []);
  if (done.has(occurrence.date)) done.delete(occurrence.date);
  else done.add(occurrence.date);
  return { repeatDone: [...done].sort() };
}

/** Патч задачи для скрытия одного вхождения серии. */
export function skipOccurrencePatch(occurrence: TaskOccurrence): Partial<Task> {
  const skip = new Set(occurrence.repeatSkip || []);
  skip.add(occurrence.date);
  return { repeatSkip: [...skip].sort() };
}

export function restoreOccurrencePatch(occurrence: TaskOccurrence): Partial<Task> {
  const skip = new Set(occurrence.repeatSkip || []);
  skip.delete(occurrence.date);
  return { repeatSkip: [...skip].sort() };
}
