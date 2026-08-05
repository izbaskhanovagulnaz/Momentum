import { useState } from "react";
import type { ReactNode } from "react";
import TopBar from "../components/TopBar";
import { Bell, Moon, Globe, LogOut, Cloud } from "lucide-react";
import { useAuth } from "../AuthContext";
import { usePlanner } from "../PlannerContext";

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const { user, logout } = useAuth();
  const { syncStatus } = usePlanner();
  const name = user?.displayName || "Гульназ";

  return (
    <div>
      <TopBar title="Настройки" />

      <div className="mb-4 flex items-center gap-4 rounded-3xl bg-surface-subtle p-6">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-[18px] font-semibold text-accent">
          {user?.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" /> : name.charAt(0)}
        </div>
        <div>
          <p className="text-[16px] font-medium text-ink">{name}</p>
          <p className="text-[13px] text-ink-secondary">{user?.email}</p>
        </div>
      </div>

      <div className="divide-y divide-line rounded-3xl border border-line">
        <SettingsRow icon={<Cloud size={18} />} label="Синхронизация" control={<span className="text-[13px] text-ink-muted">{syncLabel(syncStatus)}</span>} />
        <SettingsRow icon={<Bell size={18} />} label="Уведомления" control={<Toggle checked={notifications} onChange={() => setNotifications((v) => !v)} />} />
        <SettingsRow icon={<Moon size={18} />} label="Тёмная тема" control={<Toggle checked={darkMode} onChange={() => setDarkMode((v) => !v)} />} />
        <SettingsRow icon={<Globe size={18} />} label="Язык" control={<span className="text-[13px] text-ink-muted">Русский</span>} />
        <button type="button" onClick={() => void logout()} className="flex w-full items-center justify-between px-5 py-4 text-left">
          <span className="flex items-center gap-3 text-[14px] text-red-600"><LogOut size={18} />Выйти</span>
        </button>
      </div>
    </div>
  );
}

function syncLabel(status: "loading" | "saving" | "synced" | "error") {
  if (status === "saving") return "Сохранение…";
  if (status === "synced") return "Синхронизировано";
  if (status === "error") return "Ошибка";
  return "Подключение…";
}

function SettingsRow({ icon, label, control }: { icon: ReactNode; label: string; control: ReactNode }) {
  return <div className="flex items-center justify-between px-5 py-4"><div className="flex items-center gap-3 text-[14px] text-ink"><span className="text-ink-secondary">{icon}</span>{label}</div>{control}</div>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return <button onClick={onChange} aria-pressed={checked} className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-accent" : "bg-line-strong"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} /></button>;
}
