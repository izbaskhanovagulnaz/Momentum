import type { ReactNode } from "react";

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
}

export default function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-[13px] text-ink-muted">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
