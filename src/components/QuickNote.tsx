import { useState } from "react";
import { StickyNote, Trash2 } from "lucide-react";
import type { NoteItem } from "../types";

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

  return (
    <div className="neu-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="neu-icon h-8 w-8 bg-warning-soft text-warning">
          <StickyNote size={15} />
        </span>
        <p className="text-[13px] font-medium text-ink-muted">Быстрая заметка</p>
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

      {notes.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {notes.slice(0, limit).map((note) => (
            <div key={note.id} className="group flex items-start gap-3 rounded-2xl bg-surface-subtle p-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-[14px] leading-relaxed text-ink">{note.text}</p>
                <p className="mt-1 text-[12px] text-ink-muted">{note.timestamp}</p>
              </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
