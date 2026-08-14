import { useCallback, useEffect, useState } from "react";
import type { HolidayRegion } from "./holidays";

export interface CalendarSettings {
  /** Чей производственный календарь показывать. */
  region: HolidayRegion;
  /** Границы рабочего дня — вне них часы приглушаются. */
  dayStart: number;
  dayEnd: number;
  /** Шаг сетки часов в минутах. */
  step: 15 | 30 | 60;
  /** Сворачивать ночные часы, пока в них нет задач. */
  collapseNight: boolean;
}

const STORAGE_KEY = "momentum-calendar-settings";

const DEFAULTS: CalendarSettings = {
  region: "uz",
  dayStart: 8,
  dayEnd: 22,
  step: 30,
  collapseNight: true,
};

function read(): CalendarSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<CalendarSettings>;
    const dayStart = clampHour(parsed.dayStart, DEFAULTS.dayStart);
    const dayEnd = clampHour(parsed.dayEnd, DEFAULTS.dayEnd);
    return {
      region: parsed.region === "ru" || parsed.region === "off" ? parsed.region : "uz",
      dayStart: Math.min(dayStart, 23),
      dayEnd: Math.max(dayEnd, dayStart + 1),
      step: parsed.step === 15 || parsed.step === 60 ? parsed.step : 30,
      collapseNight: parsed.collapseNight !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

function clampHour(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(24, Math.max(0, Math.round(numeric)));
}

export function useCalendarSettings() {
  const [settings, setSettings] = useState<CalendarSettings>(read);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Приватный режим — настройки просто не переживут перезагрузку.
    }
  }, [settings]);

  const update = useCallback((patch: Partial<CalendarSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      if (next.dayEnd <= next.dayStart) next.dayEnd = Math.min(24, next.dayStart + 1);
      return next;
    });
  }, []);

  return { settings, update };
}
