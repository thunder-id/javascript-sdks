# ThunderID JavaScript SDKs — Agent Instructions

## Project overview

pnpm + Turborepo monorepo of TypeScript SDKs under `packages/`: a framework-agnostic core
(`@thunderid/javascript`), a browser layer (`@thunderid/browser`), a server layer (`@thunderid/node`), and
framework SDKs built on top of those (`react`, `vue`, `nuxt`, `nextjs`, `express`, `react-router`,
`tanstack-router`). The per-framework quickstarts and integration samples live in
[thunder-id/samples](https://github.com/thunder-id/samples) and depend on the published packages; the E2E
suite fetches the quickstarts into `tests/e2e/.samples` and wires them to this workspace's builds
(`tests/e2e/scripts/prepare-samples.ts`).

## SDK development specification

Every change to this SDK goes through the ThunderID SDK development specification. It is
maintained in the product repository and governs all four SDK repositories, so it is linked
here rather than copied.

- [SDK development specification](https://github.com/thunder-id/thunderid/blob/main/docs-internals/sdk-development/spec.md):
  the contract this SDK implements. Layering, operational modes, configuration keys, client
  surface, error model, security floor, platform packaging, testing, and the cross-SDK parity
  rules.
- [SDK threat model](https://github.com/thunder-id/thunderid/blob/main/docs-internals/sdk-development/threat-model.md):
  the security posture the specification's floor comes from.
- [`sdk-development` skill](https://github.com/thunder-id/thunderid/blob/main/.agent/skills/sdk-development/SKILL.md):
  loads both documents and drives the work, from locating the SDK checkouts through validation
  to raising the linked pull requests.

Read the specification before adding or changing an operation, configuration key, error, or UI
component. A capability that lands here usually needs to land in the sibling SDKs too, and the
pull request has to answer that question either way, by linking the sibling pull requests or
by saying why they are not needed.

## Skills

- [Fix npm Vulnerability](.agent/skills/fix-npm-vulnerability/SKILL.md) — Resolve a pnpm/npm security advisory.
  Use when `pnpm audit` or Dependabot surfaces a security advisory. Tries to update the head dependency first;
  falls back to a scoped override with a tracking GitHub issue.
- [Prune npm Overrides](.agent/skills/prune-npm-overrides/SKILL.md) — Audit the pnpm overrides this repo
  already carries and remove the ones upstream has since fixed. Use when asked to check, clean up, or prune
  the overrides in `pnpm-workspace.yaml`, or when an override's tracking issue comes up for review.

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

## Adding or changing a component

The [SDK development specification](https://github.com/thunder-id/thunderid/blob/main/docs-internals/sdk-development/spec.md) (UI) is the contract. In practice, every component:

1. **Lives in its functional group:** `auth/` (sign-in, sign-up, recovery, invites, callback, with `buttons/`, `flow/` and `guards/` inside), `account/` (the signed-in user's own data), `management/` (users, groups, roles, agents, applications), or `common/` (shared across groups, such as the language switcher and branding). Primitives and the data layer keep their own folders.
2. **Ships a styled variant and a `Base` variant.** `Base` takes its data and callbacks as parameters, with no SDK state, so an app can drive it itself (e.g. `BaseUserList`).
3. **Accepts a custom render on both variants.** Passing it replaces the built-in UI, while the component keeps its data loading, state and actions. The mechanism is the platform's own:
   - React and Next.js: a `children` function, the same pattern as `SignIn`.
   - Vue and Nuxt: the default scoped slot.
   It receives everything needed to draw the component: rows, columns, paging (`limit`, `offset`, `totalResults`, page change) and selection for a list; values, setters, submit and validity for a form; the record and the actions the app has allowed for a details, members, assignments or permissions view; plus loading and error state. Behaviour the specification requires still holds under a custom render: data-changing actions are off unless the app turns them on, a delete asks for confirmation, and server errors appear as translated messages.
4. **Takes every string from the translation bundle**, in every shipped locale.
5. **Tags elements rendered from a server-described flow step** with `thunderid-field-<id>` and `thunderid-action-<ref>`.
6. **Has tests** for the built-in UI and for a custom render (Vitest and Testing Library).
7. **Has a playground story,** including a **Custom rendering** variant drawn with the platform's own UI toolkit, and a capability check if it calls the server.

A component that changes here usually needs the same change in the sibling SDKs. See the parity rules in the specification.

## Samples

The quickstarts and integration samples live in [thunder-id/samples](https://github.com/thunder-id/samples), and each one pins a released version of this SDK. A change here therefore can't break a sample until the sample bumps its version, which is exactly when a break would surface for a real app. Before raising a pull request, check every sample that uses this SDK:

- **A sample stops compiling or behaving the same** (a renamed type or package, a changed signature, a moved default): raise a samples pull request that bumps the SDK version and fixes the sample. Keep it as a draft until the SDK release it needs is out.
- **The change adds something a sample exists to show** (a self-care capability for `self-care/account`, a management component or operation for `management/admin`, a new sign-in option for the quickstarts): update that sample in the same samples pull request, so it demonstrates the new capability rather than working around its absence.
- Link the samples pull request from this pull request's **Related PRs**, or say why no sample is affected.

## Code style

- TypeScript, ESLint via `@thunderid/eslint-plugin`, Prettier.
- Every source file carries a copyright header (`@thunderid/copyright-header` ESLint rule).
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
  react-router/     React Router integration
  tanstack-router/  TanStack Router integration
playgrounds/        Playground apps that exercise the SDKs from source (not published)
tests/e2e/          Playwright suite driving the quickstarts against a real ThunderID server
```

Inside a package, code is grouped by function, not by kind:

- Components (`react`, `vue`, `nextjs`, `nuxt`): `auth/` (sign-in, sign-up, recovery, invites, callback, plus
  `buttons/`, `flow/` for the flow renderers and `guards/` for `SignedIn`/`SignedOut`/`Loading`), `account/` (the
  signed-in user's own components), `management/` (management UI), `common/` (`Attribution`, `LanguageSwitcher`) and
  `primitives/`.
- Data layer (`javascript/src/api`, `react/src/{api,hooks}`, `vue/src/{api,composables}`, `nextjs/src/server/actions`):
  `auth/` for auth flows, `account/` for the `/users/me` endpoints, `management/` for the management APIs. Generic
  helpers stay at the root of their folder.
