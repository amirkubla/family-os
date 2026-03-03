# Hebrew RTL — Developer Guide

## Where strings live

| File | Purpose |
|------|---------|
| `src/i18n/he.ts` | Hebrew dictionary (~90 strings), organized by namespace |
| `src/i18n/index.ts` | `t()` lookup + helpers: `dayName`, `dayNameShort`, `groceryCategoryLabel`, `blockTypeLabel`, `statusLabel`, `LOCALE` |

## How to add a new string

1. Add the key/value to `src/i18n/he.ts` under the appropriate namespace.
2. Use `t("namespace.key")` in your component.
3. For interpolation: `t("grocery.bought", { count: 3 })` — uses `{{count}}` in the dictionary.

## RTL style conventions

- **`flexDirection: "row"`** auto-flips with `I18nManager.forceRTL(true)` / `dir="rtl"` — do NOT change to `"row-reverse"`.
- **`marginLeft` / `marginRight`** do NOT auto-flip. Use **`marginStart`** / **`marginEnd`** instead.
- **`paddingLeft` / `paddingRight`** — same: use `paddingStart` / `paddingEnd`.
- **`position: absolute` with `left` / `right`** does NOT auto-flip. In an RTL layout a FAB that should hug the "leading" edge uses `left: 20`, not `right: 20`.
- **Calendar chevrons**: In RTL, "next" (forward in time) is the LEFT chevron and "back" is the RIGHT chevron. We swap the icon names accordingly.

## Fonts

The app uses **Rubik** (Google Fonts) which has native Hebrew glyph support. Four weights are loaded:

- `Rubik-Regular.ttf`
- `Rubik-Medium.ttf`
- `Rubik-Bold.ttf`
- `Rubik-ExtraBold.ttf`

The Paper theme is configured with `configureFonts({ config: { fontFamily: "Rubik" } })`, so all Paper `<Text>` components use Rubik automatically. Tab labels use `fontFamily: "Rubik-Medium"` explicitly.

## RTL bootstrap

In `app/_layout.tsx`:

- **Native**: `I18nManager.allowRTL(true)` + `I18nManager.forceRTL(true)` (guarded by `if (!I18nManager.isRTL)`)
- **Web**: `document.documentElement.dir = "rtl"` + `document.documentElement.lang = "he"`

## Locale

All date/time formatting uses `LOCALE = "he-IL"` from `src/i18n/index.ts`.
