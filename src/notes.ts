import type { NoteColor, NoteItem } from "./types";

export type NoteSort = "updated" | "created" | "alpha";

interface NoteColorMeta {
  label: string;
  /** Подложка карточки. */
  surface: string;
  /** Цветная полоса слева и точка в палитре. */
  accent: string;
}

export const NOTE_COLOR_META: Record<NoteColor, NoteColorMeta> = {
  default: { label: "Без цвета", surface: "bg-surface-subtle", accent: "bg-ink-muted" },
  accent: { label: "Фиолетовый", surface: "bg-accent-soft", accent: "bg-accent" },
  mint: { label: "Мятный", surface: "bg-mint-soft", accent: "bg-mint" },
  sky: { label: "Голубой", surface: "bg-sky-soft", accent: "bg-sky" },
  peach: { label: "Персиковый", surface: "bg-peach-soft", accent: "bg-peach" },
  warning: { label: "Жёлтый", surface: "bg-warning-soft", accent: "bg-warning" },
};

export const NOTE_COLORS = Object.keys(NOTE_COLOR_META) as NoteColor[];

export const NOTE_SORT_LABELS: Record<NoteSort, string> = {
  updated: "По изменению",
  created: "По дате",
  alpha: "По алфавиту",
};

export function noteColorMeta(color?: NoteColor) {
  return NOTE_COLOR_META[color && NOTE_COLOR_META[color] ? color : "default"];
}

/** Заголовок карточки: свой либо первая строка текста. */
export function noteHeading(note: NoteItem) {
  const title = (note.title || "").trim();
  if (title) return title;
  const firstLine = note.text.trim().split("\n")[0] || "";
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
}

/** Тело без строки, уже показанной как заголовок. */
export function noteBody(note: NoteItem) {
  if ((note.title || "").trim()) return note.text.trim();
  const lines = note.text.trim().split("\n");
  return lines.slice(1).join("\n").trim();
}

function noteDate(note: NoteItem) {
  const raw = note.updatedAt || note.createdAt || "";
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

const timeFormat = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const yearFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" });

/**
 * «сегодня, 09:14» для свежих заметок, дальше — дата. У заметок из первой
 * версии дат нет, для них остаётся сохранённая строка `timestamp`.
 */
export function formatNoteDate(note: NoteItem, now = new Date()) {
  const date = noteDate(note);
  if (!date) return note.timestamp || "";

  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
      86_400_000,
  );

  if (days === 0) return `сегодня, ${timeFormat.format(date)}`;
  if (days === 1) return `вчера, ${timeFormat.format(date)}`;
  return date.getFullYear() === now.getFullYear() ? dayFormat.format(date) : yearFormat.format(date);
}

/** Заметка правилась после создания — карточка помечает это отдельно. */
export function noteEdited(note: NoteItem) {
  return Boolean(note.createdAt && note.updatedAt && note.updatedAt !== note.createdAt);
}

export function noteMatches(note: NoteItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [note.title || "", note.text, ...(note.tags || [])].join(" ").toLowerCase();
  return haystack.includes(needle);
}

/** Все теги коллекции с числом заметок, частые — первыми. */
export function collectNoteTags(notes: NoteItem[]) {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const note of notes) {
    for (const tag of note.tags || []) {
      const key = tag.toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { tag, count: 1 });
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ru"),
  );
}

export function noteHasTag(note: NoteItem, tag: string) {
  const needle = tag.toLowerCase();
  return (note.tags || []).some((value) => value.toLowerCase() === needle);
}

/**
 * Закреплённые всегда сверху. Внутри группы — выбранный порядок, а заметки без
 * дат (первая версия) держат свой исходный порядок, а не улетают в конец.
 */
export function sortNotes(notes: NoteItem[], sort: NoteSort) {
  const order = new Map(notes.map((note, index) => [note.id, index]));

  return [...notes].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;

    if (sort === "alpha") {
      const byName = noteHeading(a).localeCompare(noteHeading(b), "ru", { sensitivity: "base" });
      if (byName !== 0) return byName;
    } else {
      const key = sort === "created" ? "createdAt" : "updatedAt";
      const left = a[key] || a.createdAt || "";
      const right = b[key] || b.createdAt || "";
      if (left && right && left !== right) return right.localeCompare(left);
      if (Boolean(left) !== Boolean(right)) return left ? -1 : 1;
    }

    return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
  });
}

/** Строка тегов из формы: «клиенты, оплата #срочно» → три тега. */
export function parseTagInput(value: string) {
  return value
    .split(/[,\n]/)
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean);
}
