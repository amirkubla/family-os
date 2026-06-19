# Kid Payments (תשלומים) — QA Report

**Date:** 2026-06-19
**Tester:** Claude (web preview, RN-Web)
**Scope:** The kid-payments feature added across commits `e582cc8`, `9a046d4`, `36c0758`, `cc50e8c`
(per-kid payments on the kid screen + the "תשלומי ילדים" section on the budget screen).
**Status of those commits:** committed locally, **NOT pushed** at time of testing.

## Test environment (important for reproducing)

- The live web app's `.env.development` normally points `EXPO_PUBLIC_API_URL` at the **prod**
  Cloud Run backend, which still runs the **pre-`paid` code** — so `paid` does not round-trip and a
  background sync can revert optimistic `paid` state. This confounds testing.
- For this pass I temporarily set `EXPO_PUBLIC_API_URL=http://localhost:3000` (local backend, which
  has the new `paid`-aware code, talking to the same prod Neon DB), restarted Expo, and tested against
  that consistent stack. **`.env.development` has been restored to the prod URL.**
- Migration `0024_add_paid_to_expenses` is already applied to prod Neon (the `paid` column exists).
- All test data (`QA *` + leftover `חוג ציור` rows) was deleted from server + client after testing.

---

## Findings summary

| ID | Severity | Area | Summary | Status |
|----|----------|------|---------|--------|
| BUG-1 | **Medium** | Recurring + undo | Undo after marking a recurring payment paid leaves a **duplicate** outstanding payment | ✅ Fixed (see below) |
| BUG-2 | Low-Med | Edit / sync | Toggling "recurring" OFF doesn't clear `recurrenceType`/`recurrenceDay` on the server (PATCH drops `undefined`) | ✅ Fixed |
| BUG-3 | Low | Accessibility | Payment row Pressables lack `accessibilityRole`/`accessibilityLabel`; budget row also lacks `testID` | Open |
| NIT-1 | Low | Cosmetic | `recurrenceDay = 31` shows badge "31 בחודש" but the actual date clamps to the 30th (and drifts) | Open |
| NIT-2 | Low | Polish | Budget rows show "כל שבוע"/"כל חודש" without the day; kid view shows the day too (inconsistent) | Open |

> **Update:** BUG-1 and BUG-2 were fixed and re-verified end-to-end against the local backend (see each
> section). BUG-3, NIT-1, NIT-2 remain open.

No crashes, no console errors, no RTL/layout breakage observed. Core happy paths all pass (see "What passed").

---

## Detailed findings

### BUG-1 (Medium) — Undo after mark-paid on a recurring payment creates a duplicate

**Repro:**
1. On a kid page, add a **recurring** payment (e.g. weekly "חוג שחייה").
2. Tap the green ✓ (mark paid). The original is settled (`paid=true, isRecurring=false`) and the **next
   occurrence is auto-queued** (`paid=false, isRecurring=true`, due +1 period). Correct so far.
3. Tap the **undo** (↩) on the now-settled row.

**Expected:** back to a single outstanding recurring payment.
**Actual:** two outstanding rows remain —
- the un-done original: `paid=false, isRecurring=false` (silently demoted to a **one-time**), and
- the auto-queued next occurrence: `paid=false, isRecurring=true`.

So the user sees the payment twice, and the original lost its recurrence. Verified at the store level
(both rows persist; they also persist server-side since undo PATCHes `paid=false` and the queued row was
already POSTed).

**Root cause:** `markKidPaymentPaidRemote` ([src/lib/sync/remoteCrud.ts](src/lib/sync/remoteCrud.ts) ~L745)
spawns a new occurrence on settle, but `handleMarkUnpaid` ([app/(tabs)/kid/[kidId].tsx](app/(tabs)/kid/[kidId].tsx))
just flips `paid=false` — it has no link back to the spawned occurrence, so undo can't remove it, and it
doesn't restore `isRecurring` on the original.

**✅ FIXED.** Added `markKidPaymentUnpaidRemote(payment)` in
[src/lib/sync/remoteCrud.ts](src/lib/sync/remoteCrud.ts). The settled row keeps its
`recurrenceType`/`recurrenceDay` (only `isRecurring` is cleared on settle), so undo detects a former
recurring occurrence and: (1) finds the queued next occurrence — matched precisely by
`date === nextDueDate(payment.date, type)` plus kid/note/amount — and deletes it, (2) restores the
original to `paid=false, isRecurring=true`. The kid view's `handleMarkUnpaid` now calls this helper.
Re-verified: mark-paid → undo leaves exactly **1** recurring row, locally and on the server.
Remaining edge case (not handled): marking several occurrences paid before undoing an earlier one can
still leave the older restored row alongside the active one — deep multi-undo scenario, low priority.

---

### BUG-2 (Low-Med) — Toggling "recurring" OFF leaves stale recurrence fields on the server

**Repro:**
1. Create a recurring monthly payment (gets `recurrenceType=monthly, recurrenceDay=19`).
2. Edit it → toggle **תשלום חוזר** OFF → save.
3. Query the backend for that row.

**Expected:** `isRecurring=false, recurrenceType=null, recurrenceDay=null`.
**Actual (server):** `isRecurring=false` but `recurrenceType=monthly, recurrenceDay=19` (stale).
Local store is briefly correct (cleared to `undefined`), but a later `pullAll` re-hydrates the stale
server values.

**Root cause:** `updateExpenseRemote(id, patch)` ([src/lib/sync/remoteCrud.ts](src/lib/sync/remoteCrud.ts) ~L725)
sends the patch via `JSON.stringify`, which **drops keys whose value is `undefined`**.
`KidPaymentModal.handleSave` ([src/components/KidPaymentModal.tsx](src/components/KidPaymentModal.tsx))
sets `recurrenceType: undefined, recurrenceDay: undefined` when not recurring, so those never reach the
PATCH body and the server columns are never nulled.

**Impact:** cosmetically harmless today because every badge/roll-forward path gates on `isRecurring`
first. But it's a latent data inconsistency. (Correction to an earlier draft: the regular `ExpenseModal`
is NOT affected — budget edits go through `handleSaveExpense` which does delete-then-`addExpenseRemote`,
and `addExpenseRemote` → `localToApiExpense` already writes `recurrenceType: … ?? null`. Only
`KidPaymentModal` edits use `updateExpenseRemote`.)

**✅ FIXED.** `updateExpenseRemote` ([src/lib/sync/remoteCrud.ts](src/lib/sync/remoteCrud.ts)) now builds
the PATCH body by coercing any present-`undefined` value to `null` before sending, so explicit clears
persist. Absent keys stay absent (field-by-field merge for concurrent edits is unaffected). Re-verified:
after toggling recurring OFF, the server row has `recurrenceType=null, recurrenceDay=null`.

---

### BUG-3 (Low) — Payment row Pressables missing accessibility props

- Budget "תשלומי ילדים" row: [app/(tabs)/budget.tsx](app/(tabs)/budget.tsx) ~L346 — `<Pressable style={styles.kidPayRow} onPress={…navigate}>` has **no** `accessibilityRole`, `accessibilityLabel`, or `testID`.
- Kid-view payment card: [app/(tabs)/kid/[kidId].tsx](app/(tabs)/kid/[kidId].tsx) ~L846 — `<Pressable … onPress={edit}>` has a `testID` but **no** `accessibilityRole`/`accessibilityLabel`.

CLAUDE.md explicitly requires `accessibilityRole="button"` + `accessibilityLabel` + a stable `testID` on
new interactive Pressables ("so the element is reachable from automation and screen readers"). Because of
this, synthetic clicks couldn't reliably trigger the **budget row → kid page navigation** in automation;
it needs a real-tap / manual confirmation (the mark-paid IconButtons, which DO have labels, fired fine).

**Suggested fix:** add `accessibilityRole="button"`, an `accessibilityLabel` (e.g. the payment name), and
(for the budget row) a `testID` like `budget-kid-payment-${pay.id}`.

---

### NIT-1 (Low, cosmetic) — Day-31 badge vs. clamped date

Creating a monthly payment on day **31**: stored `recurrenceDay=31`, but the due date clamps to the
month's last day (e.g. `2026-06-30`). The badge then reads **"כל חודש, 31 בחודש"** while the date shows
**"30/06"** — a visible mismatch. Also, `nextDueDate` advances from the *date* (06-30 → 07-30), so a "31st"
payment effectively becomes the 30th from then on (day drift). Logic refs:
`nextMonthlyDate` in [src/components/KidPaymentModal.tsx](src/components/KidPaymentModal.tsx),
`nextDueDate` in [src/utils/date.ts](src/utils/date.ts).

**Suggested fix (if desired):** either clamp/display the effective day in the badge, or recompute the next
due date from `recurrenceDay` (re-clamped per month) instead of advancing the stored date.

---

### NIT-2 (Low, polish) — Recurrence label differs between screens

- Kid view badge: **"כל שבוע, יום שישי"** / **"כל חודש, 19 בחודש"** (includes the day).
- Budget row badge: **"כל שבוע"** / **"כל חודש"** (no day). Ref: [app/(tabs)/budget.tsx](app/(tabs)/budget.tsx) ~L340.

Harmless but inconsistent. Consider reusing the kid-view label builder on the budget row.

---

## What passed (verified green)

Kid screen:
- Modal validation: empty name blocked; name-only (no amount) blocked. ✓
- One-time create → `paid=false`, `date=today`, category `ילדים וחוגים`, correct `kidId`. ✓
- Recurring weekly create, default day = today's weekday → due today. ✓
- Recurring monthly create, default day = today's date → due this month. ✓
- Wheel interaction (scroll to a day) changes `recurrenceDay`; "past day → next month" (day 5 on the 19th → next month 07-05). ✓
- Day-31 clamps to 06-30 (see NIT-1 for the cosmetic side). ✓
- Sorting: unpaid first ascending by due date, paid below descending. ✓
- Overdue (`date < today`, unpaid) shows red **"באיחור"**. ✓
- Mark paid → teal **שולם**, strikethrough title, undo (↩) button, moves below. ✓
- Recurring mark-paid → settle + queue next (date advanced, `recurrenceDay` preserved). ✓
- Edit (tap row) opens prefilled modal; toggle recurring OFF → becomes one-time locally (server caveat = BUG-2). ✓
- Delete → confirm dialog → removed (local + server). ✓
- Persistence across reload (consistent backend): unpaid survives, `paid` round-trips. ✓

Budget screen ("תשלומי ילדים"):
- Aggregates outstanding payments across all kids, each labeled with kid emoji + name. ✓
- Section hidden when no outstanding payments. ✓
- Unpaid payments excluded from the month spending total / recent-expenses list. ✓
- Recurring kid payments do NOT leak into the family "הוצאות קבועות" section. ✓
- Mark-paid from budget (one-time and recurring roll-forward) works via the shared helper; the icon
  button does not trigger row navigation. ✓
- Once paid, a payment leaves the section and rolls into `ילדים וחוגים` spending. ✓

Shared/other:
- `WheelPicker` extraction: `ExpenseModal`'s recurring wheels still render after the refactor. ✓
- `tsc --noEmit` clean; `expo lint` 0 errors (only pre-existing warnings). ✓

---

## Notes / by-design behaviors (not bugs, but worth knowing)

- **Recurring history accumulation:** every settled occurrence persists as its own paid row, so a
  long-running recurring payment grows a list of paid history rows under the kid. Already flagged to the
  maintainer; no "clear history" affordance yet.
- **Deleting a kid:** `expenses.kid_id` is `ON DELETE SET NULL`. After deleting a kid, that kid's
  payments get `kidId=null` → they vanish from both the kid view (`kidId === kidId`) and the budget
  "תשלומי ילדים" section (filter requires a truthy `kidId`), yet remain in the DB as `paid=false`
  (and excluded from spending). They become effectively invisible/unreachable. Edge case; consider
  whether orphaned unpaid payments should surface somewhere.
- **Pre-deploy reality:** until the backend is deployed, the live app talks to the old backend where
  `paid` is ignored on write (defaults `true`), so newly created kid payments can appear settled and
  optimistic `paid=false` can revert on sync. Deploying the current `master` fixes this.

## Suggested priority for next agent

1. ~~BUG-1 (duplicate on undo)~~ — ✅ fixed.
2. ~~BUG-2 (clear recurrence fields with `null`)~~ — ✅ fixed.
3. BUG-3 (a11y props) — quick, aligns with repo convention + unblocks Maestro/Playwright coverage.
4. NIT-1 / NIT-2 — polish.
