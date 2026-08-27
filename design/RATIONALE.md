# Gridloom — Design System Rationale

> **Archive note.** These canvases are the original design files from when Gridloom was built as a commercial product, so some screens still show pricing and license UI that the shipped open-source app no longer has. They are kept as-is because they document the design reasoning.

Companion doc: `HANDOFF.md` (implementation spec for the engineering rebuild).
Source designs: `Gridloom Landing.dc.html`, `Gridloom Studio.dc.html`, `Gridloom Terms.dc.html`, `Gridloom Privacy.dc.html`, `Gridloom 404.dc.html`. Exploration history: `Gridloom Directions.dc.html`.

## The concept: a photo studio for AI images

Every AI tool looks like a terminal or a Linear clone. Gridloom's buyers (indie hackers, marketers, founders, creators) are *picking images*, and the century-old professional workflow for picking images is photographic: shoot a roll, print a contact sheet, mark the keeper with a grease pencil. The identity hangs off that metaphor:

- **Comparison grid = contact sheet on the light table** — a glowing warm-white surface (`--sheet-bg` radial), frame numbers `41A`, mono captions. In the Darkroom theme the same sheet flips to warm black `#26211A` via the `--sheet-*` tokens.
- **Library = light table** (prints in white mounts, slight rotations, hover lifts straight)
- **Loading = "developing…"**, generate button = **"Develop ▸"**, run = **"Run the sheet"**
- **Favoriting = your pen** — user picks a personal winner mark (grease-pencil circle, red-dot sticker, washi tape, marker star, rubber stamp, paint check). Set in Settings, follows them across grid, library, exports. This is the personality feature; keep it.

## Theming

Light-first ("Studio light" — you judge prints under studio light) with a working dark mode ("Darkroom"). All Studio surface colors are CSS custom properties on `body`; `body[data-gl-theme="dark"]` overrides them. Toggle: Settings → Appearance + ☾ in the chrome; persisted to `localStorage["gridloom-theme"]`. Constant across themes: red accent, pen marks, tape gold, ok/warn/error, white photo mounts (prints are prints). Marketing pages are light-only.

## Tokens (light values; dark values in the Studio file's helmet)

- `--paper` #F3EFE6 (app bg) / marketing page bg #F7F4ED · `--paper2` #F7F4ED (inputs, modals) · `--card` #FFFDF6 · `--chip` #FFF · `--chip-on` #FFF3EC
- `--ink` #241F18 · `--muted` #5C5344 · `--faint` #8C8069 · `--ph` #B5A98E (placeholders) · `--hair` 50,42,32 (use as `rgba(var(--hair),.14)`)
- Accent: `red` #D23B2E (primary action) · hover #B32A1F · `mark` #E8483A (pen marks only)
- Sheet: `--sheet-bg` light-table radial / dark #26211A · `--sheet-ink/muted/faint/line/dash/shimmer/btn-*` (see helmet)
- `tape` #FBE38A · `ok` #4C7C4C · `warn` #B5763B · `error` #9E2A1E on #FDF0EE

Type (Google Fonts): **Newsreader** (500; italic for emphasis) display · **Instrument Sans** (400–700) UI/body · **JetBrains Mono** all data (costs, seeds, model names, metadata — if it's a number the user pays, it's mono) · **Caveat** handwritten annotations, sparingly.

Shape: pills for actions (999px), 10–14px cards, 3–8px photo frames. Shadows warm (`rgba(60,48,24,…)`), big/soft on photo objects, none on flat UI.

## Motion

- Staggered rise-ins: `translateY(14px)→0`, `cubic-bezier(.2,.7,.3,1)`, 60–90ms stagger.
- Grid cells pop in (`scale .85→1.03→1`) as providers answer; pending cells shimmer.
- Grease-pencil circle draws itself (SVG stroke-dashoffset) — signature moment (hero, marks, 404).
- Landing scroll reveals: rAF scroll-position check with polling failsafe (IntersectionObserver misbehaves in embedded iframes).
- Session cost meter: subtle 2.4s idle tick. Ambient float on hero sheet only.

## Product decisions baked into the design (don't lose these)

1. **Model registry drives the UI**: at launch, 7 models / 3 providers matching the repo's `src/lib/models.ts` (fal.ai: FLUX schnell/dev/1.1 pro, Fast SDXL, Recraft v3 · Google: Nano Banana · OpenAI: GPT Image 1). Grouped dropdowns show per-model cost; keyless providers render dimmed with "no key — add in Settings". Registry updates land without app releases, free on all tiers (surfaced in Settings → Model registry).
2. **Cost transparency everywhere, in plain words**: quote before every run (`≈ $0.18` on the button), a "session $0.42" meter in the chrome, "this sheet: $0.14" on the grid, cost stamped on every cell/frame forever. No Σ/sigma notation — the audience is marketers and creators, not mathematicians.
3. **Per-cell re-run** (↻) and per-cell error states (rate-limit → retry; billing → fix instructions). Errors never take over the screen.
4. **Reference image (img2img)** with strength slider in Generate.
5. **Recipes are the retention loop**: save from a Generate result, from a Compare sheet header (SAVE RECIPE), or the editor; Run loads prompt + models + seed count back into Compare.
6. **Trial meters the grid, not the app**: single shots free forever, 5 free comparison runs; upsell modal fires on the 6th run attempt.
7. **Backup is first-class**: Settings → Export everything, storage meter, last-backup date; wipe has inline two-step confirm.

## States coverage map

- Empty: no keys (Generate + Settings), empty library, no recipes — flip the `freshInstall` prop.
- Loading: shimmer cells, "developing…" run states.
- Errors: rate-limited cell (retry), invalid OpenAI key (Settings row + Generate billing banner).
- Success: toasts and confirmation states.
- Trial vs paid: trial badge → Licensed ✓; upsell modal; activation via Settings or upsell.

## Launch plan (agreed)

