# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Family OS — a Hebrew RTL family management app (React Native / Expo) targeting iOS and web. The backend is a Hono API deployed to Google Cloud Run. The web app is bundled into the Docker image and served by the same backend process.

## Commands

### Frontend (root)
```bash
npx expo start --web --port 8083   # dev server (web)
npx expo start --ios               # iOS simulator
npx expo lint                      # ESLint
node_modules/.bin/tsc --noEmit     # type-check (no npx wrapper needed)
```

### Backend (`cd backend`)
```bash
npm run dev          # tsx watch src/server.ts  (port 3000)
npm run db:generate  # drizzle-kit generate (after schema changes)
npm run db:migrate   # run pending migrations
npm run db:seed      # seed initial data
npm run db:smoke     # smoke-test against live DB
```

### Deploy
Push to `master` → GitHub Actions builds Docker image → deploys to Cloud Run at `https://family-os-644824480156.me-west1.run.app`.

The Dockerfile builds the Expo web bundle (`expo export`) and copies it to `/public` inside the image, then serves it as static files from the same Hono server.

## Architecture

### Monorepo Structure
- `/` — Expo React Native app (iOS + web)
- `/backend` — Hono REST API + Drizzle ORM (Node.js ESM)
- `/src` — all frontend source (store, components, lib, models, i18n)
- `/app` — Expo Router file-based routes

### Frontend Data Flow
**Optimistic mutations (the standard pattern):**
1. Call a `*Remote` function from `src/lib/sync/remoteCrud.ts`
2. It immediately mutates `useFamilyStore` (Zustand, persisted to AsyncStorage)
3. Then fires the API call in the background (`fireAndForget`)
4. On error → snackbar via `setSyncErrorHandler`

**Initial load:** `app/_layout.tsx` calls `pullAll()` on login, which fetches all 9 resource types in parallel and replaces local state (server wins).

### State (`src/store/useFamilyStore.ts`)
Single Zustand store persisted as `family-os-store-v2` (version 8). Contains: `grocery`, `notes`, `chores`, `projects`, `kids`, `scheduleBlocks`, `familyMembers`, `familyEvents`. Bulk `set*` actions are used by the sync engine; individual CRUD actions are used by components via `remoteCrud`.

### Routing (`app/`)
Expo Router file-based routing:
- `(auth)/login`, `(auth)/register` — unauthenticated
- `(tabs)/` — main app with bottom tab bar (today, calendar, grocery, home, settings)
- `(tabs)/kid/[kidId]` — kid schedule screen, inside tabs so it gets the bottom navbar (uses `href: null` to hide from tab bar)

The `(tabs)` group uses a `CustomTabBar` with per-tab accent colors.

### RTL (Hebrew)
All RTL is activated once at app start in `app/_layout.tsx` via `I18nManager.forceRTL(true)`. Always import from `src/ui/rtl.ts`:

```ts
import { RTL_ROW, RTL_ALIGN_RIGHT, rtl } from "@src/ui/rtl";
```

- **`RTL_ROW`** — use instead of `flexDirection: "row-reverse"`. It's `"row"` when RTL is active (RN Web auto-mirrors it) and `"row-reverse"` when not. **Never** use `I18nManager.isRTL ? "row-reverse" : "row"` — this causes a double-flip on web.
- **`direction: "ltr"`** in StyleSheet is completely ignored by RN Web (use only for web via inline style `({ direction: "ltr" } as any)` if truly needed).
- On web, `left`/`right` CSS properties are **not** auto-mirrored by RN Web — but `flexDirection` is. `position: absolute` with `left: X` stays as physical left.
- On iOS, `left: X` **is** auto-mirrored to `right: X` by I18nManager.

### Backend (`backend/`)
Hono REST API with Drizzle ORM on Neon Postgres. Routes follow pattern `/v1/family/:familyId/<resource>`. All routes under `/v1/family/*` are protected by JWT middleware (`jwtAuth` + `familyGuard` ensures the JWT's familyId matches the URL param).

Schema is in `backend/src/db/schema.ts`. After schema changes: `npm run db:generate` → `npm run db:migrate`.

### i18n
Hebrew-only. All strings in `src/i18n/he.ts`, accessed via helpers:
```ts
import { t, dayName, statusLabel, blockTypeLabel } from "@src/i18n";
t("key.nested")             // dot-notation lookup
t("key", { count: 3 })     // {{count}} interpolation
```

### Path Aliases
`@src/*` → `./src/*`, `@/*` → `./*` (configured in `tsconfig.json`).

### Adding a New Resource
1. Add model type in `src/models/`
2. Add Drizzle table in `backend/src/db/schema.ts` + generate/migrate
3. Add backend route in `backend/src/routes/`
4. Add API types in `src/lib/api/types.ts`, mappers in `mappers.ts`, endpoints in `endpoints.ts`
5. Add store slice to `useFamilyStore.ts` (bump version + add migrate step)
6. Add `*Remote` functions to `remoteCrud.ts`
7. Add to `pullAll()` in `syncEngine.ts`
