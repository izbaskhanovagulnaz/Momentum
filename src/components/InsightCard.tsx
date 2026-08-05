import { Sparkles } from "lucide-react";

interface InsightCardProps {
  message: string;
}

export default function InsightCard({ message }: InsightCardProps) {
  return (
    <div className="rounded-3xl border border-line p-6 md:p-7">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles size={15} className="text-accent" />
        <p className="text-[13px] text-ink-muted">AI Insight</p>
      </div>
      <p className="text-[14px] leading-relaxed text-ink-secondary">{message}</p>
    </div>
  );
}
