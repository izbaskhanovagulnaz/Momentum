export interface Task {
  id: string;
  title: string;
  done: boolean;
  date: string;
  time?: string;
  priority?: "high" | "normal" | "low";
}

export type GoalTrackingType = "accumulative" | "measurement" | "checklist";

export interface GoalProgressEntry {
  id: string;
  value: number;
  date: string;
  note: string;
  createdAt: string;
}

// Compatibility alias used by older components and migrated Firestore data.
export type GoalEntry = GoalProgressEntry;

export interface GoalChecklistItem {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  completedAt: string;
}

export interface GoalPhoto {
  id: string;
  dataUrl: string;
  date: string;
  caption: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  period: "week" | "month" | "year";
  trackingType: GoalTrackingType;
  startValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline: string;
  imageDataUrl: string;
  createdAt: string;
  entries: GoalProgressEntry[];
  checklistItems: GoalChecklistItem[];
  gallery: GoalPhoto[];
}

export interface GoalCreateInput {
  title: string;
  description: string;
  period: Goal["period"];
  trackingType: GoalTrackingType;
  startValue: number;
  targetValue: number;
  unit: string;
  deadline: string;
  imageDataUrl: string;
}

export interface NoteItem {
  id: string;
  text: string;
  timestamp: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  type?: "meeting" | "task" | "reminder";
  location?: string;
}

export interface SaleEntry {
  id: string;
  source: string;
  amount: number;
  date: string;
}

export interface SalesMonthPlan {
  id: string;
  label: string;
  startDate: string;
  targetAmount: number;
  deadline: string;
  monthStartDay: number;
  entries: SaleEntry[];
}

export interface SalesPlan {
  activeMonthId: string;
  months: SalesMonthPlan[];
  startDate: string;
  targetAmount: number;
  deadline: string;
  monthStartDay: number;
  entries: SaleEntry[];
}
