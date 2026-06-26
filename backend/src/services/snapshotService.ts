/**
 * Family snapshot — the "family brain" context.
 *
 * Composes the whole family's tracked data into a single compact, name-resolved
 * JSON digest that the Telegram-bot Assistant passes to an LLM to answer
 * free-form questions ("what do we know about the Eilat trip?", "who's busiest
 * this week?"). At family scale the full dataset fits comfortably in a single
 * LLM context, so this is context-stuffing — no vector store.
 *
 * Design choices:
 *   - Owner UUIDs (kidId / assigneeId / memberId) are resolved to names inline
 *     and dropped — the brain is read-only and names are far cheaper + clearer
 *     than UUIDs in the prompt.
 *   - One-time events are windowed (recent past for "did we…" + near future for
 *     "what's coming"); recurring items are always included.
 *   - Each list is capped; anything trimmed is reported in `truncated` so a
 *     family outgrowing context-stuffing is a visible signal (→ add real RAG).
 *
 * Dates are computed in Asia/Jerusalem.
 */

import { choresRepo } from "../repos/choresRepo.js";
import { expensesRepo } from "../repos/expensesRepo.js";
import { familyEventsRepo } from "../repos/familyEventsRepo.js";
import { familyMembersRepo } from "../repos/familyMembersRepo.js";
import { groceryRepo } from "../repos/groceryRepo.js";
import { kidsRepo } from "../repos/kidsRepo.js";
import { notesRepo } from "../repos/notesRepo.js";
import { projectsRepo } from "../repos/projectsRepo.js";
import { scheduleBlocksRepo } from "../repos/scheduleBlocksRepo.js";
import { buildOutstanding } from "./paymentsService.js";

const JERUSALEM_TZ = "Asia/Jerusalem";
const HE_DAYS = ["יום א׳", "יום ב׳", "יום ג׳", "יום ד׳", "יום ה׳", "יום ו׳", "שבת"];

// One-time-event window and per-list caps. Generous for a typical family;
// `truncated` flags anything dropped.
const PAST_DAYS = 30;
const FUTURE_DAYS = 120;
const CAPS = { notes: 250, projects: 120, events: 200, chores: 150, grocery: 150, blocks: 150 };

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: JERUSALEM_TZ });
}
function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return `${py}-${String(pm).padStart(2, "0")}`;
}
function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function heDays(days: number[] | null | undefined): string {
  if (!Array.isArray(days) || days.length === 0) return "";
  return days
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => a - b)
    .map((d) => HE_DAYS[d])
    .join("/");
}
function ils(agorot: number): string {
  const nis = (agorot || 0) / 100;
  return nis % 1 === 0 ? `₪${nis}` : `₪${nis.toFixed(2)}`;
}

export async function buildSnapshot(familyId: string): Promise<Record<string, unknown>> {
  const today = todayISO();
  const month = today.slice(0, 7);
  const last = prevMonth(month);
  const windowStart = addDaysISO(today, -PAST_DAYS);
  const windowEnd = addDaysISO(today, FUTURE_DAYS);

  const [
    members,
    kids,
    notes,
    projects,
    events,
    chores,
    grocery,
    expensesAll,
    blocks,
  ] = await Promise.all([
    familyMembersRepo.listByFamily(familyId),
    kidsRepo.listByFamily(familyId),
    notesRepo.listByFamily(familyId),
    projectsRepo.listByFamily(familyId),
    familyEventsRepo.listByFamily(familyId),
    choresRepo.listUndone(familyId),
    groceryRepo.listUnbought(familyId),
    expensesRepo.listByFamily(familyId),
    scheduleBlocksRepo.listByFamily(familyId),
  ]);

  // Name maps (active only) — used to resolve owner UUIDs to readable names.
  const kidName = new Map<string, string>();
  for (const k of kids) if (k.isActive) kidName.set(k.id, k.name);
  const memberName = new Map<string, string>();
  for (const m of members) if (m.isActive) memberName.set(m.id, m.displayName);

  const ownerOf = (
    assigneeType: string | null,
    assigneeId: string | null,
  ): string | null => {
    if (assigneeType === "kid" && assigneeId) return kidName.get(assigneeId) ?? null;
    if (assigneeType === "member" && assigneeId) return memberName.get(assigneeId) ?? null;
    return null;
  };

  const truncated: string[] = [];
  const cap = <T>(arr: T[], n: number, label: string): T[] => {
    if (arr.length > n) truncated.push(`${label} (${arr.length}→${n})`);
    return arr.slice(0, n);
  };

  // ── notes (the heart of the brain) ──
  const notesOut = cap(notes, CAPS.notes, "notes").map((n) => ({
    ...(n.title ? { title: n.title } : {}),
    body: n.body,
    ...(n.pinned ? { pinned: true } : {}),
    ...(n.kidId && kidName.has(n.kidId) ? { owner: kidName.get(n.kidId) } : {}),
  }));

  // ── projects ──
  const projectsOut = cap(projects, CAPS.projects, "projects").map((p) => ({
    title: p.title,
    status: p.status,
    progress: p.progress,
    ...(p.description ? { description: p.description } : {}),
    ...(p.kidId && kidName.has(p.kidId) ? { owner: kidName.get(p.kidId) } : {}),
  }));

  // ── events: recurring (always) + one-time within the window ──
  const recurringEvents: Record<string, unknown>[] = [];
  const oneTimeEvents: Record<string, unknown>[] = [];
  for (const e of events) {
    const owner = ownerOf(e.assigneeType, e.assigneeId);
    const time = e.allDay ? "כל היום" : `${hhmm(e.startMinutes)}-${hhmm(e.endMinutes)}`;
    if (e.isRecurring && Array.isArray(e.daysOfWeek) && e.daysOfWeek.length > 0) {
      recurringEvents.push({
        title: e.title,
        days: heDays(e.daysOfWeek),
        time,
        ...(owner ? { owner } : {}),
        ...(e.location ? { location: e.location } : {}),
      });
    } else if (e.date && e.date >= windowStart && e.date <= windowEnd) {
      oneTimeEvents.push({
        title: e.title,
        date: e.date,
        ...(e.endDate ? { endDate: e.endDate } : {}),
        time,
        ...(owner ? { owner } : {}),
        ...(e.location ? { location: e.location } : {}),
      });
    }
  }
  oneTimeEvents.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const oneTimeCapped = cap(oneTimeEvents, CAPS.events, "events");

  // ── chores (open) ──
  const choresOut = cap(chores, CAPS.chores, "chores").map((c) => ({
    title: c.title,
    ...(c.assignedToMemberId && memberName.has(c.assignedToMemberId)
      ? { assignee: memberName.get(c.assignedToMemberId) }
      : c.assignedTo
        ? { assignee: c.assignedTo }
        : {}),
    ...(c.selectedForToday ? { today: true } : {}),
  }));

  // ── grocery (unbought) ──
  const groceryOut = cap(grocery, CAPS.grocery, "grocery").map((g) => ({
    item: g.title,
    ...(g.qty ? { qty: g.qty } : {}),
    category: g.shoppingCategory ?? "grocery",
  }));

  // ── outstanding kid payments ──
  const paymentsOut = buildOutstanding(expensesAll).map((p) => ({
    name: p.note ?? "",
    amount: ils(p.amount),
    due: p.dueDate,
    recurring: p.isRecurring,
    ...(kidName.has(p.kidId) ? { owner: kidName.get(p.kidId) } : {}),
  }));

  // ── schedule blocks (kids' weekly classes/hobbies) ──
  const blocksOut = cap(blocks, CAPS.blocks, "scheduleBlocks").map((b) => ({
    kid: kidName.get(b.kidId) ?? "?",
    title: b.title,
    type: b.type,
    days: heDays(b.daysOfWeek),
    time: `${hhmm(b.startMinutes)}-${hhmm(b.endMinutes)}`,
    ...(b.location ? { location: b.location } : {}),
  }));

  // ── expenses: this-month total + by-category, plus last-month total ──
  const summarize = (rows: typeof expensesAll) => {
    const paid = rows.filter((e) => e.paid !== false);
    const total = paid.reduce((s, e) => s + e.amount, 0);
    const byCat: Record<string, number> = {};
    for (const e of paid) byCat[e.categoryName] = (byCat[e.categoryName] ?? 0) + e.amount;
    return { total, byCat };
  };
  const thisMonth = summarize(expensesAll.filter((e) => e.date.startsWith(month)));
  const lastMonth = summarize(expensesAll.filter((e) => e.date.startsWith(last)));

  return {
    today,
    family: {
      members: members
        .filter((m) => m.isActive)
        .map((m) => (m.role ? `${m.displayName} (${m.role})` : m.displayName)),
      kids: kids.filter((k) => k.isActive).map((k) => k.name),
    },
    notes: notesOut,
    projects: projectsOut,
    recurringEvents,
    upcomingAndRecentEvents: oneTimeCapped,
    openChores: choresOut,
    groceryToBuy: groceryOut,
    outstandingPayments: paymentsOut,
    kidSchedule: blocksOut,
    spending: {
      thisMonth: {
        month,
        total: ils(thisMonth.total),
        byCategory: Object.fromEntries(
          Object.entries(thisMonth.byCat).map(([k, v]) => [k, ils(v)]),
        ),
      },
      lastMonth: { month: last, total: ils(lastMonth.total) },
    },
    ...(truncated.length ? { truncated } : {}),
  };
}
