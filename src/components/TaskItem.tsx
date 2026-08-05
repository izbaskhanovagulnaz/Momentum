import { Trash2 } from "lucide-react";
import type { Task } from "../types";

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <div className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? "Отметить невыполненной" : "Отметить выполненной"}
        className={`flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full border transition-colors md:h-5 md:w-5 ${
          task.done ? "border-success bg-success" : "border-line-strong bg-white"
        }`}
      >
        {task.done && (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 5.5L4 8L9.5 2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span className={`min-w-0 flex-1 text-[14px] ${task.done ? "text-ink-muted line-through" : "text-ink"}`}>
        {task.title}
      </span>

      {task.priority === "high" && !task.done && (
        <span className="text-[11px] font-medium text-danger">срочно</span>
      )}
      {task.time && !task.done && (
        <span className="font-mono text-[11px] text-ink-muted">{task.time}</span>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-muted transition hover:bg-danger-soft hover:text-danger md:h-8 md:w-8 md:opacity-0 md:group-hover:opacity-100"
          aria-label={`Удалить задачу ${task.title}`}
          title="Удалить задачу"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
