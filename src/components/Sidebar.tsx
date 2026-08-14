import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CircleCheckBig,
  Goal,
  House,
  NotebookPen,
  Settings2,
  WalletMinimal,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Главная", icon: House, end: true, tint: "text-accent" },
  { to: "/calendar", label: "Календарь", icon: CalendarDays, end: false, tint: "text-sky" },
  { to: "/tasks", label: "Задачи", icon: CircleCheckBig, end: false, tint: "text-mint" },
  { to: "/goals", label: "Цели", icon: Goal, end: false, tint: "text-peach" },
  { to: "/finance", label: "Финансы", icon: WalletMinimal, end: false, tint: "text-success" },
  { to: "/notes", label: "Заметки", icon: NotebookPen, end: false, tint: "text-warning" },
];

const LENS_SPRING = { type: "spring", stiffness: 520, damping: 34, mass: 0.9 } as const;

export default function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 px-4 py-6 md:block md:w-[236px]">
      <div className="glass flex h-full flex-col gap-3 rounded-[28px] p-3">
        <div className="glass-layer flex items-center gap-3 px-1 py-1">
          <div className="glass-lens grid h-10 w-10 place-items-center rounded-2xl text-[16px] font-bold text-accent">
            M
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">Momentum</p>
            <p className="text-[11px] text-ink-muted">Personal OS</p>
          </div>
        </div>

        <nav className="glass-layer flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, tint }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group relative flex h-12 items-center gap-3 rounded-2xl px-3 text-[14px] transition-colors ${
                  isActive ? "font-semibold text-ink" : "text-ink-secondary hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-nav-lens"
                      className="glass-lens absolute inset-0 rounded-2xl"
                      transition={LENS_SPRING}
                    />
                  )}
                  <span
                    className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center transition-colors ${
                      isActive ? tint : "text-ink-muted group-hover:text-ink"
                    }`}
                  >
                    <Icon
                      size={19}
                      strokeWidth={isActive ? 2.15 : 1.7}
                      fill={isActive ? "currentColor" : "none"}
                      fillOpacity={isActive ? 0.16 : 0}
                    />
                  </span>
                  <span className="relative z-10 truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `glass-lens glass-press glass-layer mt-auto flex h-12 items-center gap-3 rounded-2xl px-3 text-[14px] ${
              isActive ? "font-semibold text-ink" : "text-ink-secondary hover:text-ink"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center ${
                  isActive ? "text-accent" : "text-ink-muted"
                }`}
              >
                <Settings2
                  size={19}
                  strokeWidth={isActive ? 2.15 : 1.7}
                  fill={isActive ? "currentColor" : "none"}
                  fillOpacity={isActive ? 0.16 : 0}
                />
              </span>
              <span>Настройки</span>
            </>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
