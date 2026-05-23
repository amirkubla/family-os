# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Family OS — a Hebrew RTL family management app (React Native / Expo) targeting iOS, Android, and web. Two parents share a single family: grocery lists, chores, kids' schedules, notes, projects, calendar events. The backend is a Hono API deployed to Google Cloud Run. The web app is bundled into the Docker image and served by the same backend process.

**Language:** Hebrew-only, full RTL. No English UI strings.

**Project status:** Solo developer (the maintainer), no real end users yet. Test data only. This means: breaking changes, JWT rotations, DB resets, and feature pivots are cheap. Don't over-engineer for backwards compatibility or zero-downtime migrations until there are real users.

## Commands

### Frontend (root)
```bash
npx expo start --web --port 8083   # dev server (web)
npx expo start --ios               # iOS simulator
npx expo start --android           # Android emulator
npx expo lint                      # ESLint
node_modules/.bin/tsc --noEmit     # type-check (no npx wrapper needed)
```

### Android Emulator
The Android SDK is at `~/Library/Android/sdk`. `ANDROID_HOME` is **not** exported in `.zshrc`/`.zprofile`, so all SDK tools need full paths.

**Quick-start (two terminals):**
```bash
# Terminal 1 — boot emulator (takes ~30s, keep running)
export ANDROID_HOME=~/Library/Android/sdk
~/Library/Android/sdk/emulator/emulator -avd Pixel_7 -no-snapshot-load &

# Terminal 2 — once emulator shows lock screen, start Expo
export ANDROID_HOME=~/Library/Android/sdk
npx expo start --android
```

**Verify emulator is connected:**
```bash
~/Library/Android/sdk/platform-tools/adb devices
# Should show:  emulator-5554   device
```

**Port conflict troubleshooting:**
Metro bundler defaults to port 8081. If it crashes or the emulator can't connect:
```bash
# Kill stale Metro processes
lsof -i :8081 | grep LISTEN          # find PID
kill <PID>

# Kill stale emulator (if it won't respond)
~/Library/Android/sdk/platform-tools/adb kill-server
kill $(pgrep -f qemu-system)         # force-kill emulator process

# Restart ADB
~/Library/Android/sdk/platform-tools/adb start-server

# Then relaunch emulator + expo
```

**Key details:**
- AVD: `Pixel_7` (Android 15, arm64). List AVDs: `~/Library/Android/sdk/emulator/emulator -list-avds`
- Emulator uses ports 5554/5555 (ADB console/connection)
- Metro bundler uses port 8081 (Expo default for native)
- Web dev server uses port 8083 (separate, no conflict)
- Use `-no-snapshot-load` to avoid stale snapshot issues

### Android Build (EAS)
Production builds run on Expo's cloud (~15-20 min). Profiles defined in `eas.json`:
```bash
eas login                                           # first time only
eas build --profile preview --platform android      # internal APK (sideload to your phone)
eas build --profile production --platform android   # AAB for Google Play Store
```

**Gotcha — native builds need explicit URLs.** `.env.production` has `EXPO_PUBLIC_API_URL=""` (relies on same-origin, which only works on web). For native builds, `eas.json` overrides this with the explicit Cloud Run URL via the `env` block per profile. When adding new `EXPO_PUBLIC_*` vars, update both `.env.production` (web) AND the `env` blocks in `eas.json` (native).

### Backend (`cd backend`)
```bash
npm run dev          # tsx watch src/server.ts  (port 3000)
npm run db:generate  # drizzle-kit generate (after schema changes)
npm run db:migrate   # run pending migrations
npm run db:seed      # seed initial data
npm run db:smoke     # smoke-test against live DB
```

### Environment Configuration
Frontend env vars use the `EXPO_PUBLIC_*` prefix (baked into the bundle at build time). Expo auto-loads `.env.<NODE_ENV>` from the working directory:
- `expo start` → `NODE_ENV=development` → loads `.env.development`
- `expo export` (inside Dockerfile) → `NODE_ENV=production` → loads `.env.production`

| Var | `.env.development` | `.env.production` | Purpose |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000` | `""` (empty → relative) | Backend API base URL |
| `EXPO_PUBLIC_APP_URL` | prod Cloud Run URL | `""` (empty → `window.location.origin`) | Base URL for shareable deep links (invite URLs) |

**Same-origin pattern (prod):** Both vars are empty in `.env.production`. API calls become relative (`/v1/...`) and resolve to the Cloud Run service serving the bundle. Share links fall back to `window.location.origin` in JS. This means the same Docker image works on any Cloud Run service (prod, staging, future) — no rebuild needed per env.

**Adding staging:** Just deploy the same image to another Cloud Run service. No env config to change. (If you ever need *different* build-time values per env — e.g., a separate analytics key — introduce `.env.staging` and use a Docker build arg + `app.config.ts` to pick which one gets copied in.)

**Files:**
- `.env.example` — committed reference (documents the vars)
- `.env.development` — gitignored, local dev defaults (you create from `.env.example`)
- `.env.production` — **committed**, used by `expo export` inside the Docker build
  - Safe to commit because `EXPO_PUBLIC_*` vars are baked into the JS bundle and inspectable in DevTools — same pattern as Next.js `NEXT_PUBLIC_*`
  - Backend secrets (DB URL, JWT secret) live in Cloud Run env vars, not here
- `.dockerignore` only excludes bare `.env` (not `.env.*`), so `.env.production` is copied into the build context

### Test Login
Web dev credentials: username `כהן`, password `123456`.

### Deploy
Push to `master` → GitHub Actions builds Docker image → deploys to Cloud Run at `https://family-os-4ilvxexrha-zf.a.run.app`.

The Dockerfile builds the Expo web bundle (`expo export`) and copies it to `/public` inside the image, then serves it as static files from the same Hono server.

**Google Cloud account:** This project runs under the **personal** `amirkubla@gmail.com` account, not the work `amirk@ai21.com` account. Before running any `gcloud` command targeting this project, switch configs:
```bash
~/google-cloud-sdk/bin/gcloud config configurations activate personal
```
Available configs: `default` (work, algo-agents-ai21), `work` (algo-platform-ai21), **`personal`** (family-os-489209) ← the right one.

The deployed service is at project `family-os-489209`, region `me-west1`. Cloud Scheduler job (`check-event-reminders`) is at region `europe-west1` (me-west1 doesn't have Scheduler).

## Architecture

### Monorepo Structure
- `/` — Expo React Native app (iOS + Android + web)
- `/backend` — Hono REST API + Drizzle ORM (Node.js ESM)
- `/src` — all frontend source (store, components, lib, models, i18n)
- `/app` — Expo Router file-based routes

### Key Frontend Files
| File | Purpose |
|------|---------|
| `src/store/useFamilyStore.ts` | Single Zustand store — all family data |
| `src/lib/sync/remoteCrud.ts` | Optimistic mutation helpers (`*Remote` functions) |
| `src/lib/sync/syncEngine.ts` | `pullAll()` / `pushAll()` — server sync |
| `src/lib/api/endpoints.ts` | API client per resource |
| `src/lib/api/mappers.ts` | API ↔ local model converters |
| `src/lib/api/types.ts` | API request/response types |
| `src/auth/useAuthStore.ts` | Auth state (Zustand, non-persisted) |
| `src/auth/ApiAuthService.ts` | JWT token management via SecureStore |
| `src/ui/tokens.ts` | Design tokens — colors (`C`), spacing (`S`), radii (`R`), shadows (`SHADOW`) |
| `src/ui/rtl.ts` | RTL helpers — `RTL_ROW`, `TEXT_RIGHT`, `TEXT_LEFT` |
| `src/i18n/he.ts` | All Hebrew strings |
| `src/components/ModalWrapper.tsx` | Shared modal overlay (used by all *Modal components) |
| `src/components/CustomTabBar.tsx` | Bottom tab bar with per-tab accent colors |

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

### Auth & Multi-User
- JWT-based auth stored in SecureStore (native) / AsyncStorage (web).
- `useAuthStore` manages session lifecycle: `bootstrap → login/register → logout`.
- On bootstrap, token is validated against `GET /v1/auth/me`; on 401/403 → auto-logout. Network errors are tolerated (offline mode).
- **Invite flow:** First user creates family → generates 6-char invite code in Settings (valid 7 days, single-use) → second user enters code on Register screen → selects which family member they are (e.g., "אמא") → backend links their new user account to that member.
- Invite validation endpoint is public: `GET /v1/auth/invite/:code`.
- `POST /v1/auth/register` handles both new-family and join-family flows.

### RTL (Hebrew)
All RTL is activated once at app start in `app/_layout.tsx` via `I18nManager.forceRTL(true)`. Always import from `src/ui/rtl.ts`:

```ts
import { RTL_ROW, RTL_ALIGN_RIGHT, rtl, TEXT_RIGHT, TEXT_LEFT } from "@src/ui/rtl";
```

- **`RTL_ROW`** — use instead of `flexDirection: "row-reverse"`. It's `"row"` when RTL is active (RN Web auto-mirrors it) and `"row-reverse"` when not. **Never** use `I18nManager.isRTL ? "row-reverse" : "row"` — this causes a double-flip on web.
- **`TEXT_RIGHT`** — `"right"` on web, `undefined` on native (RTL engine handles it).
- **`TEXT_LEFT`** — for LTR content like numbers. `"left"` on web, `"right"` on native RTL (to counteract mirroring).
- **`direction: "ltr"`** in StyleSheet is completely ignored by RN Web (use only for web via inline style `({ direction: "ltr" } as any)` if truly needed).
- On web, `left`/`right` CSS properties are **not** auto-mirrored by RN Web — but `flexDirection` is. `position: absolute` with `left: X` stays as physical left.
- On iOS, `left: X` **is** auto-mirrored to `right: X` by I18nManager.

### Backend (`backend/`)
Hono REST API with Drizzle ORM on Neon Postgres. Routes follow pattern `/v1/family/:familyId/<resource>`. All routes under `/v1/family/*` are protected by JWT middleware (`jwtAuth` + `familyGuard` ensures the JWT's familyId matches the URL param).

**Route files:** `auth`, `chores`, `family`, `familyEvents`, `familyMembers`, `grocery`, `invites`, `kids`, `notes`, `notifications`, `projects`, `pushTokens`, `scheduleBlocks`.

Schema is in `backend/src/db/schema.ts`. After schema changes: `npm run db:generate` → `npm run db:migrate`.

### Design Tokens (`src/ui/tokens.ts`)
Always use tokens — never hardcode colors or spacing.

- **Colors (`C`):** `bg` (light gray), `surface` (white), `textPrimary`, `textSecondary`, `purple` (primary accent), `teal`, `red`, `amber`.
- **Spacing (`S`):** 4-point grid — `xs:4`, `sm:8`, `md:12`, `lg:16`, `xl:24`, `xxl:32`.
- **Radii (`R`):** `sm:8`, `md:12`, `lg:16`, `xl:20`.
- **Shadows (`SHADOW`):** `sm`, `md`, `lg` — cross-platform (iOS shadow + Android elevation).

### UI Components
All modals use `ModalWrapper.tsx`. Each resource has its own `*Modal.tsx` for add/edit. Shared components:
- `SectionHeader` — section title with optional action button
- `FamilyBadge` — family name pill shown on every tab
- `PinnedNotesCarousel` — horizontal scroll of pinned notes on Today screen
- `ActiveProjectsCarousel` — horizontal scroll of active projects
- `DatePicker` / `WheelTimePicker` — custom date/time pickers
- `ConfirmDeleteModal` — reusable confirmation dialog

### i18n
Hebrew-only. All strings in `src/i18n/he.ts`, accessed via helpers:
```ts
import { t, dayName, statusLabel, blockTypeLabel } from "@src/i18n";
t("key.nested")             // dot-notation lookup
t("key", { count: 3 })     // {{count}} interpolation
```

### Path Aliases
`@src/*` → `./src/*`, `@/*` → `./*` (configured in `tsconfig.json`).

## Key Patterns

### Adding a New Resource
1. Add model type in `src/models/`
2. Add Drizzle table in `backend/src/db/schema.ts` + generate/migrate
3. Add backend route in `backend/src/routes/`
4. Add API types in `src/lib/api/types.ts`, mappers in `mappers.ts`, endpoints in `endpoints.ts`
5. Add store slice to `useFamilyStore.ts` (bump version + add migrate step)
6. Add `*Remote` functions to `remoteCrud.ts`
7. Add to `pullAll()` in `syncEngine.ts`

### Cross-Platform Gotchas
- **Android elevation shadows** don't match iOS `shadowX` props — test both. Avoid `elevation` on transparent/overlapping views.
- **Keyboard avoiding:** iOS uses `behavior="padding"`, Android uses `behavior="height"` or `undefined`.
- **Web `position: "fixed"`** needs casting: `Platform.OS === "web" && ({ position: "fixed" } as any)`.
- **ScrollView vs FlatList:** FlatList has issues in some modal/nested contexts — prefer ScrollView for short, bounded lists.

### Testing Changes
Before considering any change done:
1. `node_modules/.bin/tsc --noEmit` — type check
2. `npx expo lint` — lint
3. Visually verify on web (`npx expo start --web`)
4. If touching layout/RTL: verify on Android emulator too (RTL behavior differs)

### Session Logging
Use the `/session-log` skill to append progress entries to the Session Log section below. Invoke it roughly every 10 significant tool uses (edits, writes, investigations) or when a meaningful milestone is reached. This preserves context across sessions so the next agent can pick up where you left off.

## Security Standards

These rules exist because we leaked the Neon DB password, JWT_SECRET, and SCHEDULER_SECRET into the public GitHub repo on 2026-04-08 via `.claude/settings.local.json` and didn't catch it until 2026-05-23 (~6 weeks of public exposure). All three were rotated, but the lesson stands: **the cost of a leak is rotation downtime + reputational risk; the cost of preventing one is a 10-second habit change.** Treat every command as a potential leak vector.

### Secret handling

- **Never put secrets inline in shell commands.** Anything you type as a literal in a command can end up in: shell history, `.claude/settings.local.json` permission allowlist, Docker build logs, CI logs, screen recordings. Use shell variables and `unset` after:
  ```bash
  # WRONG — secret literal ends up in 5+ places
  gcloud run services update family-os --update-env-vars 'DATABASE_URL=postgresql://...:npg_realsecret@...'

  # RIGHT — secret is in one shell var, gone after unset
  read -s NEW_DB_URL    # paste at prompt, no echo
  gcloud run services update family-os --update-env-vars "DATABASE_URL=$NEW_DB_URL"
  unset NEW_DB_URL
  history -d $(history 1)
  ```
- **Never paste secrets into chat with Claude.** Conversation transcripts are stored; treat them as semi-public. If you do paste one, rotate it after the task is done.
- **Backend secrets live in Cloud Run env vars** (`gcloud run services update --update-env-vars`), never in the repo. The list right now: `DATABASE_URL`, `JWT_SECRET`, `SCHEDULER_SECRET`. Inspect with `gcloud run services describe family-os --format="value(spec.template.spec.containers[0].env)"`.
- **Frontend `EXPO_PUBLIC_*` are NOT secret** — they're baked into the JS bundle and inspectable in DevTools. Anything truly sensitive must NEVER use this prefix.

### Files that must never be committed

- `.claude/settings.local.json` — Claude Code records every approved Bash command verbatim into a permission allowlist. If a command has an inline secret, the secret is now in this file. Gitignored as of 2026-05-23.
- `.env`, `.env.local`, `.env.development`, `.env.staging` — gitignored. Only `.env.example` and `.env.production` (which contains empty values; relies on same-origin) are committed.
- `backend/.env` — gitignored. Holds the local copy of `DATABASE_URL`. Update locally after every rotation.
- Anything matching `*.pem`, `*-key.json`, `*-credentials.json`, `*.p12`.

### Pre-commit hygiene

Before every `git commit`, run:
```bash
git diff --cached | grep -iE 'password|secret|api[_-]?key|token|bearer|npg_|sk_live|sk_test' && echo "⚠️  STOP — possible secret in diff"
```
This is mechanical, takes one second, and catches the common patterns. The 2026-04-08 leak would have been caught by `grep npg_`.

### If a secret leaks

The drill, in order:
1. **Rotate the secret.** Generate new value, update wherever it's used (Cloud Run env, third-party dashboards, etc.). This is what actually secures things — history rewrite doesn't.
2. **Stop the bleeding.** Find the source (file? log? CI artifact?) and remove it so it doesn't keep leaking.
3. **Audit similar exposures.** `git log -p --all -S "<value>"` to find every commit that ever touched it.
4. **(Optional) Rewrite git history** with `git filter-branch` or `git-filter-repo`. Useful for hygiene, but doesn't help against anyone who already scraped — and orphan SHAs stay reachable on GitHub until their GC runs (no SLA).
5. **Don't panic-delete the repo.** It usually causes more problems than it solves.

### Public surface

- Repo `github.com/amirai21/family-os` is **public**. Default to "anything I commit is on the internet permanently."
- Cloud Run service URLs (`*.run.app`) are public by design. `EXPO_PUBLIC_API_URL` being committed is fine — it's just the hostname.
- The deployed service has `--allow-unauthenticated` (public access to the API); auth is enforced at the application layer via JWT. If JWT_SECRET leaks → game over until rotation.

## Session Log

### 2026-05-23
- Fixed `register.tsx` temporal dead zone bug — `joiningFamily` and `familyNameError` used before declaration
- Verified all 5 web tabs render correctly (today, calendar, grocery, home, settings) with clean console
- Enriched CLAUDE.md with auth flow, design tokens, UI components, and cross-platform gotchas
- Created `/session-log` skill for automatic progress tracking across sessions
- Redesigned `OnboardingWizard.tsx`: 5-step flow (Family Name → About You + Partner → Kids → Invite → Telegram)
- Step 2 now guides user to create self first, then optionally add partner member
- Added Step 4 invite partner screen with generate/copy/share code
- Changed `_layout.tsx` auto-complete logic to only skip onboarding for users who already claimed a member
- Added test login credentials to CLAUDE.md (כהן / 123456)
- Added new i18n keys for wizard steps in `he.ts`
