/**
 * he.ts — Hebrew translation dictionary for Family OS.
 *
 * Keys are organized by screen/module namespace.
 * Parameters use {{paramName}} syntax.
 */

const he = {
  // ── Common ──
  cancel: "ביטול",
  add: "הוסף",
  save: "שמור",
  ok: "אישור",
  delete: "מחק",
  edit: "ערוך",

  // ── Tab labels ──
  tabs: {
    today: "היום",
    grocery: "קניות",
    home: "בית",
    settings: "הגדרות",
  },

  // ── Today screen ──
  today: {
    title: "היום",
    sync: "☁️ סנכרון",
    syncing: "מסנכרן...",
    syncError: "שגיאת סנכרון",
    lastSync: "אחרון: {{time}}",
    syncNow: "סנכרן עכשיו",
    overview: "סקירת היום",
    groceryItems: "פריטים בקניות",
    choresToDo: "מטלות לביצוע",
    activeProjects: "פרויקטים פעילים",
    pinnedNotes: "פתקים נעוצים",
    kids: "ילדים",
    noSchedule: "אין תכנון להיום",
    todayChores: "מטלות להיום",
    noChoresForToday: "אין מטלות להיום",
    never: "אף פעם",
  },

  // ── Home screen ──
  home: {
    title: "בית",
    notes: "פתקים",
    noNotes: "אין עדיין פתקים — לחצו על + כדי לרשום משהו.",
    note: "פתק",
    chores: "מטלות",
    selectedForToday: "נבחרו להיום",
    backlog: "רשימת מטלות",
    allClear: "הכל בסדר — אין מה לעשות כרגע!",
    projects: "פרויקטים",
    noProjects: "אין עדיין פרויקטים — חלמו בגדול!",
  },

  // ── Grocery screen ──
  grocery: {
    title: "קניות",
    shoppingList: "רשימת קניות",
    emptyGrocery: "אין פריטים במכולת עדיין",
    emptyHealth: "אין פריטים בפארם עדיין",
    emptyHome: "אין פריטים לבית עדיין",
    bought: "נקנו ({{count}})",
    clear: "נקה",
    quickAdd: "הוספה מהירה",
    itemCount: "{{count}} פריטים",
  },

  // ── Shopping categories ──
  shoppingCategory: {
    grocery: "מכולת",
    health: "פארם",
    home: "לבית",
  } as Record<string, string>,

  // ── Kid schedule screen ──
  kid: {
    schedule: "מערכת שעות",
    calendar: "לוח שנה",
    template: "תבנית",
    daySchedule: "מערכת ליום {{day}}",
    nothingScheduled: "אין תכנון ליום {{day}}.",
    noBlocks: "אין בלוקים",
    kidSchedule: "המערכת של {{name}}",
  },

  // ── Grocery Add Modal ──
  groceryModal: {
    title: "הוספת פריט",
    itemName: "שם הפריט",
    category: "קטגוריה",
    qty: "כמות (אופציונלי)",
  },

  // ── Note Modal ──
  noteModal: {
    addTitle: "הוספת פתק",
    editTitle: "עריכת פתק",
    titleLabel: "כותרת (אופציונלי)",
    bodyLabel: "תוכן הפתק",
  },

  // ── Chore Add Modal ──
  choreModal: {
    title: "הוספת מטלה",
    whatNeedsDoing: "מה צריך לעשות?",
    assignedTo: "מוקצה ל (אופציונלי)",
    selectMember: "משויך ל:",
    noAssignment: "ללא",
  },

  // ── Project Modal ──
  projectModal: {
    addTitle: "הוספת פרויקט",
    editTitle: "עריכת פרויקט",
    projectTitle: "שם הפרויקט",
    description: "תיאור (אופציונלי)",
    status: "סטטוס",
    progress: "התקדמות: {{n}}%",
  },

  // ── Schedule Block Modal ──
  blockModal: {
    addTitle: "הוספת בלוק",
    editTitle: "עריכת בלוק",
    titleLabel: "כותרת",
    type: "סוג",
    day: "יום",
    startTime: "התחלה",
    endTime: "סיום",
    location: "מיקום (אופציונלי)",
    titleRequired: "כותרת היא שדה חובה",
    useHHMM: "השתמשו בפורמט HH:MM",
    invalidTime: "שעה לא תקינה",
    endAfterStart: "הסיום חייב להיות אחרי ההתחלה",
  },

  // ── Project status labels ──
  status: {
    idea: "רעיון",
    in_progress: "בתהליך",
    done: "בוצע",
  },

  // ── Schedule block types ──
  blockType: {
    school: "בית ספר",
    hobby: "חוג",
    other: "אחר",
  },

  // ── Grocery categories (keys match English data model values) ──
  groceryCategory: {
    Produce: "ירקות ופירות",
    Dairy: "מוצרי חלב",
    Meat: "בשר",
    Bakery: "מאפים",
    Frozen: "קפואים",
    Snacks: "חטיפים",
    Beverages: "משקאות",
    Household: "מוצרי בית",
    Other: "אחר",
  } as Record<string, string>,

  // ── Day names (full) — keyed by day-of-week 0=Sunday ──
  days: {
    0: "יום ראשון",
    1: "יום שני",
    2: "יום שלישי",
    3: "יום רביעי",
    4: "יום חמישי",
    5: "יום שישי",
    6: "שבת",
  } as Record<number, string>,

  // ── Day names (short, for chips) ──
  daysShort: {
    0: "א׳",
    1: "ב׳",
    2: "ג׳",
    3: "ד׳",
    4: "ה׳",
    5: "ו׳",
    6: "ש׳",
  } as Record<number, string>,

  // ── Calendar day-of-week header labels (Sunday first) ──
  calendarDays: ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"] as string[],

  // ── Member roles ──
  memberRole: {
    parent: "הורה",
    caregiver: "מטפל/ת",
    other: "אחר",
  } as Record<string, string>,

  // ── Settings screen ──
  settings: {
    title: "הגדרות",
    familyMembers: "חברי משפחה",
    familyMembersSubtitle: "מי מנהל/ת את הבית ומופיע/ה בהקצאת מטלות",
    noMembers: "אין חברי משפחה — לחצו על + כדי להוסיף.",
    archived: "בארכיון",
    addMember: "הוספת חבר/ת משפחה",
    editMember: "עריכת חבר/ת משפחה",
    memberName: "שם",
    memberRole: "תפקיד",
    memberEmoji: "אימוג׳י",
    memberColor: "צבע",
    archive: "ארכיון",
    restore: "שחזור",
    nameRequired: "שם הוא שדה חובה",
    nameMinLength: "שם חייב להכיל לפחות 2 תווים",
    kids: "ילדים",
    kidsSubtitle: "הילדים שמופיעים במערכת השעות ובמסך היום",
    noKids: "אין ילדים — לחצו על + כדי להוסיף.",
    addKid: "הוספת ילד/ה",
    editKid: "עריכת ילד/ה",
    kidName: "שם",
    kidEmoji: "אימוג׳י",
    kidColor: "צבע",
  },
} as const;

export default he;
