# Family OS — Backend / DB Layer

Typed Postgres schema, migrations, and CRUD repositories powered by **Drizzle ORM** and **Neon Postgres**.

## Quick Start

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure your Neon connection
cp .env.example .env
#    → paste your DATABASE_URL from https://console.neon.tech

# 3. Generate + apply migrations
npm run db:migrate

# 4. Seed a family + 2 kids
npm run db:seed

# 5. Verify everything works
npm run db:smoke
```

## Project Structure

```
backend/
├── drizzle.config.ts          Drizzle Kit config (points at schema + migrations)
├── package.json               Scripts: db:generate, db:migrate, db:seed, db:smoke
├── tsconfig.json
├── .env.example               DATABASE_URL template
└── src/
    ├── db/
    │   ├── client.ts           Drizzle + Neon HTTP client
    │   ├── schema.ts           All tables, indexes, relations, constraints
    │   └── migrations/         Auto-generated SQL migration files
    ├── repos/
    │   ├── groceryRepo.ts      CRUD: create / getById / listByFamily / update / delete
    │   ├── notesRepo.ts
    │   ├── choresRepo.ts
    │   ├── projectsRepo.ts
    │   ├── kidsRepo.ts
    │   └── index.ts            Barrel export
    ├── scripts/
    │   ├── migrate.ts          Apply migrations + install updated_at triggers
    │   ├── seed.ts             Insert one family + 2 kids
    │   └── smokeTest.ts        Full CRUD round-trip on every table
    └── types/
        └── models.ts           Select / Insert / Update types inferred from schema
```

## Available Scripts

| Script            | Command                  | Description                                  |
| ----------------- | ------------------------ | -------------------------------------------- |
| `db:generate`     | `drizzle-kit generate`   | Generate a new SQL migration from schema changes |
| `db:migrate`      | `tsx src/scripts/migrate.ts` | Apply pending migrations + install triggers |
| `db:seed`         | `tsx src/scripts/seed.ts`    | Seed one family + 2 kids                   |
| `db:smoke`        | `tsx src/scripts/smokeTest.ts` | CRUD round-trip on all tables            |

## Schema Overview

All tables use **UUID primary keys** and include `created_at` / `updated_at` timestamps.
`updated_at` is kept in sync by a Postgres trigger (`set_updated_at()`).

| Table            | Key columns                                                 |
| ---------------- | ----------------------------------------------------------- |
| `families`       | `name`                                                      |
| `family_members` | `family_id` FK, `display_name`, `role`                      |
| `kids`           | `family_id` FK, `name`, `color`                             |
| `grocery_items`  | `family_id` FK, `title`, `category`, `qty`, `is_bought`     |
| `notes`          | `family_id` FK, `title`, `body`, `pinned`                   |
| `chores`         | `family_id` FK, `title`, `assigned_to`, `done`              |
| `projects`       | `family_id` FK, `title`, `description`, `status`, `progress`|

## Adding a New Table (Alembic-like Workflow)

1. **Edit the schema** — add your new table in `src/db/schema.ts`:

   ```ts
   export const events = pgTable("events", {
     id: uuid("id").defaultRandom().primaryKey(),
     familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
     title: text("title").notNull(),
     startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
     ...timestamps,
   }, (t) => [
     index("events_family_id_idx").on(t.familyId),
   ]);
   ```

2. **Generate migration** — Drizzle diffs your schema against the last migration:

   ```bash
   npm run db:generate
   # → creates src/db/migrations/0001_xxx.sql
   ```

3. **Review the SQL** — open the generated file and verify.

4. **Apply migration**:

   ```bash
   npm run db:migrate
   ```

5. **Add types** — export the new types in `src/types/models.ts`.

6. **Add repo** — create `src/repos/eventsRepo.ts` following the existing pattern.

This is the same generate → review → apply workflow as Alembic, but with TypeScript instead of Python.
