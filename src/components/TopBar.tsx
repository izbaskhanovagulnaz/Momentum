import type { ReactNode } from "react";

interface TopBarProps {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}

export default function TopBar({ eyebrow, title, action }: TopBarProps) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-[13px] text-ink-muted">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold tracking-tight text-ink md:text-[30px]">
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}
