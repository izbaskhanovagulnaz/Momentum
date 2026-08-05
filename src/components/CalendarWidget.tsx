import { Video, MapPin, ArrowRight } from "lucide-react";
import type { CalendarEvent } from "../types";
import EmptyState from "./EmptyState";

interface CalendarWidgetProps {
  events: CalendarEvent[];
  mode?: "compact" | "full";
  onOpenEvent?: (id: string) => void;
}

export default function CalendarWidget({ events, mode = "full", onOpenEvent }: CalendarWidgetProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-3xl bg-surface-subtle p-6">
        <EmptyState message="На сегодня событий нет" />
      </div>
    );
  }

  if (mode === "compact") {
    const next = events[0];
    return (
      <div className="rounded-3xl bg-accent-soft p-6">
        <p className="mb-2 text-[13px] text-accent">Следующее событие</p>
        <div className="mb-1 flex items-center gap-2">
          {next.type === "meeting" && <Video size={16} className="text-accent" />}
          <h3 className="text-[16px] font-medium text-ink">{next.title}</h3>
        </div>
        <p className="mb-4 text-[13px] text-ink-secondary">{next.time}</p>
        <button
          onClick={() => onOpenEvent?.(next.id)}
          className="flex items-center gap-1 text-[13px] font-medium text-accent"
        >
          Открыть
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-surface-subtle p-6 md:p-7">
      <div className="relative pl-11">
        <div className="absolute bottom-1 left-[34px] top-1 w-px bg-line" />
        {events.map((event) => (
          <div key={event.id} className="relative mb-5 last:mb-0">
            <span className="absolute -left-11 top-0 font-mono text-[12px] text-ink-muted">
              {event.time}
            </span>
            <div
              className={`rounded-2xl px-4 py-3 ${
                event.type === "meeting" ? "bg-accent-soft" : "bg-white"
              }`}
            >
              <div className="flex items-center gap-2">
                {event.type === "meeting" && <Video size={14} className="text-accent" />}
                <p
                  className={`text-[14px] font-medium ${
                    event.type === "meeting" ? "text-accent" : "text-ink"
                  }`}
                >
                  {event.title}
                </p>
              </div>
              {event.location && (
                <p className="mt-1 flex items-center gap-1 text-[12px] text-ink-secondary">
                  <MapPin size={12} />
                  {event.location}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
