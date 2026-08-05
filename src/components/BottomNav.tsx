import { NavLink } from "react-router-dom";
import { Home, Calendar, CheckSquare, Target, StickyNote } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Главная", icon: Home, end: true },
  { to: "/calendar", label: "Календарь", icon: Calendar, end: false },
  { to: "/tasks", label: "Задачи", icon: CheckSquare, end: false },
  { to: "/goals", label: "Цели", icon: Target, end: false },
  { to: "/notes", label: "Заметки", icon: StickyNote, end: false },
];

export default function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white/95 backdrop-blur md:hidden">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${
              isActive ? "text-ink" : "text-ink-muted"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={isActive ? 2 : 1.6} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
