import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CircleCheckBig,
  Goal,
  House,
  NotebookPen,
  WalletMinimal,
} from "lucide-react";

const ITEMS = [
  { to: "/", label: "День", icon: House, end: true, tint: "text-accent" },
  { to: "/calendar", label: "Календарь", icon: CalendarDays, end: false, tint: "text-sky" },
  { to: "/tasks", label: "Задачи", icon: CircleCheckBig, end: false, tint: "text-mint" },
  { to: "/goals", label: "Цели", icon: Goal, end: false, tint: "text-peach" },
  { to: "/finance", label: "Финансы", icon: WalletMinimal, end: false, tint: "text-success" },
  { to: "/notes", label: "Заметки", icon: NotebookPen, end: false, tint: "text-warning" },
];

// Springy enough to overshoot a little, so the lens reads as liquid, not as a box.
const LENS_SPRING = { type: "spring", stiffness: 520, damping: 34, mass: 0.9 } as const;

export default function BottomNav() {
  return (
    <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-2 md:hidden">
      <div className="glass pointer-events-auto mx-auto flex max-w-[430px] items-stretch gap-0.5 rounded-[30px] p-1.5">
        {ITEMS.map(({ to, label, icon: Icon, end, tint }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `glass-press relative flex h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[24px] text-[9px] leading-none ${
                isActive ? "font-semibold" : "text-ink-muted"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-lens"
                    className="glass-lens absolute inset-0 rounded-[24px]"
                    transition={LENS_SPRING}
                  />
                )}
                <motion.span
                  className={`glass-layer grid h-7 w-7 place-items-center transition-colors ${
                    isActive ? tint : "text-ink-muted"
                  }`}
                  animate={{ scale: isActive ? 1.06 : 1 }}
                  transition={LENS_SPRING}
                >
                  <Icon
                    size={19}
                    strokeWidth={isActive ? 2.15 : 1.65}
                    fill={isActive ? "currentColor" : "none"}
                    fillOpacity={isActive ? 0.16 : 0}
                  />
                </motion.span>
                <span
                  className={`glass-layer max-w-full truncate transition-colors ${
                    isActive ? tint : "text-ink-muted"
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
