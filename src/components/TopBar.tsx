import type { ReactNode } from "react";

interface TopBarProps {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}

export default function TopBar({ eyebrow, title, action }: TopBarProps) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-[13px] text-ink-muted">{eyebrow}</p>}
        <h1 className="text-[28px] font-semibold leading-tight text-ink md:text-[34px]">
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}
