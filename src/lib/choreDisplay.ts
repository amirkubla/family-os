/**
 * choreDisplay.ts — Hebrew, i18n-aware display helpers for chores.
 *
 * Kept out of src/models/chore.ts so the model stays pure (no i18n import).
 * Used by ChoreCard, the chores list, the editor, and the filter toolbar.
 */

import { t, dayName } from "@src/i18n";
import { C } from "@src/ui/tokens";
import { dueDiffDays, type Chore, type ChorePriority } from "@src/models/chore";

const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export type DueTone = "danger" | "warn" | "normal";

/** Relative/absolute Hebrew due label + a tone for colouring. */
export function describeChoreDue(dueMs: number): { text: string; tone: DueTone } {
  const diff = dueDiffDays(dueMs);
  if (diff < 0) {
    const n = -diff;
    return {
      text: n === 1 ? t("chore.overdueOne") : t("chore.overdue", { count: n }),
      tone: "danger",
    };
  }
  if (diff === 0) return { text: t("chore.dueToday"), tone: "warn" };
  if (diff === 1) return { text: t("chore.dueTomorrow"), tone: "warn" };
  const d = new Date(dueMs);
  return { text: `${d.getDate()} ${MONTHS_HE[d.getMonth()]}`, tone: "normal" };
}

/** Map a due tone to a token colour. */
export function dueToneColor(tone: DueTone): string {
  return tone === "danger" ? C.red : tone === "warn" ? C.amber : C.textSecondary;
}

/** Small Hebrew label for the repeat rule, or null when non-recurring. */
export function repeatRuleLabel(chore: Chore): string | null {
  if (!chore.isRecurring || !chore.repeatUnit) return null;
  const n = Math.max(1, chore.repeatInterval ?? 1);
  const unit = chore.repeatUnit;

  if (unit === "day") {
    return n === 1 ? t("chore.repeatDaily") : t("chore.repeatEveryNDays", { count: n });
  }
  if (unit === "week") {
    const days = chore.daysOfWeek ?? [];
    if (n === 1 && days.length === 1) {
      return t("chore.repeatEveryWeekday", { day: dayName(days[0]) });
    }
    if (n === 1) return t("chore.repeatWeekly");
    if (n === 2) return t("chore.repeatBiweekly");
    return t("chore.repeatEveryNWeeks", { count: n });
  }
  // month
  return n === 1 ? t("chore.repeatMonthly") : t("chore.repeatEveryNMonths", { count: n });
}

const PRIORITY_COLOR: Record<ChorePriority, string> = {
  low: C.textMuted,
  medium: C.amber,
  high: C.red,
};

/** Colour + Hebrew label for a priority; null when unset. */
export function priorityMeta(p?: ChorePriority): { color: string; label: string } | null {
  if (!p) return null;
  return { color: PRIORITY_COLOR[p], label: t(`chore.priority_${p}`) };
}
