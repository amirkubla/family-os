# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Family OS — a Hebrew RTL family management app (React Native / Expo) targeting iOS, Android, and web. Two parents share a single family: grocery lists, chores, kids' schedules, notes, projects, calendar events. The backend is a Hono API deployed to Google Cloud Run. The web app is bundled into the Docker image and served by the same backend process.

**Language:** Hebrew-only, full RTL. No English UI strings.

**Project status:** Solo developer (the maintainer), no real end users yet. Test data only. This means: breaking changes, JWT rotations, DB resets, and feature pivots are cheap. Don't over-engineer for backwards compatibility or zero-downtime migrations until there are real users.

## Two-repo system

The product spans **two separate Git repos / deploys**, both authored by the same maintainer. Most code lives here; the Telegram bot lives in its sibling.

| Repo | Location | Hosts | Deployed at |
|---|---|---|---|
| **family-os** (this repo) | `/Users/amirkoblyansky/family-os` — `github.com/amirkubla/family-os` | RN/Expo frontend (iOS / Android / web), Hono backend, Neon Postgres schema | Cloud Run `family-os` in GCP project `family-os-489209`, region `me-west1`. Public URL: `https://family-os-4ilvxexrha-zf.a.run.app` |
| **family-ai-assistant** | `/Users/amirkoblyansky/workspace/family-ai-assistant` — `github.com/amirkubla/family-ai-assistant` | FastAPI + SQLAlchemy + OpenAI. Telegram bot brain. Owns its own Neon DB for telegram bindings only — does NOT touch the family-os DB directly. | Cloud Run `family-ai-assistant` in GCP project `family-ai-assistant-476208`, region `me-west1`. URL: `https://family-ai-assistant-m7braajria-zf.a.run.app` |

They talk to each other via HTTP, never via shared DB. See "Telegram bot architecture" below for the full data flow.

The two GCP projects are both under the **personal** `amirkubla@gmail.com` account. Switch via:
```bash
~/google-cloud-sdk/bin/gcloud config set account amirkubla@gmail.com
~/google-cloud-sdk/bin/gcloud config configurations activate personal   # family-os-489209
# (for assistant ops just pass --project=family-ai-assistant-476208 explicitly)
```

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

# Wait until boot completes:
~/Library/Android/sdk/platform-tools/adb wait-for-device && \
  ~/Library/Android/sdk/platform-tools/adb shell \
    'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done; echo boot_completed'

# Terminal 2 — start Metro only (no --android flag), then push URL to device
export ANDROID_HOME=~/Library/Android/sdk
REACT_NATIVE_PACKAGER_HOSTNAME=10.0.2.2 npx expo start
# In a 3rd terminal (or once Metro shows "Waiting on http://localhost:8081"):
~/Library/Android/sdk/platform-tools/adb shell am start \
  -a android.intent.action.VIEW -d "exp://10.0.2.2:8081"
```

**`REACT_NATIVE_PACKAGER_HOSTNAME=10.0.2.2` is required.** Without it, the manifest Metro serves at `/` returns `hostUri: 127.0.0.1:8081` and a `launchAsset.url` pointing at `http://127.0.0.1:8081/...`. From the emulator, `127.0.0.1` is the emulator's own loopback (same trap as the API URL — see "Android emulator `localhost` trap" below), so Expo Go fails the bundle fetch with `java.io.IOException: Failed to download remote update`. Symptom: Expo Go shows "Something went wrong" within ~500ms of launch (`mCurrentFocus` flips from `ExperienceActivity` to `ErrorActivity`), Metro logs zero bundle activity — which makes it look like Metro is dead when it isn't. The `exp://10.0.2.2:8081` deep link only steers the initial manifest fetch; the manifest itself dictates the bundle URL, so both need 10.0.2.2. Verify with `curl -s http://127.0.0.1:8081/ -H 'expo-platform: android' -H 'expo-runtime-version: exposdk:54.0.0' | jq '.launchAsset.url'` — should show `10.0.2.2:8081`, not `127.0.0.1:8081`.

**Why not `npx expo start --android`?** It has a race condition: after installing Expo Go, the CLI immediately runs `adb shell monkey -p host.exp.exponent -c LAUNCHER 1` to launch it. On both Pixel_7 and freshly-cloned AVDs the monkey command exits 251 ("no main activities found") even though `cmd package query-activities` resolves the LAUNCHER intent correctly — Expo CLI treats this as fatal, kills Metro, and exits 1. The workaround (Metro alone + manual `am start` with the `exp://10.0.2.2:8081` deep link) bypasses the broken monkey path entirely. `10.0.2.2` is the magic IP for the emulator to reach the host's localhost.

**First run only:** Expo Go needs to be installed. The simplest way is to run `npx expo start --android` once — it will fail at the launch step, but it *does* install `host.exp.exponent` successfully. After that, use the `npx expo start` + `am start` flow above forever.

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

**Android emulator `localhost` trap.** On Android emulators, `localhost` resolves to the emulator itself, not the host — so `EXPO_PUBLIC_API_URL=http://localhost:3000` makes every API call hang for 10s and surface as a generic "שגיאה — נסו שנית" toast. The emulator reaches the host's localhost via the magic alias `10.0.2.2`. To handle this without breaking web (which needs real `localhost`) or iOS sim (also uses real `localhost`), we resolve the base URL at runtime via [src/lib/api/baseUrl.ts](src/lib/api/baseUrl.ts): `getApiBaseUrl()` reads `EXPO_PUBLIC_API_URL` and, on Android only, rewrites `localhost`/`127.0.0.1` to `10.0.2.2`. **All code reading the API URL must go through this helper, not `process.env.EXPO_PUBLIC_API_URL` directly** — currently used in [http.ts](src/lib/api/http.ts), [ApiAuthService.ts](src/auth/ApiAuthService.ts), [useAuthStore.ts](src/auth/useAuthStore.ts). If you add a new spot, route it through the helper or Android registration/login will break again.

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

**Android first-launch RTL gotcha:** `I18nManager.forceRTL(true)` persists the flag but does NOT flip `I18nManager.isRTL` in the running JS until the next launch. To avoid users seeing LTR on first install, `_layout.tsx` calls `Updates.reloadAsync()` (from `expo-updates`) immediately after `forceRTL` in production builds. Dev builds skip the reload (would fight with Metro HMR).

**Defense-in-depth for Hebrew text:** even with RTL active, **always include `writingDirection: "rtl"`** on text styles that render Hebrew, plus `textAlign: TEXT_RIGHT` where appropriate. This stays correct even in edge cases where the engine state hasn't flipped (in-flight rebuilds, OTA updates, etc.). Avoid combining `textTransform: "uppercase"` with large `letterSpacing` on Hebrew — that combination breaks Android's text shaper. See `src/ui/modalStyles.ts` for the reference styling.

### Backend (`backend/`)
Hono REST API with Drizzle ORM on Neon Postgres. Routes follow pattern `/v1/family/:familyId/<resource>`. All routes under `/v1/family/*` are protected by JWT middleware (`jwtAuth` + `familyGuard` ensures the JWT's familyId matches the URL param).

**Route files:** `auth`, `chores`, `family`, `familyEvents`, `familyMembers`, `grocery`, `internal`, `invites`, `kids`, `notes`, `notifications`, `projects`, `pushTokens`, `scheduleBlocks`.

Schema is in `backend/src/db/schema.ts`. After schema changes: `npm run db:generate` → `npm run db:migrate`.

**Internal service-to-service routes (`/v1/internal/*`):** narrow write-only surface for the Telegram bot Assistant. Auth'd by `SERVICE_TOKEN` (shared bearer) via `middleware/serviceToken.ts`, NOT user JWT. Currently exposes `POST /v1/internal/family/:familyId/{family-events,grocery}`. Add new endpoints here only when the Assistant grows new capabilities — don't widen this surface for general clients. The token lives in the family-os Cloud Run `SERVICE_TOKEN` env var and the Assistant Cloud Run `FAMILY_OS_SERVICE_TOKEN` env var — same value on both sides. Rotate together.

### Telegram bot architecture (the sibling `family-ai-assistant` repo)

The Telegram bot is implemented in a separate FastAPI service (see "Two-repo system" above). High-level flow:

```
User taps "חבר טלגרם" in family-os Settings
   ↓
family-os frontend → POST {ASSISTANT_URL}/telegram/generate-code   {family_id}
   ↓
Assistant mints a 6-char code (10-min TTL) in its OWN Neon DB
   ↓ returns {code, expires_in_minutes}
frontend opens https://t.me/family_os_assistant_bot?start=<code>
   ↓ Telegram launches the bot DM, sends /start <code>
Telegram → POST {ASSISTANT_URL}/telegram/webhook   (the registered webhook)
   ↓
Assistant /start handler: redeem code → upsert telegram_chats (chat_id → family_id)
                                      → delete the code
   ↓ replies "✅ חיברתי!" in the chat
…now any Hebrew message from that chat_id is routed to the bot:
   ↓
Assistant /webhook → OpenAI gpt-4o-mini (Hebrew NL → structured intent)
   ↓
Per intent:
  family_event  → POST {FAMILY_OS_API_URL}/v1/internal/family/:fid/family-events
  grocery       → POST {FAMILY_OS_API_URL}/v1/internal/family/:fid/grocery
  unsupported   → polite refusal back to the chat
   ↓
Bot sends reply to Telegram (✅ + summary)
```

**Key files in the sibling repo:**
- `app/api/telegram_routes.py` — `/telegram/generate-code`, `/telegram/webhook`, `/telegram/admin/set-webhook`
- `app/services/intent_parser.py` — OpenAI Hebrew → discriminated-union Pydantic intent (FamilyEventIntent / GroceryIntent / UnsupportedIntent)
- `app/services/family_os_client.py` — async httpx client calling family-os `/v1/internal/*` with `Authorization: Bearer ${FAMILY_OS_SERVICE_TOKEN}`
- `app/services/telegram_service.py` — code generation, atomic redeem, chat-binding upsert
- `app/services/telegram_client.py` — outbound `sendMessage` + `setWebhook`
- `app/models/telegram.py` — `TelegramCode` + `TelegramChat` SQLAlchemy models
- `alembic/versions/0002_telegram_tables.py` — DB migration

**Two databases.** The Assistant has its own Neon DB (project `family-ai-assistant-476208`) for `telegram_codes` + `telegram_chats` only. The family-os Neon DB is owned by family-os and is the single source of truth for family data; the Assistant reads/writes it only via REST. Never give the Assistant the family-os DATABASE_URL.

**Required Cloud Run env vars on the Assistant:**
- `DATABASE_URL` (plain) — Assistant's own Neon DB
- `OPENAI_API_KEY` (Secret Manager) — for gpt-4o-mini intent extraction
- `OPENAI_MODEL` (plain, default `gpt-4o-mini`)
- `TELEGRAM_BOT_TOKEN` (Secret Manager) — from `@BotFather`
- `FAMILY_OS_API_URL` (plain) — `https://family-os-4ilvxexrha-zf.a.run.app`
- `FAMILY_OS_SERVICE_TOKEN` (plain, should move to Secret Manager) — matches family-os's `SERVICE_TOKEN`

**Required Cloud Run env var on family-os:**
- `SERVICE_TOKEN` (plain) — matches the Assistant's `FAMILY_OS_SERVICE_TOKEN`

**Deploy gotcha (recorded 2026-05-25):** the Assistant's `.github/workflows/deploy.yml` originally used `gcloud run deploy ... --set-env-vars "DATABASE_URL=..."`. The `--set-env-vars` flag REPLACES the entire plain-env-var list with whatever is given, silently wiping anything set out-of-band. Changed to `--update-env-vars` which is additive. Always use `--update-env-vars` / `--update-secrets` (additive) — never `--set-env-vars` / `--set-secrets` (destructive) — in CD. Plain-env-var management is fragile; prefer Secret Manager for anything sensitive.

**Manually register the webhook after a deploy/URL change:**
```bash
WEBHOOK="https://family-ai-assistant-m7braajria-zf.a.run.app/telegram/webhook"
TOKEN=$(grep -oE '[0-9]{8,12}:[A-Za-z0-9_-]{30,}' /Users/amirkoblyansky/telegramtoken | head -1)
SECRET="${TOKEN: -16}"
curl -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$WEBHOOK\",\"secret_token\":\"$SECRET\",\"drop_pending_updates\":true}"
unset TOKEN SECRET
```
The webhook handler verifies `X-Telegram-Bot-Api-Secret-Token` against the last 16 chars of the bot token — Telegram-recommended pattern.

**Synthetic-webhook test driver.** To exercise the bot end-to-end without typing in Telegram (useful for QA / regression), POST a Telegram `Update` JSON to `/telegram/webhook` with the right `X-Telegram-Bot-Api-Secret-Token` header. The bot will still send real replies to the bound Telegram chat (acceptable side effect). See `/tmp/run_grocery_tests.sh` from the 2026-05-25 session for a reference script that fires a battery of prompts and diffs the resulting grocery_items rows.

**Bot's intent scope today (2026-05-25):**
- `family_event` — one-time recurring or one-time event creation (Hebrew NL parses date + time + title + optional location)
- `grocery` — multi-item list, per-item qty + per-item shopping_category (`grocery` / `home` / `health`)
- `unsupported` — anything else returns a polite Hebrew refusal

Adding a new intent: extend the discriminated union + system prompt + webhook dispatch + (if it writes) a new internal route on the family-os side.

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

**Non-negotiable principle:** every change must work on **both web and native (Android primarily, iOS secondarily)**. A fix that lands on web cannot break the APK and vice versa. The app ships to all three from a single codebase, and we don't have a separate web-only or native-only branch.

When you change anything that could be platform-sensitive — layout, gestures, modals, navigation, storage, networking, anything touching `Platform.OS`, anything using DOM APIs (`window`, `document`, `localStorage`) or native APIs (`SecureStore`, `Linking`) — verify on **both** before considering it done. The checklist in "Testing Changes" below is the minimum bar.

Common gotchas that have already bitten us:

- **Android elevation shadows** don't match iOS `shadowX` props — test both. Avoid `elevation` on transparent/overlapping views.
- **Keyboard avoiding:** iOS uses `behavior="padding"`, Android uses `behavior="height"` or `undefined`.
- **Web `position: "fixed"`** needs casting: `Platform.OS === "web" && ({ position: "fixed" } as any)`.
- **ScrollView vs FlatList:** FlatList has issues in some modal/nested contexts — prefer ScrollView for short, bounded lists.
- **Accessibility on Pressable:** RN Web doesn't promote raw `<Pressable>` to a clickable role unless you set `accessibilityRole="button"` + `accessibilityLabel`. Plain `.click()` from a test/script will be ignored. For any new interactive Pressable, add these props plus a stable `testID` so the element is reachable from automation and screen readers. The bottom tab bar and the logout button are wired this way as the reference pattern.
- **Safe-area insets (Android nav bar overlap):** `edgeToEdgeEnabled: true` in `app.json` makes the app draw under the system status bar AND nav bar. Without compensating for `useSafeAreaInsets().bottom`, the bottom tab bar gets overlapped by the system nav buttons on devices like Xiaomi/Redmi (3-button mode). `SafeAreaProvider` is wired at the root in `app/_layout.tsx`, and `CustomTabBar` reads `insets.bottom` for its `paddingBottom`. Anything else docked to the screen bottom (sticky CTAs, full-screen modals' close buttons) needs to do the same.

### Testing Changes
Before considering any change done:
1. `node_modules/.bin/tsc --noEmit` — type check
2. `npx expo lint` — lint
3. Visually verify on **web** (`npx expo start --web` → http://localhost:8083)
4. Visually verify on **Android** — emulator (`npx expo start --android`) for most changes, or a real device APK (`eas build --profile preview --platform android`) for anything platform-sensitive (layout, safe-area, gestures, deep links, storage, push, share sheet, etc.)
5. iOS is best-effort — verify on simulator when touching gestures, animations, or anything iOS-specific

**Web-only verification is not enough** for changes that touch:
- Layout, padding, or anything using `Platform.OS` / `useSafeAreaInsets()`
- Modals, overlays, scroll behavior, keyboard avoidance
- `Linking`, `Share`, `Clipboard`, `SecureStore`, `AsyncStorage`
- Anything inside `if (Platform.OS === "web")` or `if (Platform.OS === "android")` branches
- Anything reading from `window`, `document`, `navigator`, or `localStorage`

**Android-only verification is not enough** for changes that touch:
- Any visible UI (RTL, fonts, and `react-native-paper` render differently on RN Web)
- Anything using `Platform.OS === "web"` casts (e.g. `position: "fixed"` for sticky elements)
- API URL handling (`EXPO_PUBLIC_API_URL` is empty on web prod → same-origin; populated on native builds → explicit URL — easy to forget when adding a new env-driven feature)
- Deep links (web uses URL paths, native uses URL schemes like `familyos://`)

If you can't test on both right now, **say so explicitly** in the commit/PR message — don't pretend the change is verified when only one platform was checked.

### Two-Member QA Flow
Quick end-to-end smoke test for the multi-member sync after any auth/onboarding/sharing change. Solo dev, so it's manual but reproducible. Runs against the local stack (dev backend → prod Neon).

**Setup (two terminals):**
```bash
cd backend && npm run dev                    # backend on :3000
npx expo start --web --port 8083             # frontend on :8083
```
Open `http://localhost:8083` in a private/incognito window.

**Phase 1 — Member 1 (creates family):**
1. `/register`: family name `בדיקות`, username `qatest1`, password `qa123456`, leave invite blank → create
2. Onboarding wizard 5 steps: family name (re-confirm), self `אבא טסט`, add partner `אמא טסט`, kid `דני`, generate invite code, skip telegram
3. Add content: grocery `חלב` x2; kid schedule block `חוג כדורגל` for דני; family event `ארוחת ערב משפחתית` for tomorrow
4. Note the invite code from the wizard's Step 4

**Phase 2 — Member 2 (joins via deep link):**
1. Clear session — fastest way:
   ```js
   localStorage.removeItem('familyos_auth_session');
   localStorage.removeItem('family-os-store-v2');
   ```
2. Navigate to `/register?invite=<CODE>` — invite auto-fills, family is validated, partner placeholder is the only claimable member
3. Pick `אמא טסט`, username `qatest2`, password `qa123456` → join
4. Verify all Member 1 data is visible (grocery, kid event, family event)
5. Add a new family event `פגישת רופא` for the same day
6. Edit an existing grocery item (change `חלב` quantity to 3)

**Phase 3 — Back to Member 1:**
1. Clear session, navigate to `/login`, sign in as `qatest1`
2. Verify Member 2's changes propagated: `חלב x3`, both events visible

**Cleanup:** delete the family from Settings, or leave it — solo dev, prod has no real users yet.

The web preview tool's `click()` doesn't reliably fire React Native Web `Pressable`s — when scripting, dispatch a full `mousedown/mouseup/click` sequence via `dispatchEvent` instead.

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
- **Backend secrets live in Cloud Run env vars** (`gcloud run services update --update-env-vars` for plain, or Secret Manager for sensitive — prefer Secret Manager for new ones), never in the repo. Two services, two projects:
  - **family-os** (`family-os-489209`): `DATABASE_URL`, `JWT_SECRET`, `SCHEDULER_SECRET`, `SERVICE_TOKEN`.
  - **family-ai-assistant** (`family-ai-assistant-476208`): `DATABASE_URL` (Assistant's own Neon, NOT family-os's), `OPENAI_API_KEY` (Secret Manager), `TELEGRAM_BOT_TOKEN` (Secret Manager), `FAMILY_OS_API_URL` (plain), `FAMILY_OS_SERVICE_TOKEN` (matches family-os `SERVICE_TOKEN`, rotate together).
  Inspect with `gcloud run services describe <service> --project=<proj> --region=me-west1 --format="value(spec.template.spec.containers[0].env[].name)"` to see names without leaking values.
- **Frontend `EXPO_PUBLIC_*` are NOT secret** — they're baked into the JS bundle and inspectable in DevTools. Anything truly sensitive must NEVER use this prefix.
- **Use Secret Manager for any new sensitive value.** Pattern:
  ```bash
  # Pipe value from file, never inline. The shell-redirect prevents the
  # value from appearing in process listings or shell history.
  cat /path/to/keyfile | tr -d '\n' | \
    gcloud secrets create MY_SECRET --project=<proj> --replication-policy=automatic --data-file=-
  gcloud secrets add-iam-policy-binding MY_SECRET --project=<proj> \
    --member="serviceAccount:<project-number>-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
  gcloud run services update <service> --project=<proj> --region=me-west1 \
    --update-secrets="MY_SECRET=MY_SECRET:latest"
  ```
- **Never use `--set-env-vars` in CD pipelines.** It REPLACES the plain-env-var list, silently wiping vars set manually out-of-band. Use `--update-env-vars` (additive). Same applies to `--set-secrets` vs. `--update-secrets`. The Assistant repo's `deploy.yml` was bitten by this on 2026-05-25 and has been fixed.

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

- Repo `github.com/amirkubla/family-os` is **public**. Default to "anything I commit is on the internet permanently."
- Cloud Run service URLs (`*.run.app`) are public by design. `EXPO_PUBLIC_API_URL` being committed is fine — it's just the hostname.
- The deployed service has `--allow-unauthenticated` (public access to the API); auth is enforced at the application layer via JWT. If JWT_SECRET leaks → game over until rotation.

## Session Log

### 2026-05-27
- **GitHub ownership transferred** from the work user `amirai21` to the personal user `amirkubla` for both repos: `github.com/amirkubla/family-os` and `github.com/amirkubla/family-ai-assistant`. Local git remotes repointed; CLAUDE.md references in both repos updated; old URLs still redirect via GitHub for now but should be considered deprecated.
- **CD impact (verified for family-os)**: the family-os deploy workflow authenticates via a static `GCP_SA_KEY` secret (`google-github-actions/auth@v2` with `credentials_json`) — repo secrets transfer with the repo, so the first post-transfer push (`477700d` for the customization feature) deployed cleanly. No action needed there.
- **CD impact (heads-up for family-ai-assistant)**: the Assistant's workflow uses Workload Identity Federation instead — `workload_identity_provider: projects/${{ secrets.GCP_WIF_PROJECT_NUMBER }}/locations/global/workloadIdentityPools/github/providers/github-oidc`. WIF providers commonly enforce an `assertion.repository_owner == 'amirai21'` attribute condition. If yours does, the next Assistant push will fail with a 403 from `google-github-actions/auth`. Fix: update the provider's attribute condition to `amirkubla` (or to a broader expression covering both). Quickest probe is to do a trivial Assistant push and watch the run.
- **Other org references**: grepped `*.md / *.yml / *.json / *.ts` across both repos — only the three architecture lines in family-os CLAUDE.md and the one cross-link in family-ai-assistant CLAUDE.md mentioned `amirai21`. No deploy.yml hardcoded the owner. No code references. Clean.

### 2026-05-25
- **Telegram bot integration restored, end-to-end.** Discovered the family-os Settings "Connect Telegram" button was wired to `http://localhost:8000/telegram/generate-code` with no env var ever set; the deployed Assistant service had zero telegram code (git history confirmed it had never been there). The earlier working bot existed somewhere but its code never made it into the repo / was lost.
- **Rebuilt from scratch** in `/Users/amirkoblyansky/workspace/family-ai-assistant`. New files: `app/models/telegram.py` (TelegramCode + TelegramChat), `alembic/versions/0002_telegram_tables.py`, `app/api/telegram_routes.py` (`/telegram/generate-code`, `/telegram/webhook`, `/telegram/admin/set-webhook`), `app/services/intent_parser.py` (gpt-4o-mini Hebrew NL → discriminated Pydantic union: FamilyEventIntent / GroceryIntent / UnsupportedIntent), `app/services/family_os_client.py` (httpx → family-os `/v1/internal/*`), `app/services/telegram_service.py`, `app/services/telegram_client.py`. Router mounted at ROOT not `/api` because the frontend hardcodes `${ASSISTANT_URL}/telegram/generate-code`.
- **On the family-os side**: new `backend/src/middleware/serviceToken.ts` + `backend/src/routes/internal.ts` exposing narrow write-only `POST /v1/internal/family/:fid/{family-events,grocery}`. Auth'd by `SERVICE_TOKEN` (shared bearer) rather than user JWT. `EXPO_PUBLIC_ASSISTANT_URL` wired in `.env.production` + `eas.json` pointing at `https://family-ai-assistant-m7braajria-zf.a.run.app`.
- **Two leaked secrets** during the investigation: the original BotFather token (user pasted) and the Assistant Neon DATABASE_URL (my `gcloud describe` dumped it into the chat). Bot token was rotated via `@BotFather /revoke`; Neon password rotation deferred but flagged.
- **Secret Manager pattern adopted** for OPENAI_API_KEY and TELEGRAM_BOT_TOKEN — values piped from file into `gcloud secrets create --data-file=-`, then mounted via `--update-secrets`. Never appears in process listings, gcloud describe output, or shell history. This is the new standard for any sensitive value — see the "Secret handling" section above.
- **`--set-env-vars` regression**: Assistant `.github/workflows/deploy.yml` originally used `--set-env-vars "DATABASE_URL=..."` which REPLACES the entire plain-env-var list, silently wiping `FAMILY_OS_SERVICE_TOKEN` + `FAMILY_OS_API_URL` on every CD run. Bot threw `httpx Illegal header value b'Bearer '`. Fixed by switching to `--update-env-vars` (additive). Verified the post-fix CI run preserves all env vars.
- **Grocery test battery G1-G8** run via synthetic-webhook driver script (`/tmp/run_grocery_tests.sh`): 7/8 pass on first try. The one fail was G7 (cleaning supplies landed in `shopping_category="grocery"` instead of `"home"`). Fixed by exposing `shopping_category: Literal["grocery", "home", "health"]` on `GroceryItem` in the Pydantic schema + updating the system prompt with per-category Hebrew examples. Reply also now uses category-aware emojis (🛒 / 🏠 / 💊). Re-test pending.
- **The synthetic-webhook driver pattern** is now the recommended way to QA the bot — POST a real Telegram-shaped `Update` JSON to `/telegram/webhook` with the right `X-Telegram-Bot-Api-Secret-Token` header. The bot sends real replies to the bound Telegram chat (acceptable side effect — the test runner is the user), and we diff DB rows to verify. Reference: the script written this session.
- Architecture decision recorded in the new "Two-repo system" + "Telegram bot architecture" sections above. **Two databases, two repos, two Cloud Run services, one product.** The Assistant has its own Neon for telegram bindings; family-os DB stays the source of truth for family data; the bridge is the `SERVICE_TOKEN`-authed REST API.

### 2026-05-24
- Attempted to clone `Pixel_7` AVD into `Redmi_Note_13` (1080×2400 @ 400dpi, 2GB RAM, manufacturer label Xiaomi) by copying `~/.android/avd/Pixel_7.{avd,ini}` and editing `config.ini`. AVD booted fine but Expo Go failed to launch on it — same monkey-251 error we later found on Pixel_7 too. Deleted the clone.
- Key learning: AVD cloning is cosmetic. `ro.product.manufacturer` comes from the system image (`google_apis`), so the OS still identifies as Google. To test Xiaomi-specific behavior (3-button nav safe-area overlap from the previous session), just toggle 3-button nav in Settings on Pixel_7.
- **Root-caused the `npx expo start --android` race condition** that was blocking emulator launches all session: Expo CLI runs `adb shell monkey -p host.exp.exponent -c LAUNCHER 1` immediately after installing Expo Go, but monkey returns exit 251 ("no main activities found") despite `cmd package query-activities` resolving the intent correctly. CLI treats this as fatal and kills Metro.
- **Workaround documented in the Android Emulator section above:** start Metro alone (`npx expo start`, no `--android` flag), then push the URL to the device manually with `adb shell am start -a android.intent.action.VIEW -d "exp://10.0.2.2:8081"`. `10.0.2.2` is the emulator's alias for host's localhost. App loaded and rendered correctly on Pixel_7 with this flow (today screen, Hebrew RTL, tab bar properly cleared above the 3-button nav).
- Updated `~/.claude/projects/-Users-amirkoblyansky-family-os/memory/reference_android_emulator.md` with the workaround so future agents skip the broken `--android` flag.
- **Tab bar pill corners — fully rounded on both platforms.** [CustomTabBar.tsx:200](src/components/CustomTabBar.tsx:200) `borderRadius: 18 → 999` + `overflow: "hidden"`. The original 18 gave rounded corners that looked sharp on Android because the cell is wider there (~194×68 stadium with flat top/bottom sides), while web stayed near-square (~60×64) so 18 looked fine. With 999, both platforms render fully rounded ends — Android becomes a long pill/stadium, web becomes a near-circle. Same look, different aspect ratio due to viewport width.
- **Grocery/event chip corners — same fix.** [src/ui/modalStyles.ts:166](src/ui/modalStyles.ts:166) `borderRadius: R.xl (20) → 999` on `MS.chip`. Shared style used by 7 modals (Grocery, Chore, FamilyEvent x3, Project, ScheduleBlock x2). On Android, Paper `<Button compact>` renders ~44px tall and radius 20 sat just below the pill threshold (height/2); 999 forces pill regardless of internal Paper roundness.
- **CRITICAL — Android registration was broken (all auth calls were).** Root cause: `EXPO_PUBLIC_API_URL=http://localhost:3000` works on web (browser resolves to host) but on Android emulator, `localhost` resolves to the emulator itself, so every fetch timed out after 10s and surfaced as the generic "שגיאה — נסו שנית". Symptoms: no console errors except network timeouts; backend never received the request.
- **Fix:** new [src/lib/api/baseUrl.ts](src/lib/api/baseUrl.ts) helper `getApiBaseUrl()` reads `EXPO_PUBLIC_API_URL` and, on Android only, rewrites `localhost`/`127.0.0.1` to the emulator-magic alias `10.0.2.2`. Web and iOS sim use the raw value (they reach host's localhost natively). Wired into all 3 call sites that previously read `process.env.EXPO_PUBLIC_API_URL` directly: [http.ts](src/lib/api/http.ts), [ApiAuthService.ts](src/auth/ApiAuthService.ts), [useAuthStore.ts](src/auth/useAuthStore.ts).
- **Why a helper instead of just changing `.env.development` to `10.0.2.2`:** that string only means something to the Android emulator — web and iOS sim would both break. Runtime swap keeps one env value working everywhere.
- Verified end-to-end on Android emulator: registered `TestFam / testandroid1 / test123` → wizard step 2 loaded. Web reload — still logged in to משפחת כהן, today screen rendering normally. Documented under "Environment Configuration" above.

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
- Documented Android emulator workflow (SDK at `~/Library/Android/sdk`, AVD `Pixel_7`, ADB/port troubleshooting) in CLAUDE.md + memory
- Converted invite share from plain text to deep link (`/register?invite=CODE`) in `OnboardingWizard.tsx` and `(tabs)/settings.tsx`; falls back to `window.location.origin` on web
- Restructured env config: `.env.development` (gitignored) + `.env.production` (committed, empty values for same-origin pattern); Dockerfile now `COPY`s `.env.production` instead of inline `ENV` directives
- Added `eas.json` `env` blocks per profile so native builds get explicit Cloud Run URLs (web's same-origin doesn't work on Android/iOS)
- Documented Android EAS build commands (`eas build --profile preview --platform android` etc.) in CLAUDE.md + memory
- **Security incident:** `.claude/settings.local.json` had been logging Bash commands with inline secrets since 2026-04-08 — Neon DB password, JWT_SECRET, and SCHEDULER_SECRET were public on GitHub for ~6 weeks until Neon's scanner alerted us
- Rotated all 3 leaked secrets (Neon password via console, JWT/Scheduler via `openssl rand` + `gcloud run services update`); Cloud Run revisions 75 and 76 hold the new values
- Untracked `.claude/settings.local.json` and added to `.gitignore`; rewrote git history with `filter-branch` to purge the file from all 6 commits that touched it; force-pushed to master
- Added "Security Standards" section to CLAUDE.md codifying lessons learned (never inline secrets in commands, pre-commit grep heuristic, incident response drill)
- Noted gcloud `personal` configuration (`amirkubla@gmail.com` / `family-os-489209`) is the one to use; work account has no access
- GitHub Actions deploy from earlier push (commit `e0baf4e`) failed at the Checkout step (transient infra issue, not our code) — needs manual re-run or push triggers a fresh build
- Force-push from history rewrite auto-triggered fresh GH Actions runs; commits `3309e1d` and `8cf7955` deployed successfully — prod web is up-to-date with master
- Ran comprehensive two-member QA against local dev: register, 5-step wizard, add grocery/kid event/family event, deep-link invite to Member 2, bidirectional sync verification — all passed
- Documented the QA flow in CLAUDE.md "Two-Member QA Flow" section + memory `reference_qa_flow.md` for future iterations
- Fixed 5 polish issues from QA: wizard step 1 redundancy (auto-advance on familyName load), wizard backdrop opacity, grocery default category (`inferGrocerySubcategory()` Hebrew keyword map at `src/lib/groceryCategoryInfer.ts`), `fireAndForget()` now updates `lastSyncedAt` on mutation success, added testID/accessibilityRole to `CustomTabBar` + logout button
- Fixed Xiaomi nav-bar overlapping bottom tab bar: added `SafeAreaProvider` to `_layout.tsx` and `useSafeAreaInsets()` to `CustomTabBar` paddingBottom (`edgeToEdgeEnabled: true` requires inset compensation)
- Codified cross-platform parity principle in CLAUDE.md: every change must work on both web AND Android; expanded "Testing Changes" with explicit lists of when web-only or Android-only verification is insufficient
- Fixed Android RTL bugs (calendar event modal + grocery modal section labels appearing LTR): added `textAlign: TEXT_RIGHT` + `writingDirection: "rtl"` to `MS.sectionLabel`, dropped `textTransform: "uppercase"` + reduced `letterSpacing` (Android text-shaper bug with Hebrew)
- Root-cause Android RTL fix: `_layout.tsx` now triggers `Updates.reloadAsync()` after `forceRTL` in production builds so the in-memory `isRTL` flag flips on first install (was previously stuck false until manual app restart)
- Defense-in-depth: added `writingDirection: "rtl"` to all shared `MS.*` text styles (heading, subtitle, label, inputContent, error, chipLabel, timeLabel)
- Verified RTL fixes on Pixel 7 emulator via Expo Go: today/calendar screens render correctly; grocery add modal section labels (שם הפריט, כמות, קטגוריה) all right-aligned with icons on the right — calendar event modal uses same shared style so transitively verified

#### QA pass (later same day, web only)
- Ran a 12-phase QA sweep against local dev (backend `:3000` + web preview `:8083`). Web only — emulator booted but visual verification deferred to user.
- Wrote `QA_REPORT.md` and `test.md` at repo root cataloguing **15 bugs** (1 critical / 2 high / 5 medium / 7 low) with reproduction steps, code refs, and an Android handoff checklist.
- **Critical to remember for next agent:**
  - **BUG #1** (CRITICAL): corrupting `family-os-store-v2` localStorage with unparseable JSON renders a permanent blank screen. Pulls succeed (200), no console errors, body innerText is `""`. Recovery requires manually clearing localStorage from DevTools — no in-app path. Root cause: Zustand `persist` middleware has no `onRehydrateStorage` error handler.
  - **BUG #2** (HIGH): rapid clicks on any add-modal Save button create duplicate rows on the **server**, not just locally. Verified 5 clicks = 5 server rows via direct API GET after the test. Affects `GroceryAddModal`, `NoteModal`, `ChoreAddModal`, `FamilyEventModal`, `ProjectModal` — every modal needs an in-flight `loading` guard, not just `disabled={!title.trim()}`.
  - **BUG #3** (HIGH): the onboarding wizard refuses to advance past the Kids step with zero kids ("יש להוסיף לפחות ילד/ה אחד/ת"). Childless / empty-nest / single-adult families currently can't onboard.
- Also pushed a feature unrelated to the QA pass that was already in the working tree: collapsible Notes/Chores/Projects sections on Home tab (commit `ef5b811`). New `homeSections` store slice, migration to v11. Migration default `{ notes: true, chores: true, projects: true }` means all sections start expanded for existing users.
- Both commits on master: `ef5b811` (collapsible sections) + `d0d1f64` (QA docs).
- New memory reference: `reference_web_qa_automation.md` — RN-Web preview-tool gotchas (Pressable click sequence, input value-setter trick, ScrollView scrollTop, test-data cleanup snippets). Read before running any web QA.
- **Things the preview tool genuinely cannot do** (don't waste time): two browser contexts (rules out multi-member sync + two-tab cross-update), visual verification on Android, network throttling for offline tests, iOS anything.
- **Reproducible test-data hygiene:** stress-test items used the prefix `פריט-סטרס-${Date.now()}` and were DELETEd via direct API calls before ending the session. Dev backend talks to prod Neon — garbage persists otherwise. Snippet is in the new memory reference.
- **Next priorities implied by the report**, in this order: fix Zustand rehydrate fallback (BUG #1), add `loading` state to all 5 modal Save buttons (BUG #2), make wizard Kids step optional (BUG #3), translate "admin" → Hebrew on Settings, run the Android handoff checklist visually.
