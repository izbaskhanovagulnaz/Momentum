import { NavLink } from "react-router-dom";
import {
  Calendar,
  CheckSquare,
  Home,
  Settings,
  StickyNote,
  Target,
  Wallet,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Главная", icon: Home, end: true, tint: "bg-accent-soft text-accent" },
  { to: "/calendar", label: "Календарь", icon: Calendar, end: false, tint: "bg-sky-soft text-sky" },
  { to: "/tasks", label: "Задачи", icon: CheckSquare, end: false, tint: "bg-mint-soft text-mint" },
  { to: "/goals", label: "Цели", icon: Target, end: false, tint: "bg-peach-soft text-peach" },
  { to: "/finance", label: "Финансы", icon: Wallet, end: false, tint: "bg-success-soft text-success" },
  { to: "/notes", label: "Заметки", icon: StickyNote, end: false, tint: "bg-warning-soft text-warning" },
];

export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 px-4 py-6 md:block md:w-[236px]">
      <div className="neu-card-sm flex h-full flex-col gap-3 p-3">
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="neu-icon h-10 w-10 bg-accent-soft text-[16px] font-bold text-accent">
            M
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">Momentum</p>
            <p className="text-[11px] text-ink-muted">Personal OS</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, tint }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex h-12 items-center gap-3 rounded-2xl px-3 text-[14px] transition ${
                  isActive
                    ? "neu-card-sm font-semibold text-ink"
                    : "text-ink-secondary hover:bg-white/60 hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition ${
                      isActive ? tint : "bg-transparent text-ink-muted group-hover:text-ink"
                    }`}
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.25 : 1.75} />
                  </span>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `neu-flat mt-auto flex h-12 items-center gap-3 rounded-2xl px-3 text-[14px] transition ${
              isActive ? "font-semibold text-ink" : "text-ink-secondary hover:text-ink"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                  isActive ? "bg-accent-soft text-accent" : "text-ink-muted"
                }`}
              >
                <Settings size={17} strokeWidth={isActive ? 2.25 : 1.75} />
              </span>
              <span>Настройки</span>
            </>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
