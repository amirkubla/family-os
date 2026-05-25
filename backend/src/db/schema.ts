import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
  check,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reusable created_at / updated_at pair.
 *  updated_at is kept in sync by a DB trigger (see migrate.ts). */
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

// ---------------------------------------------------------------------------
// families
// ---------------------------------------------------------------------------

export const families = pgTable("families", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ...timestamps,
});

export const familiesRelations = relations(families, ({ many }) => ({
  members: many(familyMembers),
  kids: many(kids),
  groceryItems: many(groceryItems),
  notes: many(notes),
  chores: many(chores),
  projects: many(projects),
  scheduleBlocks: many(scheduleBlocks),
  familyEvents: many(familyEvents),
  pushTokens: many(pushTokens),
}));

// ---------------------------------------------------------------------------
// family_members
// ---------------------------------------------------------------------------

export const familyMembers = pgTable(
  "family_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    displayName: text("display_name").notNull(),
    role: text("role"),
    color: text("color"),
    avatarEmoji: text("avatar_emoji"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (t) => [index("family_members_family_id_idx").on(t.familyId)],
);

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  family: one(families, {
    fields: [familyMembers.familyId],
    references: [families.id],
  }),
}));

// ---------------------------------------------------------------------------
// kids
// ---------------------------------------------------------------------------

export const kids = pgTable(
  "kids",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    emoji: text("emoji"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (t) => [index("kids_family_id_idx").on(t.familyId)],
);

export const kidsRelations = relations(kids, ({ one, many }) => ({
  family: one(families, {
    fields: [kids.familyId],
    references: [families.id],
  }),
  scheduleBlocks: many(scheduleBlocks),
}));

// ---------------------------------------------------------------------------
// grocery_items
// ---------------------------------------------------------------------------

export const groceryItems = pgTable(
  "grocery_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    shoppingCategory: text("shopping_category").default("grocery").notNull(),
    subcategory: text("subcategory"),
    qty: text("qty"),
    isBought: boolean("is_bought").default(false).notNull(),
    ...timestamps,
  },
  (t) => [
    index("grocery_items_family_id_idx").on(t.familyId),
    index("grocery_items_family_bought_idx").on(t.familyId, t.isBought),
    index("grocery_items_family_shop_cat_idx").on(t.familyId, t.shoppingCategory),
  ],
);

export const groceryItemsRelations = relations(groceryItems, ({ one }) => ({
  family: one(families, {
    fields: [groceryItems.familyId],
    references: [families.id],
  }),
}));

// ---------------------------------------------------------------------------
// notes
// ---------------------------------------------------------------------------

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    title: text("title"),
    body: text("body").notNull(),
    pinned: boolean("pinned").default(false).notNull(),
    ...timestamps,
  },
  (t) => [
    index("notes_family_id_idx").on(t.familyId),
    index("notes_family_pinned_idx").on(t.familyId, t.pinned),
  ],
);

export const notesRelations = relations(notes, ({ one }) => ({
  family: one(families, {
    fields: [notes.familyId],
    references: [families.id],
  }),
}));

// ---------------------------------------------------------------------------
// chores
// ---------------------------------------------------------------------------

export const chores = pgTable(
  "chores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    assignedTo: text("assigned_to"),
    assignedToMemberId: uuid("assigned_to_member_id"),
    done: boolean("done").default(false).notNull(),
    selectedForToday: boolean("selected_for_today").default(false).notNull(),
    ...timestamps,
  },
  (t) => [
    index("chores_family_id_idx").on(t.familyId),
    index("chores_family_done_idx").on(t.familyId, t.done),
    index("chores_family_selected_idx").on(t.familyId, t.selectedForToday),
  ],
);

export const choresRelations = relations(chores, ({ one }) => ({
  family: one(families, {
    fields: [chores.familyId],
    references: [families.id],
  }),
}));

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: ["idea", "in_progress", "done"] })
      .default("idea")
      .notNull(),
    progress: integer("progress").default(0).notNull(),
    ...timestamps,
  },
  (t) => [
    index("projects_family_id_idx").on(t.familyId),
    index("projects_family_status_idx").on(t.familyId, t.status),
    check("projects_progress_range", sql`${t.progress} >= 0 AND ${t.progress} <= 100`),
  ],
);

export const projectsRelations = relations(projects, ({ one }) => ({
  family: one(families, {
    fields: [projects.familyId],
    references: [families.id],
  }),
}));

// ---------------------------------------------------------------------------
// schedule_blocks
// ---------------------------------------------------------------------------

export const scheduleBlocks = pgTable(
  "schedule_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    kidId: uuid("kid_id")
      .notNull()
      .references(() => kids.id, { onDelete: "cascade" }),
    daysOfWeek: jsonb("days_of_week").$type<number[]>().notNull(), // [0,2,4] = Sun,Tue,Thu
    title: text("title").notNull(),
    type: text("type", { enum: ["school", "hobby", "other"] })
      .default("other")
      .notNull(),
    startMinutes: integer("start_minutes").notNull(), // 0–1439
    endMinutes: integer("end_minutes").notNull(),
    location: text("location"),
    color: text("color"),
    date: text("date"), // "YYYY-MM-DD" for one-time events, null for recurring
    isRecurring: boolean("is_recurring").default(true).notNull(),
    reminders: text("reminders"), // JSON array of integers e.g. "[1440,60,5]"
    ...timestamps,
  },
  (t) => [
    index("schedule_blocks_family_id_idx").on(t.familyId),
    index("schedule_blocks_kid_id_idx").on(t.kidId),
    check(
      "schedule_blocks_time_range",
      sql`${t.startMinutes} >= 0 AND ${t.startMinutes} < 1440 AND ${t.endMinutes} > 0 AND ${t.endMinutes} <= 1440`,
    ),
    check(
      "schedule_blocks_end_after_start",
      sql`${t.endMinutes} > ${t.startMinutes}`,
    ),
  ],
);

export const scheduleBlocksRelations = relations(
  scheduleBlocks,
  ({ one }) => ({
    family: one(families, {
      fields: [scheduleBlocks.familyId],
      references: [families.id],
    }),
    kid: one(kids, {
      fields: [scheduleBlocks.kidId],
      references: [kids.id],
    }),
  }),
);

// ---------------------------------------------------------------------------
// family_events
// ---------------------------------------------------------------------------

export const familyEvents = pgTable(
  "family_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    assigneeType: text("assignee_type", { enum: ["member", "kid", "family"] })
      .default("family")
      .notNull(),
    assigneeId: uuid("assignee_id"),
    daysOfWeek: jsonb("days_of_week").$type<number[]>().notNull(), // [0,2,4] = Sun,Tue,Thu
    startMinutes: integer("start_minutes").notNull(), // 0–1439
    endMinutes: integer("end_minutes").notNull(),
    location: text("location"),
    color: text("color"),
    isRecurring: boolean("is_recurring").default(true).notNull(),
    date: text("date"), // "YYYY-MM-DD" for one-time events
    reminders: text("reminders"), // JSON array of integers e.g. "[1440,60,5]"
    ...timestamps,
  },
  (t) => [
    index("family_events_family_id_idx").on(t.familyId),
    check(
      "family_events_time_range",
      sql`${t.startMinutes} >= 0 AND ${t.startMinutes} < 1440 AND ${t.endMinutes} > 0 AND ${t.endMinutes} <= 1440`,
    ),
    check(
      "family_events_end_after_start",
      sql`${t.endMinutes} > ${t.startMinutes}`,
    ),
  ],
);

export const familyEventsRelations = relations(familyEvents, ({ one }) => ({
  family: one(families, {
    fields: [familyEvents.familyId],
    references: [families.id],
  }),
}));

// ---------------------------------------------------------------------------
// push_tokens
// ---------------------------------------------------------------------------

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    ...timestamps,
  },
  (t) => [
    index("push_tokens_family_id_idx").on(t.familyId),
    // A device's Expo push token uniquely identifies the device, not the
    // (family, device) pair. The unique constraint is therefore on `token`
    // alone — if a user switches families on the same device, the existing
    // row's family_id is updated rather than a duplicate row being inserted.
    // QA Pass 2 BUG-N3 found 4 tokens registered to 2–4 families each in prod.
    uniqueIndex("push_tokens_token_uniq").on(t.token),
  ],
);

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  family: one(families, {
    fields: [pushTokens.familyId],
    references: [families.id],
  }),
}));

// ---------------------------------------------------------------------------
// invites
// ---------------------------------------------------------------------------

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    usedByUserId: uuid("used_by_user_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("invites_code_uniq").on(t.code),
    index("invites_family_id_idx").on(t.familyId),
  ],
);

export const invitesRelations = relations(invites, ({ one }) => ({
  family: one(families, {
    fields: [invites.familyId],
    references: [families.id],
  }),
}));

// ---------------------------------------------------------------------------
// users (authentication)
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_username_uniq").on(t.username),
    index("users_family_id_idx").on(t.familyId),
  ],
);

export const usersRelations = relations(users, ({ one }) => ({
  family: one(families, {
    fields: [users.familyId],
    references: [families.id],
  }),
}));

// ---------------------------------------------------------------------------
// sent_notifications (dedup tracking for push reminders)
// ---------------------------------------------------------------------------

export const sentNotifications = pgTable(
  "sent_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyEventId: uuid("family_event_id")
      .notNull()
      .references(() => familyEvents.id, { onDelete: "cascade" }),
    reminderMinutes: integer("reminder_minutes").notNull(),
    eventDate: text("event_date").notNull(), // "YYYY-MM-DD" of the occurrence
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("sent_notifications_event_idx").on(t.familyEventId),
    uniqueIndex("sent_notifications_dedup_uniq").on(
      t.familyEventId,
      t.reminderMinutes,
      t.eventDate,
    ),
  ],
);
