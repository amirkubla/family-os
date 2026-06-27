/**
 * mockData.ts — Populate a family with randomized mock data for testing.
 *
 * Usage:
 *   npm run db:mock -- <familyId> [options]
 *
 * Options:
 *   --skip-members       Don't create family members (use existing ones)
 *   --skip-kids          Don't create kids (use existing ones)
 *   --only <types>       Comma-separated list of what to seed (e.g. grocery,events)
 *                        Valid: members,kids,schedule,events,chores,grocery,notes,projects
 *   --kids N             Number of kids to create (default: 3)
 *   --chores N           Number of chores (default: 8)
 *   --grocery N          Number of grocery items (default: 12)
 *   --notes N            Number of notes (default: 4)
 *   --projects N         Number of projects (default: 3)
 *   --events N           Number of family events (default: 6)
 *   --kid-events N       Events per kid (default: 3)
 *   --schedule N         Schedule blocks per kid (default: 4)
 *
 * Examples:
 *   npm run db:mock -- <familyId>                              # Full mock (members + kids + data)
 *   npm run db:mock -- <familyId> --skip-members --skip-kids   # Only events/tasks for existing setup
 *   npm run db:mock -- <familyId> --only grocery,events        # Only grocery + events (uses existing members/kids)
 *   npm run db:mock -- <familyId> --skip-kids --chores 15      # Members + lots of chores, keep existing kids
 */

import { db } from "../db/client.js";
import { eq } from "drizzle-orm";
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
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const familyId = args[0];

  if (!familyId || familyId.startsWith("--")) {
    console.error("❌  Usage: npm run db:mock -- <familyId> [options]");
    console.error("   Options: --skip-members --skip-kids --kids N --chores N --grocery N");
    console.error("            --notes N --projects N --events N --kid-events N --schedule N");
    process.exit(1);
  }

  const getFlag = (name: string) => args.includes(`--${name}`);
  const getStr = (name: string): string | undefined => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };
  const getNum = (name: string, def: number) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? parseInt(args[idx + 1], 10) : def;
  };

  // --only grocery,events → only seed those types
  const onlyRaw = getStr("only");
  const only = onlyRaw ? new Set(onlyRaw.split(",").map((s) => s.trim())) : null;

  // When --only is used, skip members/kids unless explicitly included
  const skipMembers = getFlag("skip-members") || (only !== null && !only.has("members"));
  const skipKids = getFlag("skip-kids") || (only !== null && !only.has("kids"));

  return {
    familyId,
    skipMembers,
    skipKids,
    only,
    numKids: getNum("kids", 3),
    numChores: getNum("chores", 8),
    numGrocery: getNum("grocery", 20),
    numNotes: getNum("notes", 4),
    numProjects: getNum("projects", 3),
    numFamilyEvents: getNum("events", 6),
    numKidEvents: getNum("kid-events", 3),
    numSchedulePerKid: getNum("schedule", 4),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTimeRange(
  earliest = 420,
  latest = 1200,
  minDur = 30,
  maxDur = 150,
): { start: number; end: number } {
  const start = earliest + Math.floor(Math.random() * (latest - earliest));
  const dur = minDur + Math.floor(Math.random() * (maxDur - minDur));
  return { start, end: Math.min(start + dur, 1380) };
}

/** Format YYYY-MM-DD offset from today */
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Data pools (Hebrew, realistic for Israeli families)
// ---------------------------------------------------------------------------

const KID_NAMES = ["עידו", "נועה", "יעל", "אורי", "מיכל", "תומר", "שירה", "אלון", "דניאל", "מאיה"];
const KID_EMOJIS = ["🧒", "👧", "👦", "👶", "🧒🏻", "👧🏻", "👦🏻", "🐣"];
const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#FF8C42", "#6C5CE7"];

const FAMILY_EVENT_TITLES = [
  "ארוחת שישי משפחתית", "ביקור סבא וסבתא", "טיול משפחתי", "קניות שבועיות",
  "סידורים בבנק", "ביקור חברים", "יום כיף משפחתי", "ניקיון כללי",
  "אסיפת הורים", "אירוע בית ספר", "שוק איכרים", "ערב סרטים משפחתי",
  "פיקניק בפארק", "ביקור בגן חיות",
];

const KID_EVENT_TITLES = [
  "ביקור רופא", "ביקור רופא שיניים", "בדיקת שמיעה", "יום ספורט",
  "טיול שנתי", "הצגה בבית ספר", "יום הולדת חבר", "חוג מוזיקה",
  "תחרות שחייה", "מסיבת כיתה", "בדיקת עיניים", "מפגש עם חברים",
];

const SCHEDULE_SCHOOLS = ["בית ספר", "גן ילדים", "צהרון"];
const SCHEDULE_ACTIVITIES = [
  "חוג כדורגל", "חוג בלט", "חוג ציור", "שיעור פסנתר",
  "חוג שחייה", "חוג קראטה", "חוג דרמה", "חוג רובוטיקה",
  "יוגה לילדים", "חוג מחשבים", "חוג גיטרה", "חוג ג׳ודו",
];

const CHORE_TITLES = [
  "לשטוף כלים", "לנקות חדר אמבטיה", "לסדר את הסלון", "לקפל כביסה",
  "לשאוב אבק", "להוציא זבל", "לנקות מטבח", "לסדר חדר שינה",
  "לגזום את הגינה", "לנקות חלונות", "לארגן את המחסן", "לתלות כביסה",
  "לקנות קניות", "להכין ארוחת ערב", "לאסוף ילדים", "לשלם חשבונות",
  "להחליף מצעים", "לתקן ברז מטפטף",
];

const GROCERY_POOL: { title: string; qty: string; category: string; subcategory: string }[] = [
  // grocery — Produce
  { title: "עגבניות", qty: "1 ק\"ג", category: "grocery", subcategory: "Produce" },
  { title: "מלפפונים", qty: "500 גרם", category: "grocery", subcategory: "Produce" },
  { title: "בצל", qty: "שקית", category: "grocery", subcategory: "Produce" },
  { title: "תפוחי אדמה", qty: "2 ק\"ג", category: "grocery", subcategory: "Produce" },
  { title: "תפוחים", qty: "1 ק\"ג", category: "grocery", subcategory: "Produce" },
  { title: "בננות", qty: "אשכול", category: "grocery", subcategory: "Produce" },
  // grocery — Dairy
  { title: "חלב", qty: "2 ליטר", category: "grocery", subcategory: "Dairy" },
  { title: "ביצים", qty: "תבנית", category: "grocery", subcategory: "Dairy" },
  { title: "גבינה צהובה", qty: "200 גרם", category: "grocery", subcategory: "Dairy" },
  { title: "יוגורט", qty: "6 יחידות", category: "grocery", subcategory: "Dairy" },
  // grocery — Meat & Fish
  { title: "עוף שלם", qty: "1", category: "grocery", subcategory: "Meat" },
  { title: "כרעיים", qty: "1 ק\"ג", category: "grocery", subcategory: "Meat" },
  { title: "פילה סלמון", qty: "400 גרם", category: "grocery", subcategory: "Fish" },
  { title: "פילה אמנון", qty: "500 גרם", category: "grocery", subcategory: "Fish" },
  // grocery — Bakery
  { title: "לחם", qty: "2 כיכרות", category: "grocery", subcategory: "Bakery" },
  { title: "חלה", qty: "1", category: "grocery", subcategory: "Bakery" },
  // grocery — Frozen
  { title: "ירקות קפואים", qty: "שקית", category: "grocery", subcategory: "Frozen" },
  { title: "בורקס", qty: "חבילה", category: "grocery", subcategory: "Frozen" },
  // grocery — Snacks
  { title: "שקדים", qty: "200 גרם", category: "grocery", subcategory: "Snacks" },
  { title: "ביסלי", qty: "2 שקיות", category: "grocery", subcategory: "Snacks" },
  // grocery — Beverages
  { title: "מיץ תפוזים", qty: "1 ליטר", category: "grocery", subcategory: "Beverages" },
  { title: "מים מינרליים", qty: "שישיית בקבוקים", category: "grocery", subcategory: "Beverages" },
  // grocery — Pantry & Other
  { title: "פסטה", qty: "500 גרם", category: "grocery", subcategory: "Other" },
  { title: "אורז", qty: "חבילה", category: "grocery", subcategory: "Other" },
  { title: "רסק עגבניות", qty: "2 קופסאות", category: "grocery", subcategory: "Other" },
  { title: "שמן זית", qty: "בקבוק", category: "grocery", subcategory: "Other" },
  { title: "טונה", qty: "3 קופסאות", category: "grocery", subcategory: "Other" },
  { title: "חומוס", qty: "2 קופסאות", category: "grocery", subcategory: "Other" },

  // health
  { title: "אקמול", qty: "חבילה", category: "health", subcategory: "Medications" },
  { title: "נורופן לילדים", qty: "בקבוק", category: "health", subcategory: "Medications" },
  { title: "ויטמין D", qty: "1", category: "health", subcategory: "Vitamins" },
  { title: "מולטי ויטמין", qty: "צנצנת", category: "health", subcategory: "Vitamins" },
  { title: "משחת שיניים", qty: "2 שפופרות", category: "health", subcategory: "PersonalCare" },
  { title: "דאודורנט", qty: "1", category: "health", subcategory: "PersonalCare" },
  { title: "חיתולים", qty: "חבילה גדולה", category: "health", subcategory: "BabyCare" },
  { title: "מגבונים לחים", qty: "3 חבילות", category: "health", subcategory: "BabyCare" },
  { title: "פלסטרים", qty: "חבילה", category: "health", subcategory: "FirstAid" },
  { title: "קרם הגנה", qty: "בקבוק", category: "health", subcategory: "Skincare" },
  { title: "קרם לחות", qty: "1", category: "health", subcategory: "Skincare" },
  { title: "שמפו", qty: "בקבוק", category: "health", subcategory: "HairCare" },

  // home
  { title: "אקונומיקה", qty: "בקבוק", category: "home", subcategory: "Cleaning" },
  { title: "סבון כלים", qty: "בקבוק", category: "home", subcategory: "Kitchen" },
  { title: "נייר טואלט", qty: "חבילת 24", category: "home", subcategory: "PaperGoods" },
  { title: "מגבות נייר", qty: "6 גלילים", category: "home", subcategory: "PaperGoods" },
  { title: "אבקת כביסה", qty: "קופסה", category: "home", subcategory: "Laundry" },
  { title: "מרכך כביסה", qty: "בקבוק", category: "home", subcategory: "Laundry" },
  { title: "שקיות זבל", qty: "גליל", category: "home", subcategory: "Kitchen" },
  { title: "ספוגים למטבח", qty: "חבילה", category: "home", subcategory: "Kitchen" },
  { title: "סבון ידיים", qty: "2 בקבוקים", category: "home", subcategory: "Bathroom" },
  { title: "סוללות AA", qty: "חבילת 8", category: "home", subcategory: "Tools" },
  { title: "נרות ריחניים", qty: "2", category: "home", subcategory: "Decor" },
];

const NOTE_POOL: { title: string; body: string; pinned: boolean }[] = [
  { title: "📌 רשימת מטלות לסוף שבוע", body: "לסדר את המחסן\nלגזום את הגינה\nלצבוע את הגדר", pinned: true },
  { title: "רעיונות לטיול", body: "פארק הירקון, מוזיאון הילדים, חוף פלמחים, גן חיות", pinned: false },
  { title: "📌 טלפונים חשובים", body: "רופא משפחה: 03-1234567\nרופא שיניים: 03-7654321\nבית הספר: 03-9876543", pinned: true },
  { title: "מתכון — פשטידת ירקות", body: "4 ביצים, 1 קישוא, 1 גזר, גבינה צהובה, פירורי לחם\nלערבב, 200°C, 35 דקות", pinned: false },
  { title: "רשימת מתנות ליום הולדת", body: "לגו, ספר, משחק קופסה, כדור כדורגל", pinned: false },
  { title: "📌 תזכורת: חידוש ביטוח", body: "לחדש ביטוח רכב עד סוף החודש\nלבדוק הצעות אחרות", pinned: true },
  { title: "רעיונות לגינה", body: "לשתול עגבניות, בזיליקום ומנטה. לקנות אדניות חדשות", pinned: false },
];

const PROJECT_POOL: { title: string; description: string; status: "idea" | "in_progress" | "done"; progress: number }[] = [
  { title: "שיפוץ מטבח", description: "החלפת ארונות ומשטחי עבודה", status: "in_progress", progress: 35 },
  { title: "גינה חדשה", description: "עיצוב ושתילת גינת ירק ותבלינים", status: "idea", progress: 0 },
  { title: "חדר משחקים לילדים", description: "הפיכת חדר אורחים לחדר משחקים", status: "in_progress", progress: 60 },
  { title: "ארגון מחסן", description: "מיון, סידור ומכירת דברים מיותרים", status: "idea", progress: 10 },
  { title: "אלבום משפחתי", description: "דיגיטציה של תמונות ישנות ויצירת אלבום", status: "in_progress", progress: 20 },
  { title: "חופשת קיץ", description: "בחירת יעד, הזמנת טיסות ומלון", status: "idea", progress: 5 },
  { title: "החלפת מחשב המשפחה", description: "מחקר ורכישת מחשב נייד חדש", status: "done", progress: 100 },
  { title: "קורס אנגלית לילדים", description: "לרשום את הילדים לקורס אנגלית קיץ", status: "idea", progress: 0 },
];

const LOCATIONS = [
  "קופת חולים", "בית הספר", "מרכז קהילתי", "פארק הירקון",
  "מוזיאון ילדים", "בריכת שחייה", "אולם ספורט", "סטודיו יוגה",
  "בית סבא וסבתא", "שוק הכרמל", "גן חיות",
];

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

type MemberInfo = { id: string; displayName: string };
type KidInfo = { id: string; name: string; color: string };

async function seedMembers(familyId: string): Promise<MemberInfo[]> {
  const rows = await db
    .insert(familyMembers)
    .values([
      { familyId, displayName: "אמא", role: "parent", color: "#FF6B6B", avatarEmoji: "👩", isActive: true },
      { familyId, displayName: "אבא", role: "parent", color: "#6C63FF", avatarEmoji: "👨", isActive: true },
    ])
    .returning();
  console.log(`  👩👨  Created ${rows.length} family members`);
  return rows.map((r) => ({ id: r.id, displayName: r.displayName }));
}

async function fetchExistingMembers(familyId: string): Promise<MemberInfo[]> {
  const rows = await db
    .select({ id: familyMembers.id, displayName: familyMembers.displayName })
    .from(familyMembers)
    .where(eq(familyMembers.familyId, familyId));
  console.log(`  👩👨  Using ${rows.length} existing family members`);
  if (rows.length === 0) {
    console.error("❌  No family members found. Remove --skip-members or add members first.");
    process.exit(1);
  }
  return rows;
}

async function seedKids(familyId: string, count: number): Promise<KidInfo[]> {
  const names = pick(KID_NAMES, count);
  const values = names.map((name, i) => ({
    familyId,
    name,
    color: COLORS[i % COLORS.length],
    emoji: KID_EMOJIS[i % KID_EMOJIS.length],
    isActive: true,
  }));
  const rows = await db.insert(kids).values(values).returning();
  console.log(`  🧒  Created ${rows.length} kids: ${rows.map((r) => r.name).join(", ")}`);
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color ?? COLORS[0] }));
}

async function fetchExistingKids(familyId: string): Promise<KidInfo[]> {
  const rows = await db
    .select({ id: kids.id, name: kids.name, color: kids.color })
    .from(kids)
    .where(eq(kids.familyId, familyId));
  console.log(`  🧒  Using ${rows.length} existing kids: ${rows.map((r) => r.name).join(", ")}`);
  if (rows.length === 0) {
    console.error("❌  No kids found. Remove --skip-kids or add kids first.");
    process.exit(1);
  }
  return rows;
}

async function seedScheduleBlocks(familyId: string, kidList: KidInfo[], perKid: number) {
  const values: (typeof scheduleBlocks.$inferInsert)[] = [];

  for (const kid of kidList) {
    // School: Sun-Thu (days 0-4)
    const schoolTitle = choice(SCHEDULE_SCHOOLS);
    const schoolStart = choice([450, 465, 480]); // 7:30, 7:45, 8:00
    const schoolEnd = choice([780, 795, 810, 840]); // 13:00-14:00
    for (let day = 0; day < 5; day++) {
      values.push({
        familyId,
        kidId: kid.id,
        daysOfWeek: [day],
        title: schoolTitle,
        startMinutes: schoolStart,
        endMinutes: schoolEnd,
        isRecurring: true,
      });
    }

    // Activities
    const activities = pick(SCHEDULE_ACTIVITIES, Math.max(perKid - 1, 1));
    for (let i = 0; i < activities.length; i++) {
      const day = i % 5; // Spread across weekdays
      const start = choice([900, 960, 990, 1020, 1050]); // 15:00-17:30
      values.push({
        familyId,
        kidId: kid.id,
        daysOfWeek: [day],
        title: activities[i],
        startMinutes: start,
        endMinutes: start + choice([60, 90]),
        location: choice(LOCATIONS),
        color: kid.color,
        isRecurring: true,
      });
    }
  }

  await db.insert(scheduleBlocks).values(values);
  console.log(`  📅  Inserted ${values.length} schedule blocks`);
}

async function seedFamilyEvents(
  familyId: string,
  memberList: MemberInfo[],
  kidList: KidInfo[],
  numFamily: number,
  numPerKid: number,
) {
  const values: (typeof familyEvents.$inferInsert)[] = [];

  // Recurring family events
  const familyTitles = pick(FAMILY_EVENT_TITLES, numFamily);
  for (let i = 0; i < familyTitles.length; i++) {
    const { start, end } = randomTimeRange();
    values.push({
      familyId,
      title: familyTitles[i],
      assigneeType: "family",
      daysOfWeek: [i % 7],
      startMinutes: start,
      endMinutes: end,
      location: Math.random() > 0.3 ? choice(LOCATIONS) : undefined,
      color: choice(COLORS),
      isRecurring: true,
    });
  }

  // One-time kid events spread over next 3 weeks
  for (const kid of kidList) {
    const titles = pick(KID_EVENT_TITLES, numPerKid);
    for (let i = 0; i < titles.length; i++) {
      const daysAhead = 1 + Math.floor(Math.random() * 21); // 1-21 days from now
      const date = dateOffset(daysAhead);
      const dayOfWeek = new Date(date).getDay();
      const { start, end } = randomTimeRange(540, 1080, 30, 120);
      values.push({
        familyId,
        title: `${titles[i]} — ${kid.name}`,
        assigneeType: "kid",
        assigneeId: kid.id,
        daysOfWeek: [dayOfWeek],
        startMinutes: start,
        endMinutes: end,
        location: Math.random() > 0.4 ? choice(LOCATIONS) : undefined,
        color: kid.color,
        isRecurring: false,
        date,
      });
    }
  }

  // A few member events
  for (const member of memberList) {
    const daysAhead = 1 + Math.floor(Math.random() * 14);
    const date = dateOffset(daysAhead);
    const dayOfWeek = new Date(date).getDay();
    const { start, end } = randomTimeRange(360, 1080, 60, 120);
    values.push({
      familyId,
      title: `אירוע — ${member.displayName}`,
      assigneeType: "member",
      assigneeId: member.id,
      daysOfWeek: [dayOfWeek],
      startMinutes: start,
      endMinutes: end,
      color: choice(COLORS),
      isRecurring: false,
      date,
    });
  }

  await db.insert(familyEvents).values(values);
  console.log(`  📆  Inserted ${values.length} family events (${familyTitles.length} recurring, ${values.length - familyTitles.length} one-time)`);
}

async function seedChores(familyId: string, memberList: MemberInfo[], count: number) {
  const titles = pick(CHORE_TITLES, count);
  const values = titles.map((title) => {
    const member = Math.random() > 0.2 ? choice(memberList) : null;
    const done = Math.random() < 0.25;
    return {
      familyId,
      title,
      assignedTo: member?.displayName ?? undefined,
      assignedToMemberId: member?.id ?? undefined,
      done,
      selectedForToday: !done && Math.random() < 0.4,
    };
  });
  await db.insert(chores).values(values);
  console.log(`  ✅  Inserted ${values.length} chores`);
}

async function seedGrocery(familyId: string, count: number) {
  const items = pick(GROCERY_POOL, count);
  const values = items.map((item) => ({
    familyId,
    title: item.title,
    qty: item.qty,
    shoppingCategory: item.category,
    subcategory: item.subcategory,
    isBought: Math.random() < 0.25,
  }));
  await db.insert(groceryItems).values(values);
  console.log(`  🛒  Inserted ${values.length} grocery items`);
}

async function seedNotes(familyId: string, count: number) {
  const items = pick(NOTE_POOL, count);
  const values = items.map((n) => ({
    familyId,
    title: n.title,
    body: n.body,
    pinned: n.pinned,
  }));
  await db.insert(notes).values(values);
  console.log(`  📝  Inserted ${values.length} notes`);
}

async function seedProjects(familyId: string, count: number) {
  const items = pick(PROJECT_POOL, count);
  const values = items.map((p) => ({
    familyId,
    title: p.title,
    description: p.description,
    status: p.status,
    progress: p.progress,
  }));
  await db.insert(projects).values(values);
  console.log(`  📁  Inserted ${values.length} projects`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const cfg = parseArgs();

  const should = (type: string) => cfg.only === null || cfg.only.has(type);

  console.log(`\n🎭  Seeding mock data for family ${cfg.familyId}…`);
  if (cfg.only) console.log(`    (--only: ${[...cfg.only].join(", ")})`);
  if (cfg.skipMembers) console.log(`    (skipping member creation — using existing)`);
  if (cfg.skipKids) console.log(`    (skipping kid creation — using existing)`);
  console.log();

  // Members — needed if events/chores/schedule are requested
  const needMembers = should("members") || should("events") || should("chores");
  const memberList = needMembers
    ? cfg.skipMembers
      ? await fetchExistingMembers(cfg.familyId)
      : await seedMembers(cfg.familyId)
    : [];

  // Kids — needed if events/schedule are requested
  const needKids = should("kids") || should("events") || should("schedule");
  const kidList = needKids
    ? cfg.skipKids
      ? await fetchExistingKids(cfg.familyId)
      : await seedKids(cfg.familyId, cfg.numKids)
    : [];

  // Data
  if (should("schedule")) await seedScheduleBlocks(cfg.familyId, kidList, cfg.numSchedulePerKid);
  if (should("events")) await seedFamilyEvents(cfg.familyId, memberList, kidList, cfg.numFamilyEvents, cfg.numKidEvents);
  if (should("chores")) await seedChores(cfg.familyId, memberList, cfg.numChores);
  if (should("grocery")) await seedGrocery(cfg.familyId, cfg.numGrocery);
  if (should("notes")) await seedNotes(cfg.familyId, cfg.numNotes);
  if (should("projects")) await seedProjects(cfg.familyId, cfg.numProjects);

  console.log(`\n✅  Done! Mock data inserted for family ${cfg.familyId}\n`);
}

main().catch((err) => {
  console.error("❌  Mock data failed:", err);
  process.exit(1);
});
