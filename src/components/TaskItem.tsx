import { Check, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Task } from "../types";
import { formatTimeRange } from "../utils";

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <motion.div
      layout
      className={`group flex min-h-[52px] items-center gap-3 py-2.5 transition ${
        task.done ? "opacity-55" : "opacity-100"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(task.id)}
        aria-label={task.done ? "Вернуть задачу" : "Выполнить задачу"}
        className={`flex h-8 w-8 shrink-0 touch-manipulation items-center justify-center rounded-full border transition md:h-6 md:w-6 ${
          task.done
            ? "border-success bg-success text-white"
            : "border-line-strong bg-white text-transparent hover:border-ink"
        }`}
      >
        <Check size={14} />
      </button>

      <span className={`min-w-0 flex-1 truncate text-[14px] ${task.done ? "text-ink-muted line-through" : "text-ink"}`}>
        {task.title}
      </span>

      {task.priority === "high" && !task.done && (
        <span className="rounded-full bg-danger-soft px-2 py-1 text-[11px] font-medium text-danger">
          высокий
        </span>
      )}
      {task.time && !task.done && (
        <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-ink-muted">
          {formatTimeRange(task.time, task.endTime)}
        </span>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-danger-soft hover:text-danger md:h-8 md:w-8 md:opacity-0 md:group-hover:opacity-100"
          aria-label={`Удалить задачу ${task.title}`}
          title="Удалить задачу"
        >
          <Trash2 size={16} />
        </button>
      )}
    </motion.div>
  );
}
