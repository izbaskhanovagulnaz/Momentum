import { NavLink } from "react-router-dom";
import { CheckSquare, Home, StickyNote, Target, Wallet } from "lucide-react";

const ITEMS = [
  { to: "/", label: "День", icon: Home, end: true, tint: "bg-accent-soft text-accent" },
  { to: "/tasks", label: "Задачи", icon: CheckSquare, end: false, tint: "bg-mint-soft text-mint" },
  { to: "/goals", label: "Цели", icon: Target, end: false, tint: "bg-peach-soft text-peach" },
  { to: "/finance", label: "Финансы", icon: Wallet, end: false, tint: "bg-success-soft text-success" },
  { to: "/notes", label: "Заметки", icon: StickyNote, end: false, tint: "bg-warning-soft text-warning" },
];

export default function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pt-2 md:hidden">
      <div className="neu-card mx-auto grid max-w-md grid-cols-5 gap-0.5 bg-white/95 p-1.5 backdrop-blur">
        {ITEMS.map(({ to, label, icon: Icon, end, tint }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] transition ${
                isActive ? "font-semibold text-ink" : "text-ink-muted"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`grid h-7 w-7 place-items-center rounded-xl transition ${
                    isActive ? tint : "text-ink-muted"
                  }`}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.25 : 1.65} />
                </span>
                <span className="max-w-full truncate px-0.5">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
