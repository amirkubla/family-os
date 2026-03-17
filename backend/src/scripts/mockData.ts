/**
 * mockData.ts — Populate a family with rich mock data for demo/testing.
 *
 * Usage:
 *   npm run db:mock -- <familyId>
 *
 * What it inserts:
 *   - 2 parent family members
 *   - 3 kids (with recurring schedule blocks)
 *   - 15 grocery items (mix of bought / unbought)
 *   - 12 chores (mix of done / pending / selected-for-today)
 *   - 6 projects (across idea / in_progress / done)
 *   - 5 notes (2 pinned)
 *   - 8 family events (recurring + one-time)
 *
 * Safe to run multiple times — always appends new rows.
 */

import { db } from "../db/client.js";
import {
  familyMembers,
  kids,
  groceryItems,
  chores,
  projects,
  notes,
  scheduleBlocks,
  familyEvents,
} from "../db/schema.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minutes from HH:MM string, e.g. "08:30" → 510 */
function t(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const familyId = process.argv[2];
  if (!familyId) {
    console.error("❌  Usage: npm run db:mock -- <familyId>");
    process.exit(1);
  }

  console.log(`🎭  Inserting mock data for family ${familyId}…\n`);

  // ── Family members (parents) ──────────────────────────────────────────────
  const [mom, dad] = await db
    .insert(familyMembers)
    .values([
      {
        familyId,
        displayName: "אמא",
        role: "parent",
        color: "#FF6B6B",
        avatarEmoji: "👩",
        isActive: true,
      },
      {
        familyId,
        displayName: "אבא",
        role: "parent",
        color: "#6C63FF",
        avatarEmoji: "👨",
        isActive: true,
      },
    ])
    .returning();

  console.log(`  👩  Family member: ${mom.displayName} (${mom.id})`);
  console.log(`  👨  Family member: ${dad.displayName} (${dad.id})`);

  // ── Kids ──────────────────────────────────────────────────────────────────
  const [noa, ido, yael] = await db
    .insert(kids)
    .values([
      { familyId, name: "נועה", color: "#FF6B6B", emoji: "🌸", isActive: true },
      { familyId, name: "עידו", color: "#4ECDC4", emoji: "🚀", isActive: true },
      { familyId, name: "יעל", color: "#FFA726", emoji: "🦋", isActive: true },
    ])
    .returning();

  console.log(`  🌸  Kid: ${noa.name} (${noa.id})`);
  console.log(`  🚀  Kid: ${ido.name} (${ido.id})`);
  console.log(`  🦋  Kid: ${yael.name} (${yael.id})`);

  // ── Schedule blocks ───────────────────────────────────────────────────────
  // Sun=0 Mon=1 Tue=2 Wed=3 Thu=4 Fri=5 Sat=6
  await db.insert(scheduleBlocks).values([
    // Noa — school Sun–Thu, ballet Wed
    { familyId, kidId: noa.id, dayOfWeek: 0, title: "בית ספר", type: "school", startMinutes: t("08:00"), endMinutes: t("13:30"), isRecurring: true },
    { familyId, kidId: noa.id, dayOfWeek: 1, title: "בית ספר", type: "school", startMinutes: t("08:00"), endMinutes: t("13:30"), isRecurring: true },
    { familyId, kidId: noa.id, dayOfWeek: 2, title: "בית ספר", type: "school", startMinutes: t("08:00"), endMinutes: t("13:30"), isRecurring: true },
    { familyId, kidId: noa.id, dayOfWeek: 3, title: "בית ספר", type: "school", startMinutes: t("08:00"), endMinutes: t("13:30"), isRecurring: true },
    { familyId, kidId: noa.id, dayOfWeek: 4, title: "בית ספר", type: "school", startMinutes: t("08:00"), endMinutes: t("13:30"), isRecurring: true },
    { familyId, kidId: noa.id, dayOfWeek: 3, title: "בלט", type: "hobby", startMinutes: t("16:00"), endMinutes: t("17:30"), location: "אולפן ריקוד", color: "#FF6B6B", isRecurring: true },

    // Ido — school Sun–Thu, football Tue+Thu
    { familyId, kidId: ido.id, dayOfWeek: 0, title: "בית ספר", type: "school", startMinutes: t("07:45"), endMinutes: t("13:15"), isRecurring: true },
    { familyId, kidId: ido.id, dayOfWeek: 1, title: "בית ספר", type: "school", startMinutes: t("07:45"), endMinutes: t("13:15"), isRecurring: true },
    { familyId, kidId: ido.id, dayOfWeek: 2, title: "בית ספר", type: "school", startMinutes: t("07:45"), endMinutes: t("13:15"), isRecurring: true },
    { familyId, kidId: ido.id, dayOfWeek: 3, title: "בית ספר", type: "school", startMinutes: t("07:45"), endMinutes: t("13:15"), isRecurring: true },
    { familyId, kidId: ido.id, dayOfWeek: 4, title: "בית ספר", type: "school", startMinutes: t("07:45"), endMinutes: t("13:15"), isRecurring: true },
    { familyId, kidId: ido.id, dayOfWeek: 2, title: "כדורגל", type: "hobby", startMinutes: t("17:00"), endMinutes: t("18:30"), location: "מגרש ספורט", color: "#4ECDC4", isRecurring: true },
    { familyId, kidId: ido.id, dayOfWeek: 4, title: "כדורגל", type: "hobby", startMinutes: t("17:00"), endMinutes: t("18:30"), location: "מגרש ספורט", color: "#4ECDC4", isRecurring: true },

    // Yael — kindergarten Sun–Thu, swimming Mon
    { familyId, kidId: yael.id, dayOfWeek: 0, title: "גן ילדים", type: "school", startMinutes: t("08:00"), endMinutes: t("14:00"), isRecurring: true },
    { familyId, kidId: yael.id, dayOfWeek: 1, title: "גן ילדים", type: "school", startMinutes: t("08:00"), endMinutes: t("14:00"), isRecurring: true },
    { familyId, kidId: yael.id, dayOfWeek: 2, title: "גן ילדים", type: "school", startMinutes: t("08:00"), endMinutes: t("14:00"), isRecurring: true },
    { familyId, kidId: yael.id, dayOfWeek: 3, title: "גן ילדים", type: "school", startMinutes: t("08:00"), endMinutes: t("14:00"), isRecurring: true },
    { familyId, kidId: yael.id, dayOfWeek: 4, title: "גן ילדים", type: "school", startMinutes: t("08:00"), endMinutes: t("14:00"), isRecurring: true },
    { familyId, kidId: yael.id, dayOfWeek: 1, title: "שחייה", type: "hobby", startMinutes: t("16:30"), endMinutes: t("17:30"), location: "בריכה עירונית", color: "#FFA726", isRecurring: true },
  ]);

  console.log(`  📅  Schedule blocks inserted`);

  // ── Grocery items ─────────────────────────────────────────────────────────
  await db.insert(groceryItems).values([
    // Unbought
    { familyId, title: "חלב", shoppingCategory: "grocery", subcategory: "מוצרי חלב", qty: "2 ליטר", isBought: false },
    { familyId, title: "לחם", shoppingCategory: "grocery", subcategory: "מאפים", qty: "1 כיכר", isBought: false },
    { familyId, title: "ביצים", shoppingCategory: "grocery", subcategory: "מוצרי חלב", qty: "12", isBought: false },
    { familyId, title: "עגבניות", shoppingCategory: "grocery", subcategory: "ירקות", qty: "1 ק\"ג", isBought: false },
    { familyId, title: "מלפפונים", shoppingCategory: "grocery", subcategory: "ירקות", qty: "500 גרם", isBought: false },
    { familyId, title: "עוף שלם", shoppingCategory: "grocery", subcategory: "בשר ועוף", qty: "1", isBought: false },
    { familyId, title: "גבינה צהובה", shoppingCategory: "grocery", subcategory: "מוצרי חלב", qty: "200 גרם", isBought: false },
    { familyId, title: "שמן זית", shoppingCategory: "grocery", subcategory: "שמנים", qty: "1 בקבוק", isBought: false },
    { familyId, title: "פסטה", shoppingCategory: "grocery", subcategory: "קטניות ודגנים", qty: "500 גרם", isBought: false },
    { familyId, title: "רסק עגבניות", shoppingCategory: "grocery", subcategory: "שימורים", qty: "2 קופסאות", isBought: false },
    // Bought
    { familyId, title: "תפוחים", shoppingCategory: "grocery", subcategory: "פירות", qty: "1 ק\"ג", isBought: true },
    { familyId, title: "יוגורט", shoppingCategory: "grocery", subcategory: "מוצרי חלב", qty: "4 יחידות", isBought: true },
    { familyId, title: "מיץ תפוזים", shoppingCategory: "grocery", subcategory: "משקאות", qty: "1 ליטר", isBought: true },
    { familyId, title: "שקדים", shoppingCategory: "grocery", subcategory: "חטיפים", qty: "200 גרם", isBought: true },
    { familyId, title: "גרנולה", shoppingCategory: "grocery", subcategory: "ארוחת בוקר", qty: "1 חבילה", isBought: true },
  ]);

  console.log(`  🛒  Grocery items inserted`);

  // ── Chores ────────────────────────────────────────────────────────────────
  await db.insert(chores).values([
    // Selected for today (mix done/pending)
    { familyId, title: "לשטוף כלים", assignedTo: "אמא", assignedToMemberId: mom.id, done: true, selectedForToday: true },
    { familyId, title: "לסדר את הסלון", assignedTo: "אבא", assignedToMemberId: dad.id, done: false, selectedForToday: true },
    { familyId, title: "לקחת את יעל מהגן", assignedTo: "אמא", assignedToMemberId: mom.id, done: false, selectedForToday: true },
    { familyId, title: "לקנות קניות", assignedTo: "אבא", assignedToMemberId: dad.id, done: false, selectedForToday: true },
    { familyId, title: "לשאוב אבק", assignedTo: "אמא", assignedToMemberId: mom.id, done: true, selectedForToday: true },
    // Not selected for today
    { familyId, title: "לקפל כביסה", assignedTo: "אמא", assignedToMemberId: mom.id, done: false, selectedForToday: false },
    { familyId, title: "לגזום את הגינה", assignedTo: "אבא", assignedToMemberId: dad.id, done: false, selectedForToday: false },
    { familyId, title: "לנקות את חדר האמבטיה", done: false, selectedForToday: false },
    { familyId, title: "להחליף מצעים", assignedTo: "אמא", assignedToMemberId: mom.id, done: false, selectedForToday: false },
    { familyId, title: "לשלם חשבון חשמל", assignedTo: "אבא", assignedToMemberId: dad.id, done: true, selectedForToday: false },
    { familyId, title: "לתקן ברז מטפטף", assignedTo: "אבא", assignedToMemberId: dad.id, done: false, selectedForToday: false },
    { familyId, title: "לארגן את המחסן", done: false, selectedForToday: false },
  ]);

  console.log(`  ✅  Chores inserted`);

  // ── Projects ──────────────────────────────────────────────────────────────
  await db.insert(projects).values([
    { familyId, title: "שיפוץ חדר ילדים", description: "צביעת הקירות, רהיטים חדשים לנועה ועידו", status: "in_progress", progress: 40 },
    { familyId, title: "חופשת קיץ", description: "לתכנן טיול משפחתי לאילת בחודש יולי", status: "in_progress", progress: 20 },
    { familyId, title: "גינון וחצר", description: "שתילת עצי פרי ושיפוץ אזור המשחקים", status: "idea", progress: 0 },
    { familyId, title: "מסיבת יום הולדת לעידו", description: "יום הולדת 8 - לתאם מקום, אורחים ועוגה", status: "in_progress", progress: 65 },
    { familyId, title: "החלפת מחשב המשפחה", description: "מחקר ורכישת מחשב נייד חדש לשימוש משפחתי", status: "done", progress: 100 },
    { familyId, title: "קורס שפה לילדים", description: "לרשום את הילדים לקורס אנגלית קיץ", status: "idea", progress: 0 },
  ]);

  console.log(`  📁  Projects inserted`);

  // ── Notes ─────────────────────────────────────────────────────────────────
  await db.insert(notes).values([
    { familyId, title: "📌 תזכורת שבועית", body: "ביום ראשון — לקחת את עידו לרופא שיניים בשעה 17:00\nביום שלישי — פגישת הורים בבית הספר של נועה", pinned: true },
    { familyId, title: "🛒 לקנות בקרוב", body: "נעלי ספורט לעידו — מידה 33\nתיק בית ספר חדש לנועה\nבגדי ים ליעל לפני הקיץ", pinned: true },
    { familyId, title: "טלפונים חשובים", body: "רופאת ילדים: 03-1234567\nגן יעל: 052-8765432\nבית ספר נועה ועידו: 03-9876543", pinned: false },
    { familyId, title: "מתכון — פשטידת ירקות", body: "מצרכים: 4 ביצים, 1 קישוא, 1 גזר, גבינה צהובה, פירורי לחם\nלערבב הכול, לאפות 200 מעלות 35 דקות", pinned: false },
    { familyId, title: "קודים ומנויים", body: "Netflix: חשבון משפחתי\nספוטיפיי: מנוי פרמיום\nוואי-פיי שכנים: לא לשכוח לשלם החודש", pinned: false },
  ]);

  console.log(`  📝  Notes inserted`);

  // ── Family events ─────────────────────────────────────────────────────────
  await db.insert(familyEvents).values([
    // Recurring weekly
    { familyId, title: "ארוחת שבת משפחתית", assigneeType: "family", dayOfWeek: 5, startMinutes: t("19:00"), endMinutes: t("21:00"), location: "בית סבא וסבתא", color: "#FFD700", isRecurring: true },
    { familyId, title: "ספורט בוקר — אבא", assigneeType: "member", assigneeId: dad.id, dayOfWeek: 0, startMinutes: t("06:30"), endMinutes: t("07:30"), location: "חדר כושר", color: "#6C63FF", isRecurring: true },
    { familyId, title: "יוגה — אמא", assigneeType: "member", assigneeId: mom.id, dayOfWeek: 2, startMinutes: t("09:00"), endMinutes: t("10:00"), location: "סטודיו יוגה", color: "#FF6B6B", isRecurring: true },
    { familyId, title: "שיעור פרטי בחשבון — נועה", assigneeType: "kid", assigneeId: noa.id, dayOfWeek: 1, startMinutes: t("16:00"), endMinutes: t("17:00"), color: "#FF6B6B", isRecurring: true },
    { familyId, title: "ערב הורים + ילדים", assigneeType: "family", dayOfWeek: 4, startMinutes: t("19:30"), endMinutes: t("21:00"), location: "בית", color: "#4ECDC4", isRecurring: true },
    // One-time upcoming (existing)
    { familyId, title: "ביקור רופא — עידו", assigneeType: "kid", assigneeId: ido.id, dayOfWeek: 0, startMinutes: t("17:00"), endMinutes: t("17:45"), location: "קופת חולים", color: "#4ECDC4", isRecurring: false, date: "2026-03-22" },
    { familyId, title: "פגישת הורים — בית ספר", assigneeType: "family", dayOfWeek: 2, startMinutes: t("18:00"), endMinutes: t("19:30"), location: "בית ספר רמות", color: "#FFD700", isRecurring: false, date: "2026-03-25" },
    { familyId, title: "יום הולדת — סבתא חנה", assigneeType: "family", dayOfWeek: 6, startMinutes: t("12:00"), endMinutes: t("16:00"), location: "בית סבתא", color: "#FF6B6B", isRecurring: false, date: "2026-03-28" },
  ]);

  // ── Standalone one-time events — next 3 weeks ─────────────────────────────
  await db.insert(familyEvents).values([
    // --- נועה ---
    { familyId, title: "בדיקת עיניים — נועה", assigneeType: "kid", assigneeId: noa.id, dayOfWeek: 4, startMinutes: t("15:30"), endMinutes: t("16:15"), location: "קופת חולים", color: "#FF6B6B", isRecurring: false, date: "2026-03-19" },
    { familyId, title: "מסיבת יום הולדת — חברה של נועה", assigneeType: "kid", assigneeId: noa.id, dayOfWeek: 4, startMinutes: t("16:00"), endMinutes: t("18:30"), location: "אולם אירועים", color: "#FF6B6B", isRecurring: false, date: "2026-03-26" },
    { familyId, title: "טיול שנתי — בית ספר", assigneeType: "kid", assigneeId: noa.id, dayOfWeek: 5, startMinutes: t("07:30"), endMinutes: t("15:00"), location: "נחל אלכסנדר", color: "#FF6B6B", isRecurring: false, date: "2026-04-03" },
    { familyId, title: "הצגת ילדים — תאטרון הבימה", assigneeType: "kid", assigneeId: noa.id, dayOfWeek: 2, startMinutes: t("18:00"), endMinutes: t("19:30"), location: "תאטרון הבימה", color: "#FF6B6B", isRecurring: false, date: "2026-04-07" },

    // --- עידו ---
    { familyId, title: "גמר כדורגל עירוני", assigneeType: "kid", assigneeId: ido.id, dayOfWeek: 5, startMinutes: t("10:00"), endMinutes: t("11:30"), location: "מגרש ספורט אזורי", color: "#4ECDC4", isRecurring: false, date: "2026-03-20" },
    { familyId, title: "🎉 יום הולדת עידו!", assigneeType: "kid", assigneeId: ido.id, dayOfWeek: 2, startMinutes: t("17:00"), endMinutes: t("20:00"), location: "בית", color: "#4ECDC4", isRecurring: false, date: "2026-03-31" },
    { familyId, title: "רופא שיניים — עידו", assigneeType: "kid", assigneeId: ido.id, dayOfWeek: 4, startMinutes: t("15:00"), endMinutes: t("15:45"), location: "קליניקת שיניים", color: "#4ECDC4", isRecurring: false, date: "2026-04-02" },
    { familyId, title: "מפגש עם ירדן", assigneeType: "kid", assigneeId: ido.id, dayOfWeek: 1, startMinutes: t("16:00"), endMinutes: t("18:00"), color: "#4ECDC4", isRecurring: false, date: "2026-04-06" },

    // --- יעל ---
    { familyId, title: "בדיקת שמיעה — יעל", assigneeType: "kid", assigneeId: yael.id, dayOfWeek: 3, startMinutes: t("09:30"), endMinutes: t("10:15"), location: "קופת חולים", color: "#FFA726", isRecurring: false, date: "2026-03-18" },
    { familyId, title: "יום גיבורים בגן — יעל", assigneeType: "kid", assigneeId: yael.id, dayOfWeek: 2, startMinutes: t("09:00"), endMinutes: t("11:30"), color: "#FFA726", isRecurring: false, date: "2026-03-24" },
    { familyId, title: "טיול גן — מוזיאון ילדים", assigneeType: "kid", assigneeId: yael.id, dayOfWeek: 3, startMinutes: t("09:30"), endMinutes: t("13:00"), location: "מוזיאון ילדים", color: "#FFA726", isRecurring: false, date: "2026-04-01" },
    { familyId, title: "יום כיף בפארק — יעל", assigneeType: "kid", assigneeId: yael.id, dayOfWeek: 0, startMinutes: t("10:00"), endMinutes: t("13:00"), location: "פארק הירקון", color: "#FFA726", isRecurring: false, date: "2026-04-05" },

    // --- כל המשפחה ---
    { familyId, title: "פיקניק משפחתי", assigneeType: "family", dayOfWeek: 5, startMinutes: t("11:00"), endMinutes: t("14:00"), location: "פארק הירקון", color: "#FFD700", isRecurring: false, date: "2026-03-20" },
    { familyId, title: "ביקור אצל סבא וסבתא", assigneeType: "family", dayOfWeek: 1, startMinutes: t("18:00"), endMinutes: t("21:00"), location: "בית סבא", color: "#FFD700", isRecurring: false, date: "2026-03-23" },
    { familyId, title: "ערב סרטים משפחתי", assigneeType: "family", dayOfWeek: 5, startMinutes: t("20:00"), endMinutes: t("22:00"), location: "בית", color: "#6C63FF", isRecurring: false, date: "2026-03-27" },
    { familyId, title: "שוק איכרים", assigneeType: "family", dayOfWeek: 5, startMinutes: t("09:00"), endMinutes: t("11:00"), location: "שוק הכרמל", color: "#FFD700", isRecurring: false, date: "2026-04-03" },
    { familyId, title: "ביקור בגן החיות", assigneeType: "family", dayOfWeek: 0, startMinutes: t("09:30"), endMinutes: t("14:00"), location: "גן חיות ירושלים", color: "#4ECDC4", isRecurring: false, date: "2026-04-05" },
  ]);

  console.log(`  📆  Family events inserted`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
✅  Mock data inserted successfully for family ${familyId}
   👩 👨  2 parents
   👧 🧒 🦋  3 kids  (19 schedule blocks)
   🛒  15 grocery items  (10 unbought, 5 bought)
   ✅  12 chores  (5 selected for today)
   📁  6 projects  (3 in_progress, 2 idea, 1 done)
   📝  5 notes  (2 pinned)
   📆  25 family events  (5 recurring, 20 one-time: 4×נועה, 4×עידו, 4×יעל, 5×משפחה + 3 existing)
`);
}

main().catch((err) => {
  console.error("❌  Mock data failed:", err);
  process.exit(1);
});
