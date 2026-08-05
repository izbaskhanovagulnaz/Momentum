import type {
  Goal,
  GoalChecklistItem,
  GoalPhoto,
  GoalProgressEntry,
  GoalTrackingType,
} from "./types";

export const GOAL_TYPE_LABEL: Record<GoalTrackingType, string> = {
  accumulative: "Накопительная",
  measurement: "Измеряемая",
  checklist: "Чек-лист",
};

export const GOAL_TYPE_DESCRIPTION: Record<GoalTrackingType, string> = {
  accumulative: "Деньги, книги, клиенты, тренировки, километры и уроки",
  measurement: "Вес, процент жира, давление и другие показатели",
  checklist: "Ремонт, переезд, запуск проекта или открытие бизнеса",
};

export const GOAL_PERIOD_LABEL: Record<Goal["period"], string> = {
  week: "Неделя",
  month: "Месяц",
  year: "Год",
};

export function sortGoalEntries(entries: GoalProgressEntry[]) {
  return [...entries].sort((a, b) => {
    const dateOrder = b.date.localeCompare(a.date);
    if (dateOrder !== 0) return dateOrder;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function latestGoalEntry(goal: Goal) {
  return sortGoalEntries(goal.entries)[0] ?? null;
}

export function calculateGoalCurrent(goal: Goal) {
  if (goal.trackingType === "checklist") {
    return goal.checklistItems.filter((item) => item.done).length;
  }

  if (goal.trackingType === "measurement") {
    return latestGoalEntry(goal)?.value ?? goal.startValue;
  }

  return goal.startValue + goal.entries.reduce((sum, entry) => sum + entry.value, 0);
}

export function calculateGoalTarget(goal: Goal) {
  if (goal.trackingType === "checklist") return goal.checklistItems.length;
  return Math.max(0, goal.targetValue);
}

export function calculateGoalProgress(goal: Goal) {
  const current = calculateGoalCurrent(goal);
  const target = calculateGoalTarget(goal);

  if (goal.trackingType === "checklist") {
    if (target === 0) return 0;
    return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
  }

  if (goal.trackingType === "measurement") {
    const start = goal.startValue;
    if (start === target) return 100;
    const raw = ((current - start) / (target - start)) * 100;
    return Math.min(100, Math.max(0, Math.round(raw)));
  }

  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

export function isGoalCompleted(goal: Goal) {
  if (goal.trackingType === "checklist") {
    return goal.checklistItems.length > 0 && goal.checklistItems.every((item) => item.done);
  }

  const current = calculateGoalCurrent(goal);
  if (goal.trackingType === "measurement" && goal.startValue > goal.targetValue) {
    return current <= goal.targetValue;
  }
  return current >= goal.targetValue;
}

export function recalculateGoal(goal: Goal): Goal {
  const currentValue = calculateGoalCurrent(goal);
  const targetValue = goal.trackingType === "checklist"
    ? goal.checklistItems.length
    : Math.max(0, goal.targetValue);
  const unit = goal.trackingType === "checklist" ? "этапов" : goal.unit;
  return { ...goal, currentValue, targetValue, unit };
}

export function normalizeGoal(raw: Partial<Goal> & Record<string, unknown>, today: string): Goal {
  const createdAt = typeof raw.createdAt === "string" && raw.createdAt
    ? raw.createdAt
    : new Date().toISOString();
  const trackingType: GoalTrackingType = raw.trackingType === "measurement" || raw.trackingType === "checklist"
    ? raw.trackingType
    : "accumulative";

  const rawEntries = Array.isArray(raw.entries) ? raw.entries : [];
  const entries: GoalProgressEntry[] = rawEntries
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const source = entry as unknown as Record<string, unknown>;
      const value = Number(source.value ?? source.amount);
      if (!Number.isFinite(value)) return null;
      return {
        id: typeof source.id === "string" && source.id ? source.id : `entry-${index}-${createdAt}`,
        value,
        date: typeof source.date === "string" && source.date ? source.date : today,
        note: typeof source.note === "string"
          ? source.note
          : typeof source.source === "string"
            ? source.source
            : "",
        createdAt: typeof source.createdAt === "string" && source.createdAt
          ? source.createdAt
          : createdAt,
      } satisfies GoalProgressEntry;
    })
    .filter((entry): entry is GoalProgressEntry => entry !== null);

  const checklistItems: GoalChecklistItem[] = Array.isArray(raw.checklistItems)
    ? raw.checklistItems
        .map((item, index) => {
          if (!item || typeof item !== "object") return null;
          const source = item as unknown as Record<string, unknown>;
          const title = typeof source.title === "string" ? source.title.trim() : "";
          if (!title) return null;
          const done = Boolean(source.done);
          return {
            id: typeof source.id === "string" && source.id ? source.id : `item-${index}-${createdAt}`,
            title,
            done,
            createdAt: typeof source.createdAt === "string" && source.createdAt
              ? source.createdAt
              : createdAt,
            completedAt: done && typeof source.completedAt === "string"
              ? source.completedAt
              : "",
          } satisfies GoalChecklistItem;
        })
        .filter((item): item is GoalChecklistItem => item !== null)
    : [];

  const gallery: GoalPhoto[] = Array.isArray(raw.gallery)
    ? raw.gallery
        .map((photo, index) => {
          if (!photo || typeof photo !== "object") return null;
          const source = photo as unknown as Record<string, unknown>;
          const dataUrl = typeof source.dataUrl === "string" ? source.dataUrl : "";
          if (!dataUrl) return null;
          return {
            id: typeof source.id === "string" && source.id ? source.id : `photo-${index}-${createdAt}`,
            dataUrl,
            date: typeof source.date === "string" && source.date ? source.date : today,
            caption: typeof source.caption === "string" ? source.caption : "",
            createdAt: typeof source.createdAt === "string" && source.createdAt
              ? source.createdAt
              : createdAt,
          } satisfies GoalPhoto;
        })
        .filter((photo): photo is GoalPhoto => photo !== null)
        .slice(0, 5)
    : [];

  const legacyCurrent = Number(raw.currentValue) || 0;
  const explicitStart = Number(raw.startValue);
  const startValue = Number.isFinite(explicitStart)
    ? explicitStart
    : trackingType === "accumulative" && entries.length === 0
      ? Math.max(0, legacyCurrent)
      : legacyCurrent;

  const normalized: Goal = {
    id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Новая цель",
    description: typeof raw.description === "string" ? raw.description : "",
    period: raw.period === "week" || raw.period === "year" ? raw.period : "month",
    trackingType,
    startValue: Number.isFinite(startValue) ? startValue : 0,
    currentValue: legacyCurrent,
    targetValue: Math.max(
      trackingType === "checklist" ? checklistItems.length : 0,
      Number(raw.targetValue) || (trackingType === "checklist" ? checklistItems.length : 1),
    ),
    unit: trackingType === "checklist"
      ? "этапов"
      : typeof raw.unit === "string"
        ? raw.unit
        : "",
    deadline: typeof raw.deadline === "string" ? raw.deadline : "",
    imageDataUrl: typeof raw.imageDataUrl === "string" ? raw.imageDataUrl : "",
    createdAt,
    entries,
    checklistItems,
    gallery,
  };

  return recalculateGoal(normalized);
}

export function formatGoalValue(value: number, unit: string) {
  const formatted = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value);
  if (unit === "$") return `$${formatted}`;
  if (unit === "₽") return `${formatted} ₽`;
  if (unit === "сум") return `${formatted} сум`;
  return `${formatted}${unit ? ` ${unit}` : ""}`;
}

export function goalPrimaryAction(goal: Goal) {
  if (goal.trackingType === "measurement") return "Новое измерение";
  if (goal.trackingType === "checklist") return "Добавить этап";
  return "Добавить прогресс";
}

export function goalCurrentLabel(goal: Goal) {
  if (goal.trackingType === "measurement") return "Сейчас";
  if (goal.trackingType === "checklist") return "Выполнено";
  return "Накоплено";
}
