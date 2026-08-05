import { useState } from "react";
import { Trash2 } from "lucide-react";
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
    <div className="rounded-3xl border border-line-strong bg-surface-subtle p-6 shadow-sm md:p-7">
      <p className="mb-4 text-[13px] text-ink-muted">Быстрая заметка</p>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
        }}
        placeholder="Записать мысль..."
        rows={2}
        className="w-full resize-none bg-transparent text-[14px] text-ink placeholder:text-ink-muted focus:outline-none"
      />

      {notes.length > 0 && (
        <div className="mt-4 divide-y divide-line-strong border-t border-line-strong pt-2">
          {notes.slice(0, limit).map((note) => (
            <div key={note.id} className="group flex items-start gap-3 py-3 first:pt-2 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="break-words text-[14px] text-ink">{note.text}</p>
                <p className="mt-0.5 text-[12px] text-ink-muted">{note.timestamp}</p>
              </div>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(note.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted transition hover:bg-danger-soft hover:text-danger md:h-8 md:w-8 md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Удалить заметку"
                  title="Удалить заметку"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
