import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  AlarmClock,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  List,
  Plus,
  Rows3,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import DayTimeline from "../components/DayTimeline";
import TopBar from "../components/TopBar";
import AgendaView from "../components/calendar/AgendaView";
import CalendarSettingsPopover from "../components/calendar/CalendarSettingsPopover";
import MonthGrid from "../components/calendar/MonthGrid";
import MonthPicker from "../components/calendar/MonthPicker";
import TaskEditModal from "../components/calendar/TaskEditModal";
import UndoToast from "../components/calendar/UndoToast";
import WeekStrip from "../components/calendar/WeekStrip";
import WeekView from "../components/calendar/WeekView";
import { usePlanner } from "../PlannerContext";
import type { Task, TaskCategory, TaskOccurrence } from "../types";
import { formatTimeRange, localDate, timeToMinutes } from "../utils";
import {
  buildMonth,
  formatDuration,
  isWeekend,
  isoWeek,
  monthKey,
  monthName,
  relativeDayLabel,
  shiftDate,
  toDate,
  weekDays,
} from "../calendar/dates";
import { holidayFor } from "../calendar/holidays";
import { buildMarkers, formatMarkerAmount, MARKER_STYLES } from "../calendar/markers";
import {
  busyMinutes,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  occurrencesInRange,
  REPEAT_SHORT,
  restoreOccurrencePatch,
  skipOccurrencePatch,
  toggleOccurrencePatch,
} from "../calendar/occurrences";
import { useCalendarSettings } from "../calendar/useCalendarSettings";

type ViewMode = "month" | "week" | "day" | "agenda";

const VIEW_STORAGE_KEY = "momentum-calendar-view";

const VIEWS: { value: ViewMode; label: string; icon: typeof CalendarDays; hint: string }[] = [
  { value: "month", label: "Месяц", icon: CalendarDays, hint: "M" },
  { value: "week", label: "Неделя", icon: CalendarRange, hint: "W" },
  { value: "day", label: "День", icon: Clock3, hint: "D" },
  { value: "agenda", label: "Повестка", icon: Rows3, hint: "A" },
];

interface PendingUndo {
  id: number;
  message: string;
  undo: () => void;
}

let undoCounter = 0;

function tap() {
  navigator.vibrate?.(8);
}

export default function CalendarPage() {
  const { tasks, goals, finance, addTask, updateTask, deleteTask } = usePlanner();
  const { settings, update: updateSettings } = useCalendarSettings();

  const today = localDate();
  const [view, setView] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    return stored === "week" || stored === "day" || stored === "agenda" ? stored : "month";
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(() => toDate(today));
  const [direction, setDirection] = useState(1);
  const [dayView, setDayView] = useState<"timeline" | "list">("timeline");
  const [editing, setEditing] = useState<TaskOccurrence | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [undo, setUndo] = useState<PendingUndo | null>(null);
  const [draftRequest, setDraftRequest] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState<TaskCategory | "">("");
  const composerRef = useRef<HTMLInputElement | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  const currentMonth = monthKey(visibleMonth);
  const monthDays = useMemo(() => buildMonth(visibleMonth), [visibleMonth]);
  const currentWeek = useMemo(() => weekDays(toDate(selectedDate)), [selectedDate]);

  // Диапазон, который реально показан на экране: только его и разворачиваем
  // из повторов, иначе бесконечная серия развернётся в бесконечный список.
  const range = useMemo(() => {
    if (view === "month") {
      return { from: localDate(monthDays[0]), to: localDate(monthDays[monthDays.length - 1]) };
    }
    if (view === "week") {
      return { from: localDate(currentWeek[0]), to: localDate(currentWeek[6]) };
    }
    if (view === "day") return { from: selectedDate, to: selectedDate };
    return { from: selectedDate, to: shiftDate(selectedDate, 30) };
  }, [view, monthDays, currentWeek, selectedDate]);

  const occurrences = useMemo(
    () =>
      occurrencesInRange(
        tasks,
        range.from < selectedDate ? range.from : selectedDate,
        range.to > selectedDate ? range.to : selectedDate,
      ),
    [tasks, range, selectedDate],
  );

  const markers = useMemo(() => buildMarkers(goals, finance), [goals, finance]);

  const selectedTasks = useMemo(() => occurrences.get(selectedDate) || [], [occurrences, selectedDate]);
  const selectedMarkers = markers.get(selectedDate) || [];
  const doneCount = selectedTasks.filter((task) => task.done).length;
  const busy = busyMinutes(selectedTasks);
  const holiday = holidayFor(selectedDate, settings.region);
  const relative = relativeDayLabel(selectedDate, today);

  const overdue = useMemo(
    () => tasks.filter((task) => !task.repeat && !task.done && task.date < today),
    [tasks, today],
  );

  const selectedLabel = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(toDate(selectedDate));

  const atToday =
    selectedDate === today && (view !== "month" || currentMonth === monthKey(toDate(today)));

  const selectDate = useCallback((value: string) => {
    tap();
    setSelectedDate(value);
    const date = toDate(value);
    setVisibleMonth((current) =>
      monthKey(current) === monthKey(date) ? current : new Date(date.getFullYear(), date.getMonth(), 1),
    );
  }, []);

  const selectDay = (day: Date) => selectDate(localDate(day));

  const move = useCallback(
    (delta: number) => {
      setDirection(delta);
      if (view === "month") {
        setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
        return;
      }
      const step = view === "day" ? 1 : 7;
      selectDate(shiftDate(selectedDate, delta * step));
    },
    [view, selectedDate, selectDate],
  );

  const goToday = useCallback(() => {
    setDirection(toDate(today) < visibleMonth ? -1 : 1);
    setVisibleMonth(toDate(today));
    setSelectedDate(today);
    tap();
  }, [today, visibleMonth]);

  // ——— операции над вхождениями ———

  const toggleOccurrence = (occurrence: TaskOccurrence) => {
    tap();
    updateTask(occurrence.id, toggleOccurrencePatch(occurrence));
  };

  const removeOccurrence = (occurrence: TaskOccurrence) => {
    if (occurrence.virtual) {
      updateTask(occurrence.id, skipOccurrencePatch(occurrence));
      setUndo({
        id: ++undoCounter,
        message: `Вхождение «${occurrence.title}» удалено`,
        undo: () => updateTask(occurrence.id, restoreOccurrencePatch(occurrence)),
      });
      return;
    }

    const snapshot: Omit<Task, "id"> = {
      title: occurrence.title,
      done: occurrence.done,
      date: occurrence.date,
      time: occurrence.time,
      endTime: occurrence.endTime,
      priority: occurrence.priority,
      category: occurrence.category,
    };
    deleteTask(occurrence.id);
    setUndo({
      id: ++undoCounter,
      message: `Задача «${occurrence.title}» удалена`,
      undo: () => addTask(snapshot),
    });
  };

  /** Перенос вхождения: серию не рвём, а отцепляем от неё одну копию. */
  const detachOccurrence = (occurrence: TaskOccurrence, patch: Partial<Omit<Task, "id">>) => {
    if (!occurrence.virtual) {
      updateTask(occurrence.id, patch);
      return;
    }
    updateTask(occurrence.id, skipOccurrencePatch(occurrence));
    addTask({
      title: occurrence.title,
      date: occurrence.date,
      time: occurrence.time,
      endTime: occurrence.endTime,
      priority: occurrence.priority,
      category: occurrence.category,
      ...patch,
    });
  };

  const rescheduleOccurrence = (occurrence: TaskOccurrence, start: string, end: string) => {
    detachOccurrence(occurrence, { time: start, endTime: end });
  };

  const moveOccurrenceToDate = (key: string, date: string) => {
    for (const list of occurrences.values()) {
      const found = list.find((item) => item.key === key);
      if (found && found.date !== date) {
        detachOccurrence(found, { date });
        return;
      }
    }
  };

  const rescheduleOverdue = () => {
    for (const task of overdue) updateTask(task.id, { date: today });
    setUndo({
      id: ++undoCounter,
      message: `Перенесено задач: ${overdue.length}`,
      undo: () => {
        for (const task of overdue) updateTask(task.id, { date: task.date });
      },
    });
  };

  const submit = () => {
    const value = title.trim();
    if (!value) return;

    const start = timeToMinutes(time);
    const end = timeToMinutes(endTime);

    addTask({
      title: value,
      date: selectedDate,
      time: time || undefined,
      endTime: start !== null && end !== null && end > start ? endTime : undefined,
      priority: "normal",
      category: category || undefined,
    });

    setTitle("");
    setTime("");
    setEndTime("");
  };

  const endInvalid = Boolean(endTime) && (() => {
    const start = timeToMinutes(time);
    const end = timeToMinutes(endTime);
    return start === null || end === null || end <= start;
  })();

  // ——— горячие клавиши ———

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (editing || monthPickerOpen || settingsOpen) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          setDirection(-1);
          selectDate(shiftDate(selectedDate, -1));
          break;
        case "ArrowRight":
          event.preventDefault();
          setDirection(1);
          selectDate(shiftDate(selectedDate, 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setDirection(-1);
          selectDate(shiftDate(selectedDate, -7));
          break;
        case "ArrowDown":
          event.preventDefault();
          setDirection(1);
          selectDate(shiftDate(selectedDate, 7));
          break;
        case "PageUp":
          event.preventDefault();
          move(-1);
          break;
        case "PageDown":
          event.preventDefault();
          move(1);
          break;
        default:
          break;
      }

      const key = event.key.toLowerCase();
      if (key === "t" || key === "е") goToday();
      if (key === "n" || key === "т") {
        event.preventDefault();
        composerRef.current?.focus();
      }
      if (key === "m" || key === "ь") setView("month");
      if (key === "w" || key === "ц") setView("week");
      if (key === "d" || key === "в") setView("day");
      if (key === "a" || key === "ф") setView("agenda");
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, monthPickerOpen, settingsOpen, selectedDate, selectDate, move, goToday]);

  // ——— свайпы по месяцу/неделе ———

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    swipeRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    move(dx < 0 ? 1 : -1);
  };

  // ——— куски интерфейса ———

  const viewSwitch = (
    <div className="flex items-center gap-0.5 rounded-xl border border-line-strong bg-white p-1">
      {VIEWS.map((item) => {
        const Icon = item.icon;
        const active = view === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => setView(item.value)}
            title={`${item.label} (${item.hint})`}
            aria-pressed={active}
            className={`flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium transition ${
              active ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  const dayModeSwitch = (
    <div className="flex items-center gap-1 rounded-xl border border-line-strong bg-white p-1">
      <button
        type="button"
        onClick={() => setDayView("timeline")}
        aria-pressed={dayView === "timeline"}
        className={`flex h-7 items-center gap-1 rounded-lg px-2 text-[12px] font-medium transition ${
          dayView === "timeline" ? "bg-accent text-white" : "text-ink-muted"
        }`}
      >
        <Clock3 size={14} />
        Часы
      </button>
      <button
        type="button"
        onClick={() => setDayView("list")}
        aria-pressed={dayView === "list"}
        className={`flex h-7 items-center gap-1 rounded-lg px-2 text-[12px] font-medium transition ${
          dayView === "list" ? "bg-accent text-white" : "text-ink-muted"
        }`}
      >
        <List size={14} />
        Список
      </button>
    </div>
  );

  const taskComposer = (
    <div className="rounded-2xl border border-line-strong bg-white p-3">
      <div className="flex items-center gap-2">
        <Plus size={18} className="shrink-0 text-accent" />
        <input
          ref={composerRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
            if (event.key === "Escape") event.currentTarget.blur();
          }}
          placeholder="Что запланировать?"
          className="h-10 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Clock3 size={16} className="shrink-0 text-ink-muted" />
        <input
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          className="h-9 min-w-[92px] flex-1 rounded-xl border border-line-strong bg-surface-subtle px-3 text-[12px] outline-none"
          aria-label="Начало задачи"
        />
        <span className="shrink-0 text-[12px] text-ink-muted">до</span>
        <input
          type="time"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
          className={`h-9 min-w-[92px] flex-1 rounded-xl border bg-surface-subtle px-3 text-[12px] outline-none ${
            endInvalid ? "border-danger" : "border-line-strong"
          }`}
          aria-label="Конец задачи"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as TaskCategory | "")}
          className="h-9 shrink-0 rounded-xl border border-line-strong bg-surface-subtle px-2 text-[12px] outline-none"
          aria-label="Категория задачи"
        >
          <option value="">Без категории</option>
          {(Object.keys(CATEGORY_LABELS) as TaskCategory[]).map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim()}
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-[12px] font-medium text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Добавить
        </button>
      </div>

      {endInvalid && (
        <p className="mt-2 text-[11px] text-danger">
          Конец должен быть позже начала — иначе задача сохранится без интервала.
        </p>
      )}
    </div>
  );

  const emptyDay = (
    <div className="rounded-2xl border border-dashed border-line-strong bg-white px-4 py-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Sparkles size={22} />
      </div>
      <p className="text-[14px] font-medium text-ink">
        {selectedDate === today ? "День пока пустой" : "На этот день задач нет"}
      </p>
      <p className="mt-1 text-[12px] text-ink-muted">
        Кликните по свободному часу или добавьте задачу вручную
      </p>
      <button
        type="button"
        onClick={() => composerRef.current?.focus()}
        className="mt-3 rounded-xl bg-accent px-4 py-2 text-[12.5px] font-medium text-white transition active:scale-95"
      >
        Запланировать первое дело
      </button>
    </div>
  );

  const taskList =
    selectedTasks.length === 0 ? (
      emptyDay
    ) : (
      <div className="space-y-2">
        {selectedTasks.map((task) => {
          const palette = task.category ? CATEGORY_COLORS[task.category] : null;
          const isOverdue = !task.done && selectedDate < today;

          return (
            <div
              key={task.key}
              className={`group flex items-center gap-3 rounded-2xl border bg-white px-3 py-3 shadow-sm ${
                isOverdue ? "border-danger/45" : "border-line-strong"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleOccurrence(task)}
                aria-pressed={task.done}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                  task.done ? "border-success bg-success text-white" : "border-line-strong bg-white"
                }`}
                aria-label="Изменить статус задачи"
              >
                {task.done && "✓"}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={`flex items-center gap-1.5 text-[14px] ${
                    task.done ? "text-ink-muted line-through" : "text-ink"
                  }`}
                >
                  {palette && <i className={`h-2 w-2 shrink-0 rounded-full ${palette.dot}`} />}
                  <span className="truncate">{task.title}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-ink-muted">
                  {formatTimeRange(task.time, task.endTime) || "Без времени"}
                  {task.repeat && <span className="font-sans">· {REPEAT_SHORT[task.repeat]}</span>}
                  {isOverdue && <span className="font-sans text-danger">· просрочено</span>}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditing(task)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-accent-soft hover:text-accent"
                aria-label="Редактировать задачу"
              >
                <Edit3 size={16} />
              </button>

              <button
                type="button"
                onClick={() => removeOccurrence(task)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-danger-soft hover:text-danger md:opacity-0 md:group-hover:opacity-100"
                aria-label="Удалить задачу"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
    );

  const renderDayBody = (fill = false) =>
    dayView === "timeline" ? (
      <DayTimeline
        fill={fill}
        date={selectedDate}
        tasks={selectedTasks}
        dayStart={settings.dayStart}
        dayEnd={settings.dayEnd}
        step={settings.step}
        collapseNight={settings.collapseNight}
        draftRequest={draftRequest}
        onDraftHandled={() => setDraftRequest(null)}
        onCreate={(value, slotTime, slotEnd) =>
          addTask({
            title: value,
            date: selectedDate,
            time: slotTime,
            endTime: slotEnd,
            priority: "normal",
            category: category || undefined,
          })
        }
        onToggle={toggleOccurrence}
        onEdit={setEditing}
        onDelete={removeOccurrence}
        onReschedule={rescheduleOccurrence}
      />
    ) : fill ? (
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{taskList}</div>
    ) : (
      taskList
    );

  const dayHeader = (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-ink-muted">
          Выбранный день
          {relative && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] normal-case tracking-normal text-accent">
              {relative}
            </span>
          )}
        </p>
        <h3
          className={`mt-1 truncate text-[19px] font-semibold capitalize ${
            isWeekend(toDate(selectedDate)) || holiday ? "text-danger/90" : "text-ink"
          }`}
        >
          {selectedLabel}
        </h3>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          {holiday && <span className="text-danger/80">{holiday.name} · </span>}
          {selectedTasks.length > 0
            ? `${doneCount} из ${selectedTasks.length}${busy > 0 ? ` · ${formatDuration(busy)} занято` : ""}`
            : "ничего не запланировано"}
        </p>
      </div>

      {view !== "day" && (
        <button
          type="button"
          onClick={() => setView("day")}
          className="flex h-9 shrink-0 items-center gap-1 rounded-xl border border-line-strong bg-white px-3 text-[12px] font-medium text-ink-secondary transition hover:text-accent"
        >
          <Clock3 size={14} />
          День
        </button>
      )}
    </div>
  );

  const dayMarkersBlock = selectedMarkers.length > 0 && (
    <div className="mb-3 space-y-1.5">
      {selectedMarkers.map((marker) => {
        const style = MARKER_STYLES[marker.kind];
        return (
          <div
            key={marker.id}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 ${style.soft}`}
          >
            <i className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
            <p className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
              <span className={`mr-1 text-[11px] ${style.text}`}>{style.label}:</span>
              {marker.title}
            </p>
            <span className="shrink-0 font-mono text-[11px] text-ink-secondary">
              {formatMarkerAmount(marker)}
            </span>
          </div>
        );
      })}
    </div>
  );

  const dayPanel = (
    <section className="rounded-3xl border border-line-strong bg-surface-subtle p-4 shadow-sm md:p-5">
      {dayHeader}
      {dayMarkersBlock}
      {taskComposer}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-ink">Задачи дня</p>
        {dayModeSwitch}
      </div>

      <div className="mt-3">{renderDayBody()}</div>
    </section>
  );

  const header = (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setMonthPickerOpen((open) => !open)}
          className="text-left"
          aria-expanded={monthPickerOpen}
        >
          <p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            {view === "month" ? "Месяц" : view === "week" ? `Неделя ${isoWeek(currentWeek[0])}` : "Период"}
          </p>
          <h2 className="mt-1 flex items-baseline gap-2 text-[22px] font-semibold tracking-tight text-ink md:text-[24px]">
            <span className="capitalize">{monthName(visibleMonth)}</span>
            <span className="font-mono text-[15px] font-medium text-ink-muted">
              {visibleMonth.getFullYear()}
            </span>
          </h2>
        </button>

        {monthPickerOpen && (
          <MonthPicker
            year={visibleMonth.getFullYear()}
            month={visibleMonth.getMonth()}
            currentYear={new Date().getFullYear()}
            currentMonth={new Date().getMonth()}
            onPick={(year, month) => {
              setDirection(new Date(year, month, 1) < visibleMonth ? -1 : 1);
              setVisibleMonth(new Date(year, month, 1));
            }}
            onClose={() => setMonthPickerOpen(false)}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        {viewSwitch}

        <button
          type="button"
          onClick={goToday}
          disabled={atToday}
          className="h-9 rounded-xl border border-line-strong bg-white px-3 text-[12px] font-medium text-ink-secondary transition hover:bg-surface-subtle disabled:cursor-default disabled:opacity-40"
          title="Сегодня (T)"
        >
          Сегодня
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line-strong bg-white transition hover:bg-surface-subtle"
            aria-label="Назад"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line-strong bg-white transition hover:bg-surface-subtle"
            aria-label="Вперёд"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line-strong bg-white text-ink-secondary transition hover:bg-surface-subtle"
            aria-label="Настройки календаря"
          >
            <Settings2 size={16} />
          </button>
          {settingsOpen && (
            <CalendarSettingsPopover
              settings={settings}
              onChange={updateSettings}
              onClose={() => setSettingsOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );

  const monthCard = (
    <section
      className="rounded-3xl border border-line-strong bg-white p-4 shadow-sm md:p-5"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {header}
      <div className="hidden md:block">
        <MonthGrid
          days={monthDays}
          selectedDate={selectedDate}
          currentMonth={currentMonth}
          occurrences={occurrences}
          markers={markers}
          region={settings.region}
          variant="desktop"
          showWeekNumbers
          workdayMinutes={(settings.dayEnd - settings.dayStart) * 60}
          direction={direction}
          animationKey={currentMonth}
          onSelect={selectDay}
          onOpenTask={setEditing}
          onMoveTask={moveOccurrenceToDate}
        />
      </div>
      <div className="md:hidden">
        <MonthGrid
          days={monthDays}
          selectedDate={selectedDate}
          currentMonth={currentMonth}
          occurrences={occurrences}
          markers={markers}
          region={settings.region}
          variant="mobile"
          showWeekNumbers={false}
          workdayMinutes={(settings.dayEnd - settings.dayStart) * 60}
          direction={direction}
          animationKey={currentMonth}
          onSelect={selectDay}
        />
      </div>
    </section>
  );

  return (
    <div>
      <TopBar
        eyebrow={`${selectedLabel} · неделя ${isoWeek(toDate(selectedDate))}`}
        title="Календарь"
      />

      {overdue.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-danger/40 bg-danger-soft px-4 py-3">
          <AlarmClock size={18} className="shrink-0 text-danger" />
          <p className="min-w-0 flex-1 text-[13px] text-ink">
            Просрочено задач: <span className="font-semibold">{overdue.length}</span>
            <span className="ml-1 text-ink-secondary">
              — самая старая от {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(
                toDate(overdue.reduce((min, task) => (task.date < min ? task.date : min), overdue[0].date)),
              )}
            </span>
          </p>
          <button
            type="button"
            onClick={rescheduleOverdue}
            className="shrink-0 rounded-xl bg-danger px-3 py-2 text-[12px] font-medium text-white transition active:scale-95"
          >
            Перенести на сегодня
          </button>
        </div>
      )}

      <div className="mb-4 md:hidden">
        <WeekStrip
          selectedDate={selectedDate}
          occurrences={occurrences}
          region={settings.region}
          onSelect={selectDate}
        />
      </div>

      {view === "month" && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
          {monthCard}
          {dayPanel}
        </div>
      )}

      {view === "week" && (
        <div className="space-y-4">
          <section
            className="rounded-3xl border border-line-strong bg-white p-4 shadow-sm md:p-5"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {header}
            <WeekView
              days={currentWeek}
              selectedDate={selectedDate}
              occurrences={occurrences}
              region={settings.region}
              dayStart={settings.dayStart}
              dayEnd={settings.dayEnd}
              onSelectDay={selectDate}
              onSlotClick={(value, slot) => {
                selectDate(value);
                setView("day");
                setDayView("timeline");
                setDraftRequest(slot);
              }}
              onOpenTask={setEditing}
              onToggleTask={toggleOccurrence}
            />
          </section>
          {dayPanel}
        </div>
      )}

      {view === "day" && (
        <section
          className="rounded-3xl border border-line-strong bg-surface-subtle p-4 shadow-sm md:p-5"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {header}
          {dayHeader}
          {dayMarkersBlock}
          {taskComposer}

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[13px] font-medium text-ink">Задачи дня</p>
            {dayModeSwitch}
          </div>

          <div className="mt-3">{renderDayBody()}</div>
        </section>
      )}

      {view === "agenda" && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-line-strong bg-white p-4 shadow-sm md:p-5">
            {header}
            {taskComposer}
          </section>
          <AgendaView
            from={selectedDate}
            days={31}
            occurrences={occurrences}
            markers={markers}
            region={settings.region}
            selectedDate={selectedDate}
            onSelectDay={selectDate}
            onOpenTask={setEditing}
            onToggleTask={toggleOccurrence}
            onDeleteTask={removeOccurrence}
          />
        </div>
      )}

      {editing && (
        <TaskEditModal
          occurrence={editing}
          onClose={() => setEditing(null)}
          onDelete={() => removeOccurrence(editing)}
          onSave={(patch) => updateTask(editing.id, patch)}
        />
      )}

      <AnimatePresence>
        {undo && (
          <UndoToast
            key={undo.id}
            id={undo.id}
            message={undo.message}
            onUndo={() => {
              undo.undo();
              setUndo(null);
            }}
            onDismiss={() => setUndo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
