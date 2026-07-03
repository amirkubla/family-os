/**
 * Human date labels for notes — shared by the NoteCard footer and the editor's
 * metadata so "edited"/"created" read identically everywhere.
 *
 *   noteEditedLabel → "נערך היום" | "נערך אתמול" | "נערך 14 ביוני"
 *   noteCreatedLabel → "נוצר 14 ביוני"
 */

import { t } from "@src/i18n";

const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const MS_PER_DAY = 86_400_000;

function midnight(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "14 ביוני" — day + Hebrew month with the "ב" prefix. */
function dayMonth(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ב${MONTHS_HE[d.getMonth()]}`;
}

export function noteEditedLabel(ms: number): string {
  const diff = Math.round((midnight(Date.now()) - midnight(ms)) / MS_PER_DAY);
  if (diff <= 0) return t("notes.editedToday");
  if (diff === 1) return t("notes.editedYesterday");
  return t("notes.editedOn", { date: dayMonth(ms) });
}

export function noteCreatedLabel(ms: number): string {
  return t("notes.createdOn", { date: dayMonth(ms) });
}
