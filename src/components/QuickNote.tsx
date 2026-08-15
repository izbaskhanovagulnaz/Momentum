import { useState } from "react";
import { ArrowRight, Pin, StickyNote, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { NoteItem } from "../types";
import { formatNoteDate, noteBody, noteColorMeta, noteHeading, sortNotes } from "../notes";

interface QuickNoteProps {
  notes: NoteItem[];
  onSave: (text: string) => void;
  onDelete?: (id: string) => void;
  limit?: number;
}

export default function QuickNote({ notes, onSave, onDelete, limit = 3 }: QuickNoteProps) {
  const [draft, setDraft] = useState("");

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setDraft("");
  };

  // Закреплённые вперёд — виджет показывает всего несколько заметок.
  const visible = sortNotes(notes, "updated").slice(0, limit);

  return (
    <div className="neu-card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="neu-icon h-8 w-8 bg-warning-soft text-warning">
            <StickyNote size={15} />
          </span>
          <p className="text-[13px] font-medium text-ink-muted">Быстрая заметка</p>
        </div>
        <Link to="/notes" className="flex items-center gap-1 text-[12px] font-medium text-accent">
          Все
          <ArrowRight size={13} />
        </Link>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
        }}
        placeholder="Записать мысль..."
        rows={2}
        className="neu-input w-full resize-none py-3 leading-relaxed placeholder:text-ink-muted"
      />

      {visible.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {visible.map((note) => {
            const meta = noteColorMeta(note.color);
            const body = noteBody(note);
            return (
              <div key={note.id} className={`group flex items-start gap-3 rounded-2xl p-3 ${meta.surface}`}>
                <i className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.accent}`} />
                <Link to="/notes" className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 break-words text-[14px] font-medium leading-relaxed text-ink">
                    {note.pinned && <Pin size={12} className="shrink-0 text-warning" />}
                    {noteHeading(note) || "Без заголовка"}
                  </p>
                  {body && (
                    <p className="mt-0.5 line-clamp-2 break-words text-[13px] leading-relaxed text-ink-secondary">
                      {body}
                    </p>
                  )}
                  <p className="mt-1 text-[12px] text-ink-muted">{formatNoteDate(note)}</p>
                </Link>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(note.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink-muted transition hover:bg-danger-soft hover:text-danger"
                    aria-label="Удалить заметку"
                    title="Удалить заметку"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
