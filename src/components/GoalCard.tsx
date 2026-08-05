import { motion } from "framer-motion";
import type { Goal } from "../types";
import {
  calculateGoalCurrent,
  calculateGoalProgress,
  calculateGoalTarget,
  formatGoalValue,
  GOAL_PERIOD_LABEL,
  GOAL_TYPE_LABEL,
} from "../goalUtils";

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface GoalCardProps {
  goal: Goal;
}

export default function GoalCard({ goal }: GoalCardProps) {
  const pct = calculateGoalProgress(goal);
  const current = calculateGoalCurrent(goal);
  const target = calculateGoalTarget(goal);

  return (
    <div className="rounded-3xl bg-surface-subtle p-6">
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r={RADIUS} fill="none" stroke="#ececec" strokeWidth="6" />
            <motion.circle
              cx="38"
              cy="38"
              r={RADIUS}
              fill="none"
              stroke="#3b66f5"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - pct / 100) }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              transform="rotate(-90 38 38)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[14px] font-semibold text-ink">{pct}%</span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-[12px] text-ink-muted">
            {GOAL_PERIOD_LABEL[goal.period]} · {GOAL_TYPE_LABEL[goal.trackingType]}
          </p>
          <h3 className="truncate text-[15px] font-medium text-ink">{goal.title}</h3>
          <p className="mt-1 text-[13px] text-ink-secondary">
            {formatGoalValue(current, goal.unit)} / {formatGoalValue(target, goal.unit)}
          </p>
        </div>
      </div>
    </div>
  );
}
