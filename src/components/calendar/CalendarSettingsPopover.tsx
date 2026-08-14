import { useEffect, useRef } from "react";
import type { CalendarSettings } from "../../calendar/useCalendarSettings";
import { REGION_LABELS } from "../../calendar/holidays";
import type { HolidayRegion } from "../../calendar/holidays";

interface CalendarSettingsPopoverProps {
  settings: CalendarSettings;
  onChange: (patch: Partial<CalendarSettings>) => void;
  onClose: () => void;
}

const STEPS: CalendarSettings["step"][] = [15, 30, 60];

export default function CalendarSettingsPopover({
  settings,
  onChange,
  onClose,
}: CalendarSettingsPopoverProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-40 mt-2 w-[280px] rounded-2xl border border-line-strong bg-white p-4 shadow-xl"
    >
      <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-ink-muted">Праздники</p>
      <div className="mb-4 grid grid-cols-3 gap-1">
        {(Object.keys(REGION_LABELS) as HolidayRegion[]).map((region) => (
          <button
            key={region}
            type="button"
            onClick={() => onChange({ region })}
            className={`h-9 rounded-xl border text-[12px] font-medium transition ${
              settings.region === region
                ? "border-accent bg-accent-soft text-accent"
                : "border-line-strong text-ink-secondary"
            }`}
          >
            {region === "off" ? "Нет" : REGION_LABELS[region]}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-ink-muted">Рабочие часы</p>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={23}
          value={settings.dayStart}
          onChange={(event) => onChange({ dayStart: Number(event.target.value) })}
          className="h-10 w-full rounded-xl border border-line-strong px-3 text-[13px] outline-none"
          aria-label="Начало рабочего дня"
        />
        <span className="text-[12px] text-ink-muted">—</span>
        <input
          type="number"
          min={1}
          max={24}
          value={settings.dayEnd}
          onChange={(event) => onChange({ dayEnd: Number(event.target.value) })}
          className="h-10 w-full rounded-xl border border-line-strong px-3 text-[13px] outline-none"
          aria-label="Конец рабочего дня"
        />
      </div>

      <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-ink-muted">Шаг сетки</p>
      <div className="mb-4 grid grid-cols-3 gap-1">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onChange({ step })}
            className={`h-9 rounded-xl border text-[12px] font-medium transition ${
              settings.step === step
                ? "border-accent bg-accent-soft text-accent"
                : "border-line-strong text-ink-secondary"
            }`}
          >
            {step} мин
          </button>
        ))}
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="text-[13px] text-ink">Сворачивать ночь</span>
        <button
          type="button"
          onClick={() => onChange({ collapseNight: !settings.collapseNight })}
          aria-pressed={settings.collapseNight}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            settings.collapseNight ? "bg-accent" : "bg-line-strong"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              settings.collapseNight ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>
    </div>
  );
}
