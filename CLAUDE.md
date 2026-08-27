# Gridloom — working notes

Context for anyone (human or agent) working in this repo.

## What this is

A client-only React SPA for AI image generation and model comparison. No backend. Users bring their own provider API keys, which stay in the browser.

## Hard rules

1. **Keys never leave the browser except to the provider they belong to.** No proxying, no telemetry, no analytics on key material. This is the whole point of the project.
2. **No backend.** If a feature needs a server, it does not belong here.
3. **TypeScript strict.** No `any` without a comment explaining why.
4. **Graceful errors everywhere.** Invalid keys, revoked keys, rate limits, Gemini's billing-required state, content filters. Human-readable messages with a recovery hint, never a raw stack trace.
5. **Never hardcode a color the tokens already name.** Semantic tokens live in `src/index.css`.
6. **The arch means "not yet developed."** Revealed artwork is always a full rectangle. Do not use the arch shape decoratively.
7. **Desktop-first, mobile-web usable.** Nothing broken on mobile, but the polish budget goes to desktop.

## Layout

```
src/lib/models.ts       model registry (params, prices, capabilities)
src/lib/providers/      one adapter per provider, single interface
src/lib/errors.ts       normalized provider error taxonomy
src/lib/db.ts           Dexie/IndexedDB schema
src/stores/             Zustand stores
src/pages/              routes
design/                 .dc.html design canvases + RATIONALE.md
public/_headers         CSP (the main defense for a BYOK app)
```

## Adding a model

Add an entry to `src/lib/models.ts` with provider, id, display name, price estimate, capability flags, and the parameter schema. **Verify the parameter schema against the provider's live API docs before committing** and note the date in a comment. Most additions need no adapter change.

## Adding a provider

Implement `ProviderAdapter` in `src/lib/providers/` (`generate` and `testKey`), register it in `providers/index.ts`, and add the origin to `connect-src` in `public/_headers`. Forgetting the CSP is the usual cause of a silent failure.

## Build gotcha

After any `npm install <package>` on macOS, run `npm ci --dry-run` before committing. npm prunes platform-conditional optional deps (`@emnapi/*`) from the lockfile on mac installs, which breaks CI. `@emnapi/core` and `@emnapi/runtime` are pinned as direct devDependencies as a guard. If `npm ci --dry-run` fails: `rm -rf node_modules package-lock.json && npm install`.

## Commands

```sh
npm run dev
npm run build
npm run typecheck
```
