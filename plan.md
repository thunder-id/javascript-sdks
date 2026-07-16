# Refactor Plan: Split `@thunderid/svelte` → Core Lib + SvelteKit

## Goal
Align with the spec's 4-layer architecture. Extract SvelteKit SSR code from `packages/svelte` into a new `packages/sveltekit` package.

## Target Dependency Tree
```
Browser SDK ──→ @thunderid/svelte (CSR Core Lib) ──→ @thunderid/sveltekit (SSR)
                                                             ↑
Node SDK (re-exports JavaScript SDK) ────────────────────────┘
```

## Phase 1: Strip `packages/svelte` to CSR-only

- Remove `src/server/` directory (moves to sveltekit)
- Remove `src/api/` directory (moves to sveltekit)
- Remove `@thunderid/node` from dependencies
- Remove `@sveltejs/kit` from peerDependencies
- Replace `@thunderid/node` type imports with `@thunderid/browser` equivalents
- Strip SSR branches from `ThunderIDSvelteClient.ts`
- Remove `rehydrateSessionFromPayload()` method
- Update package.json exports (no `./server` subpath)
- Update tests

## Phase 2: Create `packages/sveltekit`

- Name: `@thunderid/sveltekit`
- Server code uses `ThunderIDJavaScriptClient` from `@thunderid/node` (no `_validateMethod()` issue, no browser deps)
- Imports shared types from `@thunderid/svelte`
- Dependencies: `@thunderid/svelte`, `@thunderid/node`, `jose`
- Peer dependencies: `@sveltejs/kit`, `svelte`
- Exports: `"."` (re-exports CSR SDK), `"./server"` (hooks, routes, session, guard, config)

## Phase 3: Update sample apps

- `apps/svelte-playground` → switch imports from `@thunderid/svelte/server` to `@thunderid/sveltekit/server`
- `apps/svelte-csr-playground` → no changes

## Phase 4: Workspace registration

- Add `packages/sveltekit` to `pnpm-workspace.yaml`

## Phase 5: Build & test

- `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`
- End-to-end test: SSR playground sign-in flow, CSR playground sign-in flow
