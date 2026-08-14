import type { TaskOccurrence } from "../types";
import { timeToMinutes } from "../utils";
import { CATEGORY_COLORS } from "./occurrences";

export const DAY_MINUTES = 24 * 60;

export interface Span {
  task: TaskOccurrence;
  start: number;
  end: number;
}

export interface Placed extends Span {
  column: number;
  columns: number;
}

/** Конец задачи: явный `endTime`, иначе стандартный часовой слот. */
export function spanOf(task: TaskOccurrence, start: number): Span {
  const rawEnd = timeToMinutes(task.endTime);
  const end =
    rawEnd !== null && rawEnd > start ? Math.min(rawEnd, DAY_MINUTES) : Math.min(start + 60, DAY_MINUTES);
  return { task, start, end };
}

/** Раскладывает пересекающиеся задачи по колонкам внутри кластера. */
export function layoutTasks(items: Span[]): Placed[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const placed: Placed[] = [];
  let cluster: Span[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const columnEnds: number[] = [];
    const assigned = cluster.map((item) => {
      let column = columnEnds.findIndex((end) => end <= item.start);
      if (column === -1) column = columnEnds.length;
      columnEnds[column] = item.end;
      return { ...item, column };
    });

    for (const item of assigned) placed.push({ ...item, columns: columnEnds.length });

    cluster = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length > 0) flush();

  return placed;
}

export function placeTasks(tasks: TaskOccurrence[]) {
  return layoutTasks(
    tasks
      .map((task) => ({ task, start: timeToMinutes(task.time) }))
      .filter((item): item is { task: TaskOccurrence; start: number } => item.start !== null)
      .map((item) => spanOf(item.task, item.start)),
  );
}

/**
 * Геометрия блока с лёгким нахлёстом: делить ширину строго поровну читается
 * хуже, чем перекрывать соседей на треть колонки.
 */
export function blockGeometry(column: number, columns: number) {
  const left = (column / columns) * 100;
  const width = Math.min(100 - left, (100 / columns) * (column === columns - 1 ? 1 : 1.32));
  return { left, width, zIndex: 10 + column };
}

export function taskTone(task: TaskOccurrence) {
  if (task.done) return "border-line-strong bg-surface-subtle text-ink-muted";
  if (task.category) {
    const palette = CATEGORY_COLORS[task.category];
    return `border-current ${palette.chip} ${palette.text}`;
  }
  if (task.priority === "high") return "border-danger bg-danger-soft text-ink";
  if (task.priority === "low") return "border-sky bg-sky-soft text-ink";
  return "border-accent bg-accent-soft text-ink";
}
