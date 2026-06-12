---
name: qa-run
description: Run a cross-platform QA pass over family-os features on the iOS simulator, Android emulator, and web browser. Use whenever asked to QA the app, test or verify features, check a screen, or run a QA pass — including unattended or background runs. Orchestrates flows and delegates per-screen visual verification to the qa-verify subagent so screenshot tokens stay out of this session's context. Reads specs from features/, drives each target with Maestro (mobile) and Playwright (web), and writes a report to qa-reports/.
---

# QA run

Run a QA pass over family-os on all platforms.

Optional arguments may name a single feature (matching a file in `features/`)
and/or a platform (`ios`, `android`, `web`). With no arguments, run every feature
on every available platform.

**Context discipline — keeps the run from exhausting the window:**
- Never open a screenshot in this session. Hand each one to the `qa-verify`
  subagent and keep only its short verdict (see step 4).
- Never stream build or tool logs into context. Redirect them to files under the
  run's `logs/` dir and read only the exit code + tail on failure.

---

## 1. Plan

- Read every spec in `features/` (or just the one named in the arguments).
- Decide which platforms to target. Mark unavailable ones as "not run" — don't pretend.
- Make `qa-reports/<YYYY-MM-DD-HHMM>/` with `screenshots/{ios,android,web}/` and `logs/` subdirs.
- Reset test accounts to baseline before any flows run (see "Test context").
- **Run order matters: Android first, then iOS, then web.** Both share the Maestro binary
  and iOS's `--reinstall-driver` flag degrades the emulator's UIAutomator session.

---

## 2. Pre-flight & setup (do every time, in this order)

### Step 1 — Environment
```bash
source .env.qa
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH:$HOME/.maestro/bin"
RUN_ID=$(date +"%Y-%m-%d-%H%M")
mkdir -p qa-reports/$RUN_ID/screenshots/{ios,android,web} qa-reports/$RUN_ID/logs
echo $RUN_ID > /tmp/qa-run-id.txt
```

### Step 2 — Android emulator health check
```bash
# Confirm emulator is online
~/Library/Android/sdk/platform-tools/adb devices | grep emulator

# CRITICAL: map Metro from device to host (run every session)
~/Library/Android/sdk/platform-tools/adb reverse tcp:8081 tcp:8081

# Health check — screenshot the emulator
~/Library/Android/sdk/platform-tools/adb exec-out screencap -p > /tmp/adb-health.png
sips -Z 400 /tmp/adb-health.png -o /tmp/adb-health-small.png 2>/dev/null
```
Open `/tmp/adb-health-small.png`. Expected: Family OS app showing login or Today screen.

**If black screen** (Metro URL was wiped by a previous clearState or crash):
```bash
# Reinstall the APK — restores the hardcoded Metro URL
~/Library/Android/sdk/platform-tools/adb install -r \
  android/app/build/outputs/apk/debug/app-debug.apk
~/Library/Android/sdk/platform-tools/adb shell am start \
  -n "com.amirkubla.familyos/com.amirkubla.familyos.MainActivity"
# Wait 15s and re-check. If still black:
# REACT_NATIVE_PACKAGER_HOSTNAME=10.0.2.2 npx expo run:android
```

**If emulator is not running at all:**
```bash
export ANDROID_HOME=~/Library/Android/sdk
~/Library/Android/sdk/emulator/emulator -avd Pixel_7 -no-snapshot-load &
# Wait for boot (~30s)
~/Library/Android/sdk/platform-tools/adb wait-for-device
~/Library/Android/sdk/platform-tools/adb shell \
  'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done; echo boot_completed'
# Then: adb reverse + install APK as above
```

### Step 3 — iOS simulator health check
```bash
xcrun simctl list devices booted | grep -i iphone
```
If not booted:
```bash
xcrun simctl boot C624754D-7625-4CCC-A768-7EFD6575E4C7   # iPhone 17 Pro UDID
open -a Simulator
```

### Step 4 — Metro & web dev server
```bash
curl -s http://localhost:8081 -o /dev/null -w "Metro :8081 → %{http_code}\n"
curl -s http://localhost:8083 -o /dev/null -w "Web   :8083 → %{http_code}\n"
```
If Metro is down: `npx expo start` in a separate terminal.  
If web is down: `npx expo start --web --port 8083 &`

### Step 5 — Reset test accounts
```bash
QA_ALL=1 npm --prefix backend run qa:reset
```

---

## 3. Run flows

### Order: Android → iOS → Web

### Android flows
```bash
for F in login add-family-member add-grocery-item add-chore add-note add-project; do
  FLOW="${F}-android"
  # Check if platform-specific flow exists, else use shared flow
  [ -f ".maestro/${FLOW}.yaml" ] || FLOW="$F"
  QA_USERNAME="$QA_ANDROID_EMAIL" npm --prefix backend run qa:reset 2>/dev/null | tail -1
  maestro test -p Android \
    -e QA_EMAIL="$QA_ANDROID_EMAIL" -e QA_PASSWORD="$QA_ANDROID_PASSWORD" \
    .maestro/${FLOW}.yaml \
    > qa-reports/$RUN_ID/logs/${F}-android.log 2>&1
  echo "$F android: $?"
done
```

### iOS flows
```bash
for F in login add-family-member add-grocery-item add-chore add-note add-project; do
  QA_USERNAME="$QA_EMAIL" npm --prefix backend run qa:reset 2>/dev/null | tail -1
  maestro test -p iOS --reinstall-driver \
    -e QA_EMAIL="$QA_EMAIL" -e QA_PASSWORD="$QA_PASSWORD" \
    .maestro/${F}.yaml \
    > qa-reports/$RUN_ID/logs/${F}-ios.log 2>&1
  echo "$F ios: $?"
done
```
**Always use `--reinstall-driver` on iOS** — without it the XCTest driver goes stale after ~5 runs.

### Web (Playwright)
```bash
QA_EMAIL="$QA_EMAIL" QA_PASSWORD="$QA_PASSWORD" QA_RUN_ID="$RUN_ID" \
  npx playwright test --config=playwright.config.ts \
  > qa-reports/$RUN_ID/logs/web-all.log 2>&1
echo "web: $?"
```

### Screenshots — downsize before verify
```bash
sips -Z 1568 qa-reports/$RUN_ID/screenshots/**/*.png 2>/dev/null
```

---

## 4. Verify — delegate to the qa-verify subagent

For each feature × platform, invoke the `qa-verify` subagent with:
- The downsized screenshot path
- The feature's acceptance criteria (from `features/<name>.md`)
- On failure: the log tail or Playwright trace path

---

## 5. Report

Write `qa-reports/<run>/report.md`, copy to `qa-reports/latest.md`. Include:
- Feature × platform matrix (pass / fail / not run)
- Per feature: each criterion + verdict + one-line reason
- Summary: N passed, N failed, N not run

---

## Test context

| Account | Platform | Creds | Notes |
|---------|----------|-------|-------|
| `כהן` | iOS + web | `$QA_EMAIL` / `$QA_PASSWORD` | Hebrew username |
| `qatest` | Android | `$QA_ANDROID_EMAIL` / `$QA_ANDROID_PASSWORD` | ASCII (ADB inputText limitation) |

Credentials in `.env.qa` (gitignored). Baseline: 2 active family members (אבא + אמא).

---

## Platform operational notes (hard-won — read before debugging)

### iOS

| Finding | Detail |
|---------|--------|
| `clearKeychain: true` | Wipes Keychain (SecureStore/auth token) → always starts on login screen. Use this. |
| `clearState: true` | **DO NOT USE on home-screen flows** — resets Zustand store, homeSections may collapse |
| `--reinstall-driver` | Always required. XCTest driver stales after ~5 runs. |
| "Save Password?" sheet | Appears after fresh login. Dismiss: `runFlow when visible "Not Now"` |
| Tab bar taps | **Unreliable** on iOS RTL — XCUITest finds element but `onPress` doesn't fire (RTL coordinate flip). Use deep links instead. |
| Deep link format | `familyos://settings` (NOT `familyos://(tabs)/settings` — Maestro URL-encodes parentheses → "Unmatched Route") |
| Deep links on iOS | May show "Open in Family OS?" dialog — dismiss: `runFlow when visible "Open"` |
| Keyboard covers buttons | Always use `pressKey: Enter` + `onSubmitEditing` on last input to submit forms |
| Home screen scroll | `scrollUntilVisible` required before tapping buttons below Kids section. Notes section button works; chores/project buttons (deeper scroll) have onPress-doesn't-fire issue. |
| `assertVisible` on rows | Use `extendedWaitUntil: visible: text: "..."` for items inside ScrollViews — testID on View not always exposed to XCUITest |
| `inputText` without tap | Works when modal has `autoFocus` — but explicit `tapOn: id:` on the input is more reliable |

### Android

| Finding | Detail |
|---------|--------|
| Deep link format | `familyos://settings` / `familyos://grocery` / `familyos://home` — **NO `(tabs)` group** (Maestro URL-encodes parentheses → "Unmatched Route") |
| **Never `launchApp`** | **NEVER use `launchApp` in Android flows** — Maestro kills the running app, breaking the Metro URL → black screen. Start flows directly with `openLink:`. |
| `clearState: true` | **NEVER use** — wipes the stored Metro URL → black screen on next launch |
| `clearKeychain: true` | No-op on Android (Keystore not cleared). Session persists. |
| ADB reverse | Run `adb reverse tcp:8081 tcp:8081` once per emulator session. Device `localhost:8081` → host Metro. |
| Black screen recovery | `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` then relaunch |
| Always logged in | Android app is always logged in after `launchApp`. Flow must navigate to Settings and logout first. |
| Settings navigation | After `openLink: familyos://settings`, wait for `extendedWaitUntil: visible: text: "הגדרות"` before interacting |
| Logout button | At the bottom of Settings — use `scrollUntilVisible: element: text: "התנתק": direction: DOWN` then `tapOn: text: "התנתק"`. testID unreliable; `"יציאה"` is WRONG (correct key is `"התנתק"`). |
| inputText Hebrew | ADB inputText doesn't support Unicode. Use `qatest`/`qa123456` (ASCII) for Android test account |
| Post-login assertion | Use `assertNotVisible: id: "input-email"` — don't assert visible text or tab testIDs. Hebrew UIAutomator matching is broken; English family name is inside a larger text node. |
| Run order | Run Android **before** iOS in the same session. iOS `--reinstall-driver` degrades UIAutomator |
| Emulator degradation | After many runs (>6 flows), UIAutomator sessions degrade. Fresh session = reboot emulator |

### Web

| Finding | Detail |
|---------|--------|
| `localStorage` clear | `ensureLoggedOut()` in `tests/web/helpers/auth.ts` clears Zustand + auth keys |
| Tab navigation | Works normally — no RTL issue. `page.getByTestId("tab-settings").click()` fires correctly |
| `testID` → `data-testid` | React Native Web maps `testID` props to `data-testid` DOM attributes |
| Note pin button | Use `click({ force: true })` — notes grid re-renders after save causing element to detach |
| Server reset | `execSync("npm run qa:reset", { cwd: BACKEND_DIR, env: {...process.env, QA_USERNAME: email} })` in `beforeEach` |

---

## Adding a new feature

1. `features/<name>.md` — acceptance criteria + platforms
2. `.maestro/<name>.yaml` — iOS flow
3. `.maestro/<name>-android.yaml` — Android flow
4. `tests/web/<name>.spec.ts` — Playwright spec (copy `add-family-member.spec.ts` pattern)
5. Add testIDs to target screen components
6. Extend `backend/src/scripts/qa-reset.ts` to delete `"QA %"` rows for the new data type
7. First run: `/qa-run <name> web` to validate quickly, then mobile
