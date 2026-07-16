# ThunderID JavaScript SDKs — Agent Instructions

## Project overview

pnpm + Turborepo monorepo of TypeScript SDKs under `packages/`: a framework-agnostic core
(`@thunderid/javascript`), a browser layer (`@thunderid/browser`), a server layer (`@thunderid/node`), and
framework SDKs built on top of those (`react`, `vue`, `nuxt`, `nextjs`, `express`, `react-router`,
`tanstack-router`). `samples/<framework>/quickstart` directories contain standalone demo apps — not part of
any published package.

## Build & test

```bash
pnpm install

pnpm build          # turbo run build across all packages
pnpm test           # turbo run test
pnpm lint           # turbo run lint (@thunderid/eslint-plugin)
pnpm typecheck      # turbo run typecheck
pnpm format:check

# Scope to a single package:
pnpm --filter @thunderid/<pkg> run build
pnpm --filter @thunderid/<pkg> run test
```

## Package hierarchy — check before adding a util

`@thunderid/javascript` is the framework-agnostic core (auth flows, token management, i18n, `VendorConstants`,
shared utils). Every other package depends on it, directly or transitively:

- `@thunderid/browser` → `@thunderid/javascript` + DOM/browser APIs (storage, session sync, WebAuthn).
- `@thunderid/node` → `@thunderid/javascript` + server-side session/cookie handling.
- `@thunderid/react`, `@thunderid/vue` → `@thunderid/browser`.
- `@thunderid/nextjs` → `@thunderid/node` + `@thunderid/react`.
- `@thunderid/nuxt` → `@thunderid/node` + `@thunderid/vue`.
- `@thunderid/express` → `@thunderid/node`.
- `@thunderid/sveltekit` → `@thunderid/browser`.
- `@thunderid/react-router`, `@thunderid/tanstack-router` → `@thunderid/react`.

**Before adding a helper/util/constant to a framework package, check whether it belongs lower in this
hierarchy instead.** If the same logic would be needed by more than one framework package (or you're about to
copy-paste one), it almost certainly belongs in `@thunderid/javascript` — or `@thunderid/browser`/
`@thunderid/node` if it needs DOM/server APIs — and should be re-exported from there, not duplicated. Every
package's `src/index.ts` re-exports its dependency's exports (`export * from '@thunderid/javascript'`, etc.),
so check there before assuming a helper isn't already available.

## Vendor naming rules

The SDK is white-labelable: a consuming app can override the brand/vendor namespace via the `vendor` config
field, so storage keys, cookie names, CSS class prefixes, state keys, etc. shouldn't be pinned to one brand.

- Do not hardcode the literal `thunderid`/`ThunderID`/`THUNDERID` (any casing) when building a runtime
  key/name that a consumer's `vendor` override should control — storage keys, cookie/session names, CSS
  class prefixes, `useState`/composable keys, log tags, DOM `id`/`data-*` attributes, and the like.
- It's fine for the **entry point** — the main client class, provider component, or a file whose purpose IS
  to represent the SDK itself (e.g. `ThunderIDClient`, `ThunderIDProvider`, `ThunderIDBrowserClient`) — to
  carry the name. That's a fixed identity, not a per-tenant value. Don't flag those.
- Avoiding the vendor name entirely is the best outcome, when the brand prefix isn't actually load-bearing.
- When a brand-scoped namespace is genuinely required, resolve it through `getVendorPrefix(vendor)` (defined
  in `@thunderid/javascript`, re-exported via `@thunderid/browser`/`@thunderid/node`) instead of hardcoding a
  literal or repeating an inline `vendor ?? 'thunderid'` fallback. That default belongs in one place.

## Code style

- TypeScript, ESLint via `@thunderid/eslint-plugin`, Prettier.
- Every source file carries a copyright header (`@thunderid/copyright-header` ESLint rule); `samples/**` is
  exempt (see `eslint.config.js`).
- Prefer editing or re-exporting an existing util over duplicating a helper across packages (see hierarchy
  above).

## File layout

```
packages/
  javascript/       Framework-agnostic core SDK
  browser/          Browser/DOM layer (storage, WebAuthn, session sync)
  node/             Server-side layer (cookies, sessions)
  react/            React components + hooks
  vue/              Vue components + composables
  nextjs/           Next.js SDK (client + server)
  nuxt/             Nuxt module
  express/          Express middleware
  sveltekit/        SvelteKit SDK (client + server)
  react-router/     React Router integration
  tanstack-router/  TanStack Router integration
samples/            Standalone quickstart demo apps, one per framework
```
