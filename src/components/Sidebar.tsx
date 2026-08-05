import { NavLink } from "react-router-dom";
import { Home, Calendar, CheckSquare, Target, StickyNote, Settings, Wallet } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Главная", icon: Home, end: true },
  { to: "/calendar", label: "Календарь", icon: Calendar, end: false },
  { to: "/tasks", label: "Задачи", icon: CheckSquare, end: false },
  { to: "/goals", label: "Цели", icon: Target, end: false },
  { to: "/finance", label: "Финансы", icon: Wallet, end: false },
  { to: "/notes", label: "Заметки", icon: StickyNote, end: false },
];

export default function Sidebar() {
  return (
    <aside className="hidden shrink-0 flex-col border-r border-line px-4 py-8 md:flex md:w-60">
      <div className="mb-10 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-sm font-semibold text-white">
          M
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Momentum</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors ${
                isActive
                  ? "bg-surface-subtle font-medium text-ink"
                  : "text-ink-secondary hover:bg-surface-subtle hover:text-ink"
              }`
            }
          >
            <Icon size={18} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors ${
            isActive
              ? "bg-surface-subtle font-medium text-ink"
              : "text-ink-secondary hover:bg-surface-subtle hover:text-ink"
          }`
        }
      >
        <Settings size={18} strokeWidth={1.8} />
        Настройки
      </NavLink>
    </aside>
  );
}
