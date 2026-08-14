import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import {
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Flag,
  Gauge,
  GripVertical,
  ImagePlus,
  ListChecks,
  Pencil,
  Plus,
  Ruler,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import TopBar from "../components/TopBar";
import { usePlanner } from "../PlannerContext";
import {
  calculateGoalCurrent,
  calculateGoalProgress,
  calculateGoalTarget,
  formatGoalValue,
  GOAL_PERIOD_LABEL,
  GOAL_TYPE_DESCRIPTION,
  GOAL_TYPE_LABEL,
  goalCurrentLabel,
  goalPrimaryAction,
  isGoalCompleted,
  latestGoalEntry,
  sortGoalEntries,
} from "../goalUtils";
import type {
  Goal,
  GoalChecklistItem,
  GoalCreateInput,
  GoalPhoto,
  GoalProgressEntry,
  GoalTrackingType,
} from "../types";
import { localDate } from "../utils";

type GoalFilter = "all" | "active" | "completed";

type GoalEditorForm = GoalCreateInput;

interface EntryEditorState {
  goalId: string;
  entryId?: string;
  value: string;
  date: string;
  note: string;
}

interface ChecklistEditorState {
  goalId: string;
  itemId?: string;
  title: string;
}

interface PhotoEditorState {
  goalId: string;
  photoId?: string;
  dataUrl: string;
  date: string;
  caption: string;
  loading: boolean;
  error: string;
}

const EMPTY_FORM: GoalEditorForm = {
  title: "",
  description: "",
  period: "month",
  trackingType: "accumulative",
  startValue: 0,
  targetValue: 100,
  unit: "$",
  deadline: "",
  imageDataUrl: "",
};

const TYPE_ICONS: Record<GoalTrackingType, typeof TrendingUp> = {
  accumulative: TrendingUp,
  measurement: Gauge,
  checklist: ListChecks,
};

const UNIT_PRESETS = ["$", "₽", "сум", "кг", "%", "книг", "клиентов", "тренировок", "км", "уроков"];

function formatDate(value?: string) {
  if (!value) return "Без даты";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function latestGoalPhoto(goal: Goal) {
  return [...goal.gallery].sort((a, b) => {
    const dateOrder = b.date.localeCompare(a.date);
    if (dateOrder !== 0) return dateOrder;
    return b.createdAt.localeCompare(a.createdAt);
  })[0] ?? null;
}

function goalCover(goal: Goal) {
  return latestGoalPhoto(goal)?.dataUrl || goal.imageDataUrl || "";
}

function latestChecklistActivity(goal: Goal) {
  return [...goal.checklistItems]
    .filter((item) => item.done && item.completedAt)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0] ?? null;
}

function progressSummary(goal: Goal) {
  const current = calculateGoalCurrent(goal);
  const target = calculateGoalTarget(goal);

  if (goal.trackingType === "measurement") {
    return `${formatGoalValue(current, goal.unit)} → ${formatGoalValue(target, goal.unit)}`;
  }

  return `${formatGoalValue(current, goal.unit)} из ${formatGoalValue(target, goal.unit)}`;
}

function activityLabel(goal: Goal) {
  if (goal.trackingType === "checklist") {
    const item = latestChecklistActivity(goal);
    return item ? `Этап выполнен: ${item.title}` : "Пока нет выполненных этапов";
  }

  const entry = latestGoalEntry(goal);
  if (!entry) return "Пока нет записей прогресса";

  if (goal.trackingType === "measurement") {
    return `${formatGoalValue(entry.value, goal.unit)}${entry.note ? ` · ${entry.note}` : ""}`;
  }

  return `+${formatGoalValue(entry.value, goal.unit)}${entry.note ? ` · ${entry.note}` : ""}`;
}

async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Выберите изображение");

  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать фото"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Не удалось открыть фото"));
    element.src = source;
  });

  const maxSide = 640;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Не удалось обработать фото");
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.68;
  let result = canvas.toDataURL("image/jpeg", quality);
  while (result.length > 85_000 && quality > 0.28) {
    quality -= 0.06;
    result = canvas.toDataURL("image/jpeg", quality);
  }

  if (result.length > 120_000) {
    throw new Error("Фото слишком большое. Выберите другое изображение.");
  }

  return result;
}

function trackingIcon(type: GoalTrackingType) {
  if (type === "measurement") return Ruler;
  if (type === "checklist") return Flag;
  return TrendingUp;
}

function unitSuggestion(type: GoalTrackingType) {
  if (type === "measurement") return "кг";
  if (type === "checklist") return "этапов";
  return "$";
}

export default function Goals() {
  const {
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    reorderGoals,
    addGoalEntry,
    updateGoalEntry,
    deleteGoalEntry,
    addGoalChecklistItem,
    updateGoalChecklistItem,
    toggleGoalChecklistItem,
    deleteGoalChecklistItem,
    addGoalPhoto,
    updateGoalPhoto,
    deleteGoalPhoto,
  } = usePlanner();

  const [filter, setFilter] = useState<GoalFilter>("all");
  const [detailGoalId, setDetailGoalId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalEditorForm>(EMPTY_FORM);
  const [initialSteps, setInitialSteps] = useState("");
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [entryEditor, setEntryEditor] = useState<EntryEditorState | null>(null);
  const [checklistEditor, setChecklistEditor] = useState<ChecklistEditorState | null>(null);
  const [photoEditor, setPhotoEditor] = useState<PhotoEditorState | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null);
  const [dragOverGoalId, setDragOverGoalId] = useState<string | null>(null);
  const pointerDragRef = useRef<{
    pointerId: number;
    sourceId: string;
    targetId: string;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);

  const detailGoal = goals.find((goal) => goal.id === detailGoalId) ?? null;
  const editingGoal = goals.find((goal) => goal.id === editingGoalId) ?? null;

  const completedCount = useMemo(
    () => goals.filter((goal) => isGoalCompleted(goal)).length,
    [goals],
  );

  const averageProgress = useMemo(() => {
    if (!goals.length) return 0;
    return Math.round(
      goals.reduce((sum, goal) => sum + calculateGoalProgress(goal), 0) / goals.length,
    );
  }, [goals]);

  const visibleGoals = useMemo(() => {
    if (filter === "completed") return goals.filter((goal) => isGoalCompleted(goal));
    if (filter === "active") return goals.filter((goal) => !isGoalCompleted(goal));
    return goals;
  }, [filter, goals]);

  const finishGoalReorder = (sourceId?: string | null, targetId?: string | null) => {
    if (sourceId && targetId && sourceId !== targetId) {
      reorderGoals(sourceId, targetId);
    }
    setDraggingGoalId(null);
    setDragOverGoalId(null);
    pointerDragRef.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  };

  const startPointerReorder = (
    event: ReactPointerEvent<HTMLButtonElement>,
    goalId: string,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    pointerDragRef.current = {
      pointerId: event.pointerId,
      sourceId: goalId,
      targetId: goalId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = pointerDragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      const distance = Math.hypot(
        event.clientX - drag.startX,
        event.clientY - drag.startY,
      );

      if (!drag.active && distance < 5) return;

      if (!drag.active) {
        drag.active = true;
        setDraggingGoalId(drag.sourceId);
        setDragOverGoalId(drag.sourceId);
      }

      event.preventDefault();

      const element = document.elementFromPoint(
        event.clientX,
        event.clientY,
      ) as HTMLElement | null;
      const card = element?.closest<HTMLElement>("[data-goal-id]");
      const targetId = card?.dataset.goalId;

      if (targetId && targetId !== drag.targetId) {
        drag.targetId = targetId;
        setDragOverGoalId(targetId);
      }
    };

    const onPointerEnd = (event: PointerEvent) => {
      const drag = pointerDragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      if (drag.active) {
        event.preventDefault();
        finishGoalReorder(drag.sourceId, drag.targetId);
      } else {
        finishGoalReorder();
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerEnd, { passive: false });
    window.addEventListener("pointercancel", onPointerEnd, { passive: false });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [reorderGoals]);

  const openCreate = () => {
    setEditingGoalId(null);
    setForm({ ...EMPTY_FORM });
    setInitialSteps("");
    setCoverError("");
    setEditorOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setForm({
      title: goal.title,
      description: goal.description,
      period: goal.period,
      trackingType: goal.trackingType,
      startValue: goal.startValue,
      targetValue: goal.targetValue,
      unit: goal.unit,
      deadline: goal.deadline,
      imageDataUrl: goal.imageDataUrl,
    });
    setInitialSteps("");
    setCoverError("");
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingGoalId(null);
    setCoverError("");
  };

  const changeTrackingType = (trackingType: GoalTrackingType) => {
    setForm((current) => ({
      ...current,
      trackingType,
      startValue: trackingType === "checklist" ? 0 : current.startValue,
      targetValue: trackingType === "checklist" ? 0 : Math.max(1, current.targetValue || 1),
      unit: unitSuggestion(trackingType),
    }));
  };

  const saveGoal = () => {
    const title = form.title.trim();
    if (!title) return;
    if (form.trackingType !== "checklist" && !Number.isFinite(Number(form.targetValue))) return;

    const payload: GoalCreateInput = {
      ...form,
      title,
      description: form.description.trim(),
      startValue: form.trackingType === "checklist" ? 0 : Number(form.startValue) || 0,
      targetValue: form.trackingType === "checklist" ? 0 : Number(form.targetValue) || 0,
      unit: form.trackingType === "checklist" ? "этапов" : form.unit.trim(),
    };

    if (editingGoal) {
      updateGoal(editingGoal.id, {
        ...payload,
        entries: editingGoal.trackingType === payload.trackingType ? editingGoal.entries : [],
        checklistItems:
          payload.trackingType === "checklist" && editingGoal.trackingType === "checklist"
            ? editingGoal.checklistItems
            : [],
        gallery: editingGoal.gallery,
      });
      setDetailGoalId(editingGoal.id);
    } else {
      const goalId = addGoal(payload);
      if (payload.trackingType === "checklist") {
        initialSteps
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 20)
          .forEach((item) => addGoalChecklistItem(goalId, item));
      }
      setDetailGoalId(goalId);
    }

    closeEditor();
  };

  const selectCover = async (file?: File) => {
    if (!file) return;
    setCoverLoading(true);
    setCoverError("");
    try {
      const imageDataUrl = await compressImage(file);
      setForm((current) => ({ ...current, imageDataUrl }));
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : "Не удалось загрузить фото");
    } finally {
      setCoverLoading(false);
    }
  };

  const confirmDeleteGoal = (goal: Goal) => {
    if (!window.confirm(`Удалить цель «${goal.title}»?`)) return;
    deleteGoal(goal.id);
    if (detailGoalId === goal.id) setDetailGoalId(null);
  };

  const openEntryEditor = (goal: Goal, entry?: GoalProgressEntry) => {
    setEntryEditor({
      goalId: goal.id,
      entryId: entry?.id,
      value: entry ? String(entry.value) : "",
      date: entry?.date || localDate(),
      note: entry?.note || "",
    });
  };

  const saveEntry = () => {
    if (!entryEditor) return;
    const goal = goals.find((item) => item.id === entryEditor.goalId);
    if (!goal) return;
    const value = Number(entryEditor.value);
    if (!Number.isFinite(value)) return;
    if (goal.trackingType === "accumulative" && value <= 0) return;

    if (entryEditor.entryId) {
      updateGoalEntry(
        goal.id,
        entryEditor.entryId,
        value,
        entryEditor.date,
        entryEditor.note,
      );
    } else {
      addGoalEntry(goal.id, value, entryEditor.date, entryEditor.note);
    }
    setEntryEditor(null);
  };

  const openChecklistEditor = (goal: Goal, item?: GoalChecklistItem) => {
    setChecklistEditor({
      goalId: goal.id,
      itemId: item?.id,
      title: item?.title || "",
    });
  };

  const saveChecklistItem = () => {
    if (!checklistEditor) return;
    const title = checklistEditor.title.trim();
    if (!title) return;
    if (checklistEditor.itemId) {
      updateGoalChecklistItem(checklistEditor.goalId, checklistEditor.itemId, title);
    } else {
      addGoalChecklistItem(checklistEditor.goalId, title);
    }
    setChecklistEditor(null);
  };

  const openPhotoEditor = (goal: Goal, photo?: GoalPhoto) => {
    setPhotoEditor({
      goalId: goal.id,
      photoId: photo?.id,
      dataUrl: photo?.dataUrl || "",
      date: photo?.date || localDate(),
      caption: photo?.caption || "",
      loading: false,
      error: "",
    });
  };

  const selectGalleryPhoto = async (file?: File) => {
    if (!file || !photoEditor) return;
    setPhotoEditor((current) => (current ? { ...current, loading: true, error: "" } : current));
    try {
      const dataUrl = await compressImage(file);
      setPhotoEditor((current) => (current ? { ...current, dataUrl, loading: false } : current));
    } catch (error) {
      setPhotoEditor((current) =>
        current
          ? {
              ...current,
              loading: false,
              error: error instanceof Error ? error.message : "Не удалось загрузить фото",
            }
          : current,
      );
    }
  };

  const savePhoto = () => {
    if (!photoEditor || !photoEditor.dataUrl || !photoEditor.date) return;
    if (photoEditor.photoId) {
      updateGoalPhoto(
        photoEditor.goalId,
        photoEditor.photoId,
        photoEditor.dataUrl,
        photoEditor.date,
        photoEditor.caption,
      );
    } else {
      addGoalPhoto(
        photoEditor.goalId,
        photoEditor.dataUrl,
        photoEditor.date,
        photoEditor.caption,
      );
    }
    setPhotoEditor(null);
  };

  return (
    <div>
      <TopBar eyebrow="Мотивация и прогресс" title="Цели" />

      <section className="mb-3 rounded-2xl border border-line-strong bg-gradient-to-r from-[#f1edff] to-[#edf7ff] p-3 shadow-sm md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-ink">Держи цель перед глазами</p>
            <p className="mt-0.5 truncate text-[11px] text-ink-muted">
              Фото, этапы и история помогают видеть движение
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[18px] font-semibold text-ink">{averageProgress}%</p>
            <p className="text-[10px] text-ink-muted">средний прогресс</p>
          </div>
        </div>
      </section>

      <section className="mb-4 hidden overflow-hidden rounded-3xl border border-line-strong bg-gradient-to-br from-[#f1edff] via-white to-[#edf7ff] p-7 shadow-sm md:block">
        <div className="flex items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white shadow-sm">
              <Sparkles size={21} />
            </div>
            <h2 className="text-[30px] font-semibold tracking-tight text-ink">
              Визуализируй то, к чему идёшь
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
              Накопления, измерения, этапы и фотографии — в одном журнале прогресса.
            </p>
          </div>
          <div className="grid min-w-[330px] grid-cols-3 gap-2">
            {[
              ["Всего", goals.length],
              ["Готово", completedCount],
              ["Прогресс", `${averageProgress}%`],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-white/80 bg-white/75 p-3 backdrop-blur">
                <p className="text-[11px] text-ink-muted">{label}</p>
                <p className="mt-1 text-[22px] font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            ["all", "Все", goals.length],
            ["active", "Активные", goals.length - completedCount],
            ["completed", "Завершённые", completedCount],
          ] as const).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-medium transition ${
                filter === value
                  ? "border-accent bg-accent text-white"
                  : "border-line-strong bg-white text-ink-secondary"
              }`}
            >
              {label} · {count}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-[14px] font-medium text-white shadow-sm"
        >
          <Plus size={18} />
          Новая цель
        </button>
      </div>

      {visibleGoals.length === 0 ? (
        <button
          type="button"
          onClick={openCreate}
          className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-line-strong bg-surface-subtle p-8 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-accent">
            <Target size={30} />
          </div>
          <h3 className="mt-5 text-[20px] font-semibold text-ink">Добавь цель, которая вдохновляет</h3>
          <p className="mt-2 max-w-sm text-[14px] leading-6 text-ink-muted">
            Выбери тип отслеживания, добавь фото и начни фиксировать прогресс.
          </p>
        </button>
      ) : (
        <div>
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-line-strong bg-white px-4 py-3 text-[12px] text-ink-muted shadow-sm">
            <GripVertical size={16} className="text-accent" />
            <span>Зажми ручку на карточке и перетащи цель на новое место</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleGoals.map((goal) => {
            const progress = calculateGoalProgress(goal);
            const completed = isGoalCompleted(goal);
            const TypeIcon = trackingIcon(goal.trackingType);
            const cover = goalCover(goal);
            const latestPhoto = latestGoalPhoto(goal);

            return (
              <article
                key={goal.id}
                data-goal-id={goal.id}
                className={`group relative overflow-hidden rounded-3xl border bg-white shadow-sm transition ${
                  draggingGoalId === goal.id ? "scale-[0.98] opacity-55" : "hover:-translate-y-0.5 hover:shadow-md"
                } ${dragOverGoalId === goal.id && draggingGoalId !== goal.id ? "border-accent ring-2 ring-accent/20" : "border-line-strong"}`}
              >
                <button
                  type="button"
                  onPointerDown={(event) => startPointerReorder(event, goal.id)}
                  onClick={(event) => event.stopPropagation()}
                  className="absolute right-3 top-3 z-30 flex h-10 w-10 touch-none select-none items-center justify-center rounded-2xl bg-white/95 text-ink shadow-md backdrop-blur cursor-grab active:cursor-grabbing active:scale-95"
                  aria-label="Перетащить цель"
                  title="Перетащить цель"
                >
                  <GripVertical size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setDetailGoalId(goal.id)}
                  className="relative block h-40 w-full overflow-hidden bg-gradient-to-br from-[#6657f5] via-[#765cf5] to-[#a574f5] text-left md:h-48"
                >
                  {cover ? (
                    <img src={cover} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <TypeIcon size={52} className="text-white/70" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/10" />
                  <div className="absolute left-4 top-4 flex gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-medium text-ink backdrop-blur">
                      {GOAL_TYPE_LABEL[goal.trackingType]}
                    </span>
                    <span className="rounded-full bg-black/25 px-3 py-1.5 text-[11px] text-white backdrop-blur">
                      {GOAL_PERIOD_LABEL[goal.period]}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[20px] font-semibold leading-6 tracking-tight">{goal.title}</p>
                      <p className="mt-1 truncate text-[11px] text-white/75">
                        {latestPhoto ? `Фото от ${formatDate(latestPhoto.date)}` : activityLabel(goal)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-black/30 px-3 py-1.5 text-[13px] font-semibold backdrop-blur">
                      {progress}%
                    </span>
                  </div>
                </button>

                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.1em] text-ink-muted">
                        {goalCurrentLabel(goal)}
                      </p>
                      <p className="mt-1 text-[15px] font-semibold text-ink">{progressSummary(goal)}</p>
                    </div>
                    {completed && (
                      <span className="flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-medium text-success">
                        <Check size={13} /> Готово
                      </span>
                    )}
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-subtle">
                    <div
                      className={`h-full rounded-full transition-all ${completed ? "bg-success" : "bg-accent"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (goal.trackingType === "checklist") openChecklistEditor(goal);
                        else openEntryEditor(goal);
                      }}
                      className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-3 text-[13px] font-medium text-white shadow-sm"
                    >
                      <Plus size={17} />
                      {goalPrimaryAction(goal)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailGoalId(goal.id)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line-strong bg-white text-ink-secondary"
                      aria-label="Открыть цель"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-[11px] text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={14} /> {formatDate(goal.deadline)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Camera size={14} /> {goal.gallery.length}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
          </div>
        </div>
      )}

      {detailGoal && (
        <GoalDetailSheet
          goal={detailGoal}
          onClose={() => setDetailGoalId(null)}
          onEdit={() => openEdit(detailGoal)}
          onDelete={() => confirmDeleteGoal(detailGoal)}
          onAddProgress={() => openEntryEditor(detailGoal)}
          onEditEntry={(entry) => openEntryEditor(detailGoal, entry)}
          onDeleteEntry={(entry) => deleteGoalEntry(detailGoal.id, entry.id)}
          onAddChecklistItem={() => openChecklistEditor(detailGoal)}
          onEditChecklistItem={(item) => openChecklistEditor(detailGoal, item)}
          onToggleChecklistItem={(item) => toggleGoalChecklistItem(detailGoal.id, item.id)}
          onDeleteChecklistItem={(item) => deleteGoalChecklistItem(detailGoal.id, item.id)}
          onAddPhoto={() => openPhotoEditor(detailGoal)}
          onEditPhoto={(photo) => openPhotoEditor(detailGoal, photo)}
          onDeletePhoto={(photo) => deleteGoalPhoto(detailGoal.id, photo.id)}
        />
      )}

      {editorOpen && (
        <GoalEditorSheet
          form={form}
          setForm={setForm}
          editing={Boolean(editingGoal)}
          initialSteps={initialSteps}
          setInitialSteps={setInitialSteps}
          coverLoading={coverLoading}
          coverError={coverError}
          coverInputRef={coverInputRef}
          onSelectCover={selectCover}
          onChangeTrackingType={changeTrackingType}
          onClose={closeEditor}
          onSave={saveGoal}
        />
      )}

      {entryEditor && (
        <EntryEditorSheet
          state={entryEditor}
          setState={setEntryEditor}
          goal={goals.find((goal) => goal.id === entryEditor.goalId) ?? null}
          onClose={() => setEntryEditor(null)}
          onSave={saveEntry}
        />
      )}

      {checklistEditor && (
        <ChecklistEditorSheet
          state={checklistEditor}
          setState={setChecklistEditor}
          onClose={() => setChecklistEditor(null)}
          onSave={saveChecklistItem}
        />
      )}

      {photoEditor && (
        <PhotoEditorSheet
          state={photoEditor}
          setState={setPhotoEditor}
          inputRef={photoInputRef}
          onSelectPhoto={selectGalleryPhoto}
          onClose={() => setPhotoEditor(null)}
          onSave={savePhoto}
        />
      )}
    </div>
  );
}

interface GoalDetailSheetProps {
  goal: Goal;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddProgress: () => void;
  onEditEntry: (entry: GoalProgressEntry) => void;
  onDeleteEntry: (entry: GoalProgressEntry) => void;
  onAddChecklistItem: () => void;
  onEditChecklistItem: (item: GoalChecklistItem) => void;
  onToggleChecklistItem: (item: GoalChecklistItem) => void;
  onDeleteChecklistItem: (item: GoalChecklistItem) => void;
  onAddPhoto: () => void;
  onEditPhoto: (photo: GoalPhoto) => void;
  onDeletePhoto: (photo: GoalPhoto) => void;
}

function GoalDetailSheet({
  goal,
  onClose,
  onEdit,
  onDelete,
  onAddProgress,
  onEditEntry,
  onDeleteEntry,
  onAddChecklistItem,
  onEditChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onAddPhoto,
  onEditPhoto,
  onDeletePhoto,
}: GoalDetailSheetProps) {
  const progress = calculateGoalProgress(goal);
  const completed = isGoalCompleted(goal);
  const cover = goalCover(goal);
  const TypeIcon = trackingIcon(goal.trackingType);
  const entries = sortGoalEntries(goal.entries);
  const photos = [...goal.gallery].sort((a, b) => b.date.localeCompare(a.date));
  const completedSteps = [...goal.checklistItems]
    .filter((item) => item.done && item.completedAt)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  return (
    <div className="fixed inset-0 z-[120] flex items-end bg-black/40 backdrop-blur-sm md:items-center md:justify-center md:p-5" onClick={onClose}>
      <div
        className="max-h-[96dvh] w-full overflow-y-auto rounded-t-[30px] bg-white pb-[calc(22px+env(safe-area-inset-bottom))] shadow-2xl md:max-w-3xl md:rounded-3xl md:pb-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-line-strong md:hidden" />

        <div className="relative mt-3 h-48 overflow-hidden bg-gradient-to-br from-[#6657f5] via-[#765cf5] to-[#a574f5] md:mt-0 md:h-60 md:rounded-t-3xl">
          {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center"><TypeIcon size={62} className="text-white/70" /></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
          <button type="button" onClick={onClose} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur">
            <X size={18} />
          </button>
          <div className="absolute bottom-4 left-4 right-4 text-white md:bottom-6 md:left-6 md:right-6">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-ink">{GOAL_TYPE_LABEL[goal.trackingType]}</span>
              <span className="rounded-full bg-black/25 px-3 py-1 text-[11px] backdrop-blur">{GOAL_PERIOD_LABEL[goal.period]}</span>
            </div>
            <h2 className="text-[25px] font-semibold leading-7 tracking-tight md:text-[32px] md:leading-9">{goal.title}</h2>
          </div>
        </div>

        <div className="space-y-5 px-4 pt-5 md:px-6">
          <div className="rounded-3xl border border-line-strong bg-surface-subtle p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-ink-muted">{goalCurrentLabel(goal)}</p>
                <p className="mt-1 text-[20px] font-semibold text-ink">{progressSummary(goal)}</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${completed ? "bg-success-soft text-success" : "bg-accent-soft text-accent"}`}>{progress}%</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
              <div className={`h-full rounded-full ${completed ? "bg-success" : "bg-accent"}`} style={{ width: `${progress}%` }} />
            </div>
            {goal.description && <p className="mt-4 text-[13px] leading-6 text-ink-secondary">{goal.description}</p>}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-[12px] text-ink-muted">
              <span className="flex items-center gap-1.5"><CalendarDays size={15} /> {formatDate(goal.deadline)}</span>
              {completed && <span className="flex items-center gap-1.5 font-medium text-success"><CheckCircle2 size={15} /> Цель достигнута</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onEdit} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-line-strong bg-white text-[13px] font-medium text-ink"><Pencil size={16} /> Редактировать</button>
            <button type="button" onClick={onDelete} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-danger/20 bg-danger-soft text-[13px] font-medium text-danger"><Trash2 size={16} /> Удалить</button>
          </div>

          {goal.trackingType === "checklist" ? (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-ink">Этапы</p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">{goal.checklistItems.filter((item) => item.done).length} из {goal.checklistItems.length} выполнено</p>
                </div>
                <button type="button" onClick={onAddChecklistItem} className="flex h-10 items-center gap-2 rounded-2xl bg-accent px-3 text-[12px] font-medium text-white"><Plus size={16} /> Этап</button>
              </div>

              {goal.checklistItems.length === 0 ? (
                <button type="button" onClick={onAddChecklistItem} className="w-full rounded-3xl border border-dashed border-line-strong bg-surface-subtle p-7 text-center text-[13px] text-ink-muted">Добавь первый этап</button>
              ) : (
                <div className="space-y-2">
                  {goal.checklistItems.map((item) => (
                    <div key={item.id} className="group flex items-center gap-3 rounded-2xl border border-line-strong bg-white px-3 py-3 shadow-sm">
                      <button type="button" onClick={() => onToggleChecklistItem(item)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${item.done ? "border-success bg-success text-white" : "border-line-strong bg-white text-ink-muted"}`}>{item.done ? <Check size={16} /> : <Circle size={15} />}</button>
                      <button type="button" onClick={() => onEditChecklistItem(item)} className="min-w-0 flex-1 text-left">
                        <p className={`text-[14px] ${item.done ? "text-ink-muted line-through" : "text-ink"}`}>{item.title}</p>
                        {item.completedAt && <p className="mt-0.5 text-[10px] text-ink-muted">Выполнено {formatDateTime(item.completedAt)}</p>}
                      </button>
                      <button type="button" onClick={() => onDeleteChecklistItem(item)} className="flex h-9 w-9 items-center justify-center rounded-xl text-danger hover:bg-danger-soft"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}

              {completedSteps.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-[13px] font-semibold text-ink">История прогресса</p>
                  <div className="space-y-2 rounded-3xl border border-line-strong bg-surface-subtle p-3">
                    {completedSteps.slice(0, 8).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2.5">
                        <span className="min-w-0 truncate text-[12px] text-ink">Этап выполнен · {item.title}</span>
                        <span className="shrink-0 text-[10px] text-ink-muted">{formatDateTime(item.completedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-ink">История прогресса</p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">Нажми на запись, чтобы изменить</p>
                </div>
                <button type="button" onClick={onAddProgress} className="flex h-10 items-center gap-2 rounded-2xl bg-accent px-3 text-[12px] font-medium text-white"><Plus size={16} /> {goalPrimaryAction(goal)}</button>
              </div>

              {entries.length === 0 ? (
                <button type="button" onClick={onAddProgress} className="w-full rounded-3xl border border-dashed border-line-strong bg-surface-subtle p-7 text-center text-[13px] text-ink-muted">Добавь первую запись прогресса</button>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div key={entry.id} className="group flex items-center gap-3 rounded-2xl border border-line-strong bg-white px-3 py-3 shadow-sm">
                      <button type="button" onClick={() => onEditEntry(entry)} className="min-w-0 flex-1 text-left">
                        <p className="text-[14px] font-medium text-ink">{goal.trackingType === "measurement" ? formatGoalValue(entry.value, goal.unit) : `+${formatGoalValue(entry.value, goal.unit)}`}</p>
                        <p className="mt-0.5 truncate text-[11px] text-ink-muted">{formatDate(entry.date)}{entry.note ? ` · ${entry.note}` : ""}</p>
                      </button>
                      <button type="button" onClick={() => onDeleteEntry(entry)} className="flex h-9 w-9 items-center justify-center rounded-xl text-danger hover:bg-danger-soft"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-ink">Галерея прогресса</p>
                <p className="mt-0.5 text-[11px] text-ink-muted">До 8 фотографий с датой и подписью</p>
              </div>
              <button type="button" onClick={onAddPhoto} disabled={goal.gallery.length >= 8} className="flex h-10 items-center gap-2 rounded-2xl bg-ink px-3 text-[12px] font-medium text-white disabled:opacity-40"><ImagePlus size={16} /> Фото</button>
            </div>

            {photos.length === 0 ? (
              <button type="button" onClick={onAddPhoto} className="flex min-h-32 w-full flex-col items-center justify-center rounded-3xl border border-dashed border-line-strong bg-surface-subtle text-center text-[13px] text-ink-muted"><Camera size={24} className="mb-2 text-accent" /> Добавь первое фото прогресса</button>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-line-strong bg-surface-subtle">
                    <img src={photo.dataUrl} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
                    <button type="button" onClick={() => onEditPhoto(photo)} className="absolute inset-0 text-left">
                      <span className="absolute bottom-2 left-2 right-9 line-clamp-2 text-[10px] text-white">{photo.caption || formatDate(photo.date)}</span>
                    </button>
                    <button type="button" onClick={() => onDeletePhoto(photo)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-danger shadow-sm"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

interface GoalEditorSheetProps {
  form: GoalEditorForm;
  setForm: (value: GoalEditorForm | ((current: GoalEditorForm) => GoalEditorForm)) => void;
  editing: boolean;
  initialSteps: string;
  setInitialSteps: (value: string) => void;
  coverLoading: boolean;
  coverError: string;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectCover: (file?: File) => Promise<void>;
  onChangeTrackingType: (type: GoalTrackingType) => void;
  onClose: () => void;
  onSave: () => void;
}

function GoalEditorSheet({
  form,
  setForm,
  editing,
  initialSteps,
  setInitialSteps,
  coverLoading,
  coverError,
  coverInputRef,
  onSelectCover,
  onChangeTrackingType,
  onClose,
  onSave,
}: GoalEditorSheetProps) {
  return (
    <div className="fixed inset-0 z-[130] flex items-end bg-black/40 backdrop-blur-sm md:items-center md:justify-center md:p-5" onClick={onClose}>
      <div className="max-h-[96dvh] w-full overflow-y-auto rounded-t-[30px] bg-white px-4 pb-[calc(22px+env(safe-area-inset-bottom))] pt-3 shadow-2xl md:max-w-2xl md:rounded-3xl md:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong md:hidden" />
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{editing ? "Редактирование" : "Новая цель"}</p>
            <h3 className="mt-1 text-[23px] font-semibold tracking-tight text-ink">{editing ? "Обновить цель" : "Что ты хочешь изменить?"}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle text-ink-secondary"><X size={19} /></button>
        </div>

        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void onSelectCover(event.target.files?.[0])} />
        <button type="button" onClick={() => coverInputRef.current?.click()} className="relative mb-3 flex h-36 w-full items-center justify-center overflow-hidden rounded-3xl border border-line-strong bg-gradient-to-br from-[#6657f5] to-[#a574f5] md:h-44">
          {form.imageDataUrl && <img src={form.imageDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className={`absolute inset-0 ${form.imageDataUrl ? "bg-black/35" : "bg-black/10"}`} />
          <span className="relative flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2.5 text-[13px] font-medium text-ink shadow-sm backdrop-blur">{coverLoading ? <Camera className="animate-pulse" size={18} /> : <ImagePlus size={18} />}{coverLoading ? "Обрабатываем фото…" : form.imageDataUrl ? "Заменить обложку" : "Добавить фото мотивации"}</span>
        </button>
        {coverError && <p className="mb-3 text-[12px] text-danger">{coverError}</p>}
        {form.imageDataUrl && <button type="button" onClick={() => setForm((current) => ({ ...current, imageDataUrl: "" }))} className="mb-4 text-[12px] font-medium text-danger">Удалить обложку</button>}

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="pl-1 text-[11px] text-ink-muted">Название цели</span>
            <input autoFocus={!form.imageDataUrl} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Например: Прочитать 24 книги" className="h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[15px] outline-none focus:border-accent" />
          </label>

          <label className="block space-y-1.5">
            <span className="pl-1 text-[11px] text-ink-muted">Почему это важно?</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Короткое описание для мотивации" rows={3} className="w-full resize-none rounded-2xl border border-line-strong bg-white px-4 py-3 text-[14px] outline-none focus:border-accent" />
          </label>

          <div>
            <p className="mb-2 pl-1 text-[11px] text-ink-muted">Как отслеживать прогресс?</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(TYPE_ICONS) as GoalTrackingType[]).map((type) => {
                const Icon = TYPE_ICONS[type];
                const active = form.trackingType === type;
                return (
                  <button key={type} type="button" onClick={() => onChangeTrackingType(type)} className={`rounded-2xl border p-3 text-left transition ${active ? "border-accent bg-accent-soft" : "border-line-strong bg-white"}`}>
                    <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-accent text-white" : "bg-surface-subtle text-ink-secondary"}`}><Icon size={18} /></div>
                    <p className="text-[13px] font-semibold text-ink">{GOAL_TYPE_LABEL[type]}</p>
                    <p className="mt-1 text-[10px] leading-4 text-ink-muted">{GOAL_TYPE_DESCRIPTION[type]}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {form.trackingType !== "checklist" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="pl-1 text-[11px] text-ink-muted">Старт</span>
                <input type="number" step="any" value={form.startValue} onChange={(event) => setForm((current) => ({ ...current, startValue: Number(event.target.value) }))} className="h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent" />
              </label>
              <label className="space-y-1.5">
                <span className="pl-1 text-[11px] text-ink-muted">Цель</span>
                <input type="number" step="any" value={form.targetValue} onChange={(event) => setForm((current) => ({ ...current, targetValue: Number(event.target.value) }))} className="h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent" />
              </label>
            </div>
          )}

          {form.trackingType !== "checklist" && (
            <label className="block space-y-1.5">
              <span className="pl-1 text-[11px] text-ink-muted">Единица измерения</span>
              <input list="goal-unit-presets" value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} placeholder="Например: кг, книги, $, клиенты" className="h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent" />
              <datalist id="goal-unit-presets">{UNIT_PRESETS.map((unit) => <option key={unit} value={unit} />)}</datalist>
            </label>
          )}

          {!editing && form.trackingType === "checklist" && (
            <label className="block space-y-1.5">
              <span className="pl-1 text-[11px] text-ink-muted">Начальные этапы · каждый с новой строки</span>
              <textarea value={initialSteps} onChange={(event) => setInitialSteps(event.target.value)} rows={5} placeholder={"Найти помещение\nКупить оборудование\nЗапустить рекламу"} className="w-full resize-none rounded-2xl border border-line-strong bg-white px-4 py-3 text-[14px] outline-none focus:border-accent" />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="pl-1 text-[11px] text-ink-muted">Период</span>
              <select value={form.period} onChange={(event) => setForm((current) => ({ ...current, period: event.target.value as Goal["period"] }))} className="h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent">
                <option value="week">Неделя</option><option value="month">Месяц</option><option value="year">Год</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="pl-1 text-[11px] text-ink-muted">Дедлайн</span>
              <input type="date" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} className="h-12 w-full rounded-2xl border border-line-strong bg-white px-3 text-[14px] outline-none focus:border-accent" />
            </label>
          </div>

          <button type="button" onClick={onSave} disabled={!form.title.trim() || (form.trackingType !== "checklist" && !Number.isFinite(Number(form.targetValue)))} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-medium text-white disabled:opacity-40"><Target size={18} /> {editing ? "Сохранить изменения" : "Создать цель"}</button>
        </div>
      </div>
    </div>
  );
}

interface EntryEditorSheetProps {
  state: EntryEditorState;
  setState: (value: EntryEditorState | null | ((current: EntryEditorState | null) => EntryEditorState | null)) => void;
  goal: Goal | null;
  onClose: () => void;
  onSave: () => void;
}

function EntryEditorSheet({ state, setState, goal, onClose, onSave }: EntryEditorSheetProps) {
  if (!goal) return null;
  const measurement = goal.trackingType === "measurement";
  return (
    <div className="fixed inset-0 z-[140] flex items-end bg-black/40 backdrop-blur-sm md:items-center md:justify-center md:p-5" onClick={onClose}>
      <div className="w-full rounded-t-[30px] bg-white px-4 pb-[calc(22px+env(safe-area-inset-bottom))] pt-3 shadow-2xl md:max-w-md md:rounded-3xl md:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong md:hidden" />
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{state.entryId ? "Редактирование записи" : goalPrimaryAction(goal)}</p><h3 className="mt-1 text-[22px] font-semibold text-ink">{goal.title}</h3></div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="pl-1 text-[11px] text-ink-muted">{measurement ? "Новое значение" : "Добавить результат"}</span>
            <div className="flex h-12 items-center rounded-2xl border border-line-strong bg-white px-4 focus-within:border-accent">
              <input autoFocus type="number" step="any" min={measurement ? undefined : "0.01"} value={state.value} onChange={(event) => setState((current) => current ? { ...current, value: event.target.value } : current)} placeholder="0" className="min-w-0 flex-1 bg-transparent text-[17px] outline-none" />
              <span className="ml-2 text-[13px] text-ink-muted">{goal.unit}</span>
            </div>
          </label>
          <label className="block space-y-1.5"><span className="pl-1 text-[11px] text-ink-muted">Дата</span><input type="date" value={state.date} onChange={(event) => setState((current) => current ? { ...current, date: event.target.value } : current)} className="h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent" /></label>
          <label className="block space-y-1.5"><span className="pl-1 text-[11px] text-ink-muted">Комментарий</span><input value={state.note} onChange={(event) => setState((current) => current ? { ...current, note: event.target.value } : current)} placeholder={measurement ? "Например: утреннее измерение" : "Например: зарплата, прочитанная книга, тренировка"} className="h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent" /></label>
          <button type="button" onClick={onSave} disabled={!state.value || !state.date || (!measurement && Number(state.value) <= 0)} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-medium text-white disabled:opacity-40"><TrendingUp size={18} /> {state.entryId ? "Сохранить запись" : goalPrimaryAction(goal)}</button>
        </div>
      </div>
    </div>
  );
}

interface ChecklistEditorSheetProps {
  state: ChecklistEditorState;
  setState: (value: ChecklistEditorState | null | ((current: ChecklistEditorState | null) => ChecklistEditorState | null)) => void;
  onClose: () => void;
  onSave: () => void;
}

function ChecklistEditorSheet({ state, setState, onClose, onSave }: ChecklistEditorSheetProps) {
  return (
    <div className="fixed inset-0 z-[140] flex items-end bg-black/40 backdrop-blur-sm md:items-center md:justify-center md:p-5" onClick={onClose}>
      <div className="w-full rounded-t-[30px] bg-white px-4 pb-[calc(22px+env(safe-area-inset-bottom))] pt-3 shadow-2xl md:max-w-md md:rounded-3xl md:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong md:hidden" />
        <div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{state.itemId ? "Редактирование" : "Новый этап"}</p><h3 className="mt-1 text-[22px] font-semibold text-ink">Этап цели</h3></div><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle"><X size={18} /></button></div>
        <input autoFocus value={state.title} onChange={(event) => setState((current) => current ? { ...current, title: event.target.value } : current)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); onSave(); } }} placeholder="Например: Купить оборудование" className="h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[15px] outline-none focus:border-accent" />
        <button type="button" onClick={onSave} disabled={!state.title.trim()} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-medium text-white disabled:opacity-40"><ListChecks size={18} /> {state.itemId ? "Сохранить этап" : "Добавить этап"}</button>
      </div>
    </div>
  );
}

interface PhotoEditorSheetProps {
  state: PhotoEditorState;
  setState: (value: PhotoEditorState | null | ((current: PhotoEditorState | null) => PhotoEditorState | null)) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onSelectPhoto: (file?: File) => Promise<void>;
  onClose: () => void;
  onSave: () => void;
}

function PhotoEditorSheet({ state, setState, inputRef, onSelectPhoto, onClose, onSave }: PhotoEditorSheetProps) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end bg-black/40 backdrop-blur-sm md:items-center md:justify-center md:p-5" onClick={onClose}>
      <div className="w-full rounded-t-[30px] bg-white px-4 pb-[calc(22px+env(safe-area-inset-bottom))] pt-3 shadow-2xl md:max-w-md md:rounded-3xl md:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong md:hidden" />
        <div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">{state.photoId ? "Редактирование фото" : "Фото прогресса"}</p><h3 className="mt-1 text-[22px] font-semibold text-ink">Галерея цели</h3></div><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-subtle"><X size={18} /></button></div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void onSelectPhoto(event.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()} className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-3xl border border-line-strong bg-surface-subtle">
          {state.dataUrl && <img src={state.dataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className={`absolute inset-0 ${state.dataUrl ? "bg-black/30" : "bg-transparent"}`} />
          <span className="relative flex items-center gap-2 rounded-2xl bg-white/90 px-4 py-2.5 text-[13px] font-medium text-ink shadow-sm">{state.loading ? <Camera className="animate-pulse" size={18} /> : <ImagePlus size={18} />}{state.loading ? "Обрабатываем…" : state.dataUrl ? "Заменить фото" : "Выбрать фото"}</span>
        </button>
        {state.error && <p className="mt-2 text-[12px] text-danger">{state.error}</p>}
        <div className="mt-3 space-y-3">
          <label className="block space-y-1.5"><span className="pl-1 text-[11px] text-ink-muted">Дата фото</span><input type="date" value={state.date} onChange={(event) => setState((current) => current ? { ...current, date: event.target.value } : current)} className="h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent" /></label>
          <label className="block space-y-1.5"><span className="pl-1 text-[11px] text-ink-muted">Подпись</span><input value={state.caption} onChange={(event) => setState((current) => current ? { ...current, caption: event.target.value } : current)} placeholder="Например: первая неделя" className="h-12 w-full rounded-2xl border border-line-strong bg-white px-4 text-[14px] outline-none focus:border-accent" /></label>
          <button type="button" onClick={onSave} disabled={!state.dataUrl || !state.date || state.loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-medium text-white disabled:opacity-40"><Camera size={18} /> {state.photoId ? "Сохранить фото" : "Добавить в галерею"}</button>
        </div>
      </div>
    </div>
  );
}
