import { useEffect, useRef, useState } from "react";
import { Hash, Pin, Trash2, X } from "lucide-react";
import type { NoteColor, NoteInput, NoteItem } from "../types";
import { NOTE_COLORS, noteColorMeta, parseTagInput } from "../notes";

interface NoteEditorProps {
  /** null — создание новой заметки. */
  note: NoteItem | null;
  onSave: (input: NoteInput) => void;
  onDelete?: () => void;
  onClose: () => void;
  /**
   * Ставить курсор в заголовок при открытии. На телефоне выключено: открыть
   * заметку — ещё не намерение печатать, а клавиатура закрывает пол-экрана.
   */
  autoFocus?: boolean;
}

export default function NoteEditor({ note, onSave, onDelete, onClose, autoFocus = false }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || "");
  const [text, setText] = useState(note?.text || "");
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagDraft, setTagDraft] = useState("");
  const [color, setColor] = useState<NoteColor>(note?.color || "default");
  const [pinned, setPinned] = useState(Boolean(note?.pinned));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // Поле растёт под текст: заметки бывают и в строку, и на пол-экрана.
  useEffect(() => {
    const field = textRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 360)}px`;
  }, [text]);

  const addTags = (value: string) => {
    const parsed = parseTagInput(value);
    if (!parsed.length) return;
    setTags((current) => {
      const merged = [...current];
      for (const tag of parsed) {
        if (!merged.some((item) => item.toLowerCase() === tag.toLowerCase())) merged.push(tag);
      }
      return merged.slice(0, 8);
    });
    setTagDraft("");
  };

  const canSave = Boolean(title.trim() || text.trim());

  const save = () => {
    if (!canSave) return;
    // Недописанный тег в поле — тоже тег: пользователь просто не нажал Enter.
    const pending = parseTagInput(tagDraft);
    const finalTags = [...tags];
    for (const tag of pending) {
      if (!finalTags.some((item) => item.toLowerCase() === tag.toLowerCase())) finalTags.push(tag);
    }

    onSave({ title, text, tags: finalTags.slice(0, 8), color, pinned });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-end bg-black/30 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-4xl border border-line-strong bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-4xl sm:pb-5"
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-[21px] font-semibold text-ink">
            {note ? "Заметка" : "Новая заметка"}
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPinned((value) => !value)}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                pinned ? "bg-warning-soft text-warning" : "text-ink-muted hover:bg-surface-subtle"
              }`}
              aria-pressed={pinned}
              aria-label={pinned ? "Открепить" : "Закрепить"}
              title={pinned ? "Открепить" : "Закрепить"}
            >
              <Pin size={17} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition hover:bg-surface-subtle"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <input
            autoFocus={autoFocus}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Заголовок"
            className="h-12 w-full rounded-2xl border border-line-strong px-4 text-[15px] font-medium outline-none focus:border-accent"
          />

          <textarea
            ref={textRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Текст заметки..."
            rows={4}
            className="w-full resize-none rounded-2xl border border-line-strong px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-accent"
          />

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] text-ink-muted">
              <Hash size={13} />
              Теги
            </p>
            {tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-accent-soft px-3 text-[12.5px] text-accent"
                    aria-label={`Убрать тег ${tag}`}
                  >
                    {tag}
                    <X size={12} />
                  </button>
                ))}
              </div>
            )}
            <input
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addTags(tagDraft);
                }
                if (event.key === "Backspace" && !tagDraft) setTags((current) => current.slice(0, -1));
              }}
              onBlur={() => addTags(tagDraft)}
              placeholder={tags.length >= 8 ? "Больше восьми тегов не нужно" : "Добавить тег и Enter"}
              disabled={tags.length >= 8}
              className="h-11 w-full rounded-2xl border border-line-strong px-4 text-[14px] outline-none focus:border-accent disabled:opacity-50"
            />
          </div>

          <div>
            <p className="mb-1.5 text-[12px] text-ink-muted">Цвет</p>
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((value) => {
                const meta = noteColorMeta(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setColor(value)}
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                      color === value ? "border-accent" : "border-line-strong"
                    } ${meta.surface}`}
                    aria-pressed={color === value}
                    aria-label={meta.label}
                    title={meta.label}
                  >
                    <i className={`h-3 w-3 rounded-full ${meta.accent}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          {confirmDelete && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="h-11 flex-1 rounded-2xl bg-danger text-[13px] font-medium text-white"
            >
              Точно удалить заметку?
            </button>
          ) : (
            <>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line-strong text-ink-muted transition hover:border-danger hover:bg-danger-soft hover:text-danger"
                  aria-label="Удалить заметку"
                >
                  <Trash2 size={17} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 rounded-2xl border border-line-strong text-[14px]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!canSave}
                className="h-11 flex-1 rounded-2xl bg-accent text-[14px] font-medium text-white disabled:opacity-40"
              >
                Сохранить
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
