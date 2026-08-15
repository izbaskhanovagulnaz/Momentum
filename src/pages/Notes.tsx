import { useMemo, useState } from "react";
import { Pencil, Pin, PinOff, Plus, Search, StickyNote, Trash2, X } from "lucide-react";
import TopBar from "../components/TopBar";
import NoteEditor from "../components/NoteEditor";
import { usePlanner } from "../PlannerContext";
import type { NoteItem } from "../types";
import {
  NOTE_SORT_LABELS,
  collectNoteTags,
  formatNoteDate,
  noteBody,
  noteColorMeta,
  noteEdited,
  noteHasTag,
  noteHeading,
  noteMatches,
  sortNotes,
} from "../notes";
import type { NoteSort } from "../notes";

type EditorState = { mode: "create" } | { mode: "edit"; note: NoteItem } | null;

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote, toggleNotePinned } = usePlanner();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<NoteSort>("updated");
  const [editor, setEditor] = useState<EditorState>(null);
  const [quickDraft, setQuickDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");

  const tags = useMemo(() => collectNoteTags(notes), [notes]);

  const visible = useMemo(() => {
    const filtered = notes.filter(
      (note) => noteMatches(note, query) && (!tag || noteHasTag(note, tag)),
    );
    return sortNotes(filtered, sort);
  }, [notes, query, tag, sort]);

  const pinned = visible.filter((note) => note.pinned);
  const rest = visible.filter((note) => !note.pinned);
  const filtering = Boolean(query.trim() || tag);

  const quickAdd = () => {
    const trimmed = quickDraft.trim();
    if (!trimmed) return;
    addNote(trimmed);
    setQuickDraft("");
  };

  const removeNote = (id: string) => {
    deleteNote(id);
    setConfirmDelete("");
  };

  const card = (note: NoteItem) => {
    const meta = noteColorMeta(note.color);
    const heading = noteHeading(note);
    const body = noteBody(note);
    const date = formatNoteDate(note);
    const pendingDelete = confirmDelete === note.id;

    return (
      <article
        key={note.id}
        className={`group mb-4 break-inside-avoid rounded-3xl p-4 transition ${meta.surface}`}
      >
        <div className="mb-2 flex items-start gap-2">
          <i className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.accent}`} />
          <button
            type="button"
            onClick={() => setEditor({ mode: "edit", note })}
            className="min-w-0 flex-1 text-left"
          >
            <h3 className="break-words text-[15px] font-semibold leading-snug text-ink">
              {heading || "Без заголовка"}
            </h3>
          </button>
          <button
            type="button"
            onClick={() => toggleNotePinned(note.id)}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
              note.pinned
                ? "text-warning"
                : "text-ink-muted opacity-0 focus-visible:opacity-100 group-hover:opacity-100 md:opacity-0"
            }`}
            aria-label={note.pinned ? "Открепить заметку" : "Закрепить заметку"}
            title={note.pinned ? "Открепить" : "Закрепить"}
          >
            {note.pinned ? <Pin size={15} /> : <PinOff size={15} />}
          </button>
        </div>

        {body && (
          <button
            type="button"
            onClick={() => setEditor({ mode: "edit", note })}
            className="block w-full text-left"
          >
            <p className="line-clamp-6 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink-secondary">
              {body}
            </p>
          </button>
        )}

        {(note.tags || []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(note.tags || []).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTag(value)}
                className="rounded-lg bg-surface px-2 py-1 text-[11px] text-ink-secondary transition hover:text-accent"
              >
                #{value}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-[11.5px] text-ink-muted">
            {date || "без даты"}
            {noteEdited(note) && " · изменено"}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditor({ mode: "edit", note })}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-muted transition hover:bg-surface hover:text-accent"
              aria-label="Редактировать заметку"
            >
              <Pencil size={14} />
            </button>
            {pendingDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => removeNote(note.id)}
                  className="h-8 rounded-xl bg-danger px-2.5 text-[11.5px] font-medium text-white"
                >
                  Удалить
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete("")}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-muted transition hover:bg-surface"
                  aria-label="Отменить удаление"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(note.id)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-muted transition hover:bg-danger-soft hover:text-danger"
                aria-label="Удалить заметку"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div>
      <TopBar
        eyebrow={`${notes.length} ${plural(notes.length, "заметка", "заметки", "заметок")}`}
        title="Заметки"
        action={
          <button
            type="button"
            onClick={() => setEditor({ mode: "create" })}
            className="neu-pill h-11 bg-accent px-4 text-white shadow-none hover:brightness-105"
          >
            <Plus size={16} />
            Новая
          </button>
        }
      />

      <div className="neu-card mb-5 p-4 md:p-5">
        <div className="neu-flat flex min-h-14 items-center gap-3 px-4">
          <StickyNote size={17} className="shrink-0 text-ink-muted" />
          <input
            value={quickDraft}
            onChange={(event) => setQuickDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") quickAdd();
            }}
            placeholder="Записать мысль одной строкой..."
            className="h-12 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
          />
          {quickDraft.trim() && (
            <button
              type="button"
              onClick={quickAdd}
              className="neu-pill h-9 bg-accent px-3 text-[12px] text-white shadow-none"
            >
              Сохранить
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="neu-flat flex h-12 min-w-0 flex-1 items-center gap-2 px-4">
            <Search size={16} className="shrink-0 text-ink-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по заметкам"
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-muted"
                aria-label="Очистить поиск"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            {(Object.keys(NOTE_SORT_LABELS) as NoteSort[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSort(value)}
                className={`h-10 rounded-xl px-3 text-[12.5px] font-medium transition ${
                  sort === value ? "bg-accent-soft text-accent" : "text-ink-secondary hover:bg-surface-subtle"
                }`}
              >
                {NOTE_SORT_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTag("")}
              className={`h-9 rounded-xl px-3 text-[12.5px] transition ${
                tag === "" ? "bg-accent-soft text-accent" : "text-ink-secondary hover:bg-surface-subtle"
              }`}
            >
              Все
            </button>
            {tags.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => setTag(tag.toLowerCase() === item.tag.toLowerCase() ? "" : item.tag)}
                className={`h-9 rounded-xl px-3 text-[12.5px] transition ${
                  tag.toLowerCase() === item.tag.toLowerCase()
                    ? "bg-accent-soft text-accent"
                    : "text-ink-secondary hover:bg-surface-subtle"
                }`}
              >
                #{item.tag}
                <span className="ml-1.5 text-ink-muted">{item.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="neu-card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
          <span className="neu-icon h-12 w-12 bg-warning-soft text-warning">
            <StickyNote size={20} />
          </span>
          <p className="text-[15px] text-ink">
            {filtering ? "Ничего не нашлось" : "Заметок пока нет"}
          </p>
          <p className="max-w-sm text-[13px] text-ink-muted">
            {filtering
              ? "Попробуйте другой запрос или снимите фильтр по тегу."
              : "Запишите мысль одной строкой сверху или создайте заметку с заголовком и тегами."}
          </p>
          {filtering ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTag("");
              }}
              className="neu-pill h-10 bg-surface px-4 text-ink-secondary"
            >
              Сбросить фильтры
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditor({ mode: "create" })}
              className="neu-pill h-10 bg-accent px-4 text-white shadow-none"
            >
              <Plus size={15} />
              Новая заметка
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {pinned.length > 0 && (
            <section>
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-ink-muted">
                <Pin size={12} />
                Закреплённые
              </p>
              <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
                {pinned.map(card)}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              {pinned.length > 0 && (
                <p className="mb-2 text-[12px] font-medium uppercase tracking-wide text-ink-muted">
                  Остальные
                </p>
              )}
              <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
                {rest.map(card)}
              </div>
            </section>
          )}
        </div>
      )}

      {editor && (
        <NoteEditor
          note={editor.mode === "edit" ? editor.note : null}
          onSave={(input) => {
            if (editor.mode === "edit") updateNote(editor.note.id, input);
            else addNote(input);
          }}
          onDelete={editor.mode === "edit" ? () => deleteNote(editor.note.id) : undefined}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}

function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
