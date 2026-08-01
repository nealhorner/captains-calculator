# Tech Debt Audit — Captain's Calculator

> Audit date: 2026-04-02

---

## Phase 1 — Dead Weight Removal (Quick Wins)

- [x] **Remove `zod`** — installed but never imported anywhere. Yup handles all validation (`src/utils/forms.ts`).
- [x] **Remove `xstate` + `@xstate/react`** — installed but never imported. Overmind is the sole state manager.
- [x] **Remove `"install": "^0.13.0"`** from devDependencies — not a real package, likely an accidental `npm install` artifact.
- [x] **Remove `react-error-overlay` pin** — both the devDependency and the `resolutions` entry exist only as a CRA workaround. Goes away with the Vite migration.
- [x] **Strip debug `console.log` calls** left in production code:
  - `src/components/calculator/Editor.tsx` — `console.log('onConnect')`
  - `src/components/calculator/RecipeNodeType.tsx` — `console.log(nodeId)`
- [x] **Resolve `@TODO` in `src/state/recipes/actions/linkRecipe.ts`** (line 32) — incomplete "Create New Node" logic.

---

## Phase 2 — Build System & Core Upgrades (Critical)

### Package Manager Migration

- [ ] Migrate off `yarn` to `pnpm` (or `npm`) — regenerate lockfile, update `package.json` scripts/engines, update CI workflow (`.github/workflows/`), and update any docs/README referencing `yarn` commands

### CRA to Vite Migration

- [x] Replace `react-scripts` with `vite` + `@vitejs/plugin-react`
- [x] Convert `tsconfig.json` to Vite-compatible config (keep `baseUrl: "./src"` via `vite-tsconfig-paths`)
- [x] Move `public/index.html` to root `index.html` (Vite convention)
- [x] Replace `react-scripts start/build/test` scripts with `vite` / `vite build` / `vitest`
- [x] Remove CRA-specific env var prefix (`REACT_APP_` -> `VITE_`)
- [x] Extract hardcoded Google Analytics ID (`public/index.html`) into an env variable

### React 17 -> 19+

- [x] Upgrade `react` and `react-dom` to 19
- [x] Replace `ReactDOM.render()` with `createRoot()` in `src/index.tsx`
- [x] Verify Overmind + Mantine compatibility with React 19 concurrent mode
- [x] Update `@types/react` and `@types/react-dom` to 19

### TypeScript 4.9 -> 7.x

- [x] Upgrade `typescript` to `6.0.3` (staging step towards 7.x — see below)
- [ ] Upgrade `typescript` to latest 7.x — blocked: `eslint-plugin-jest` (via `eslint-config-react-app`) eagerly requires `@typescript-eslint/type-utils`, which crashes on TS 7's restructured API (`ts.TypeFlags` missing). `typescript-eslint`'s own peer-dep range excludes `typescript@7` until they ship a new API in 7.1 (~Oct 2026). Revisit once that lands.
- [x] Update `tsconfig.json` target from `es2015` to `es2020` or `esnext` (smaller output, modern features)
- [x] Audit and fix any new strict-mode errors introduced by TS 6 (`baseUrl` → `paths`, `moduleResolution: node` → `bundler`, framer-motion type shim — all still needed for the eventual TS 7 jump too)

---

## Phase 3 — Test Coverage

The project has testing libraries installed (`@testing-library/react`, `jest-dom`, `user-event`); test coverage is still minimal but no longer zero — see `src/state/recipes/actions/linkRecipe.test.ts`.

- [x] Set up Vitest (replaces Jest after Vite migration)
- [ ] Add unit tests for `ProductionNode` class (`src/state/recipes/ProductionNode.ts`) — it's the core domain logic
- [ ] Add unit tests for key Overmind actions: `selectRecipe`, `calculateGraph`, `deleteNode`
- [x] Add unit tests for key Overmind action: `linkRecipe`
- [ ] Add integration tests for the Editor flow (select product -> machine -> recipe -> link nodes)
- [ ] Add smoke tests for each route/screen rendering without crashing

---

## Phase 4 — UI Library & Dependency Upgrades (High)

### Mantine v4 -> v7

This is a large migration. Mantine v7 is a near-full rewrite.

- [ ] Replace `createStyles()` with CSS Modules or Mantine's new `classNames` API
- [ ] Replace `sx` prop usage with `style` prop or CSS variables
- [ ] Update all component imports (many were renamed/removed between v4-v7)
- [ ] Replace `@mantine/modals` and `@mantine/notifications` with v7 equivalents
- [ ] Remove Emotion dependency (Mantine v7 dropped CSS-in-JS)

### react-flow-renderer -> @xyflow/react

- [ ] Rename `react-flow-renderer` (deprecated) to `@xyflow/react` (v11+)
- [ ] Update custom node/edge type APIs (`RecipeNodeType.tsx`, `RecipeEdgeType.tsx`)
- [ ] Verify `@tisoap/react-flow-smart-edge` compatibility or find alternative
- [ ] Update Dagre layout integration for new React Flow API

### Other Dependency Upgrades

- [ ] `framer-motion` 3.x -> 11+ (currently pinned to exact `3.10.6` — likely a compat hack)
- [ ] `formik` 2.x — evaluate replacing with `react-hook-form` (lighter, more actively maintained)
- [ ] `yup` 0.x -> 1.x (breaking changes in schema API)
- [ ] `@iconify/react` 3.x -> 4.x
- [ ] `@testing-library/react` 12 -> 16+
- [ ] `dagre` 0.8.5 — check if still maintained, consider `@dagrejs/dagre` or `elkjs` exclusively
- [ ] `dayjs` 1.10 -> 1.11+ (minor)

---

## Phase 5 — Architecture & Code Quality (Medium)

### Type Safety

- [ ] Eliminate `any` usage — 66 instances across the codebase
  - Priority: `src/state/recipes/state.ts` (lines 24, 29) — `Node<any>[]` and `Edge<any>[]` should use proper generics
  - Audit `src/components/forms/FieldRenderer.tsx` for loose typing

### State Management Patterns

- [ ] Replace `get currentItem()` getters with Overmind `derived()` — plain getters are not reactive in Overmind, components may miss updates
- [ ] Add error handling to `loadJsonData` and `loadSettings` actions — currently no error recovery if JSON loading fails
- [ ] Evaluate Overmind's long-term viability — it's maintained but niche. Zustand or Jotai are lighter alternatives if a rewrite happens

### Styling Consolidation

- [ ] Pick one styling approach and migrate everything to it. Currently three systems coexist:
  - SASS files (`src/theme/scss/`) — 144 lines of global styles + loader + typography
  - Mantine CSS-in-JS (`createStyles()`, `sx` prop) — used in ~6 components
  - Inline React styles — scattered throughout
- [ ] Post-Mantine v7 migration, CSS Modules or vanilla-extract would unify this

### Error Handling

- [ ] Add a React Error Boundary wrapping the app — currently a single component crash kills the whole app
- [ ] Add error states for data loading failures (products/recipes/machines JSON)

---

## Phase 6 — Performance & Bundle Optimization (Medium)

### Code Splitting

- [ ] Convert static JSON imports in `src/state/app/effects/loadJsonData.ts` to dynamic `import()` — all game data (products, recipes, machines, categories, mines, storages) is bundled in the initial chunk
- [ ] Lazy-load route screens with `React.lazy()` + `Suspense`
- [ ] Consider moving game data to a separate fetched JSON endpoint (decouples data updates from code deploys)

### React Performance

- [ ] Add `React.memo`, `useCallback`, `useMemo` where needed — only 7 instances across 126 TS files
  - Priority: `Editor.tsx`, `RecipeNodeType.tsx`, `ResultsSummary.tsx` (re-render on every graph change)
- [ ] Profile the React Flow graph with large production chains — Dagre layout recalculates on every node change

### Bundle Analysis

- [ ] Run `vite-bundle-analyzer` post-migration to identify large chunks
- [ ] Tree-shake unused Mantine components (CRA can't do this well)

---

## Phase 7 — Accessibility (Medium-Low)

- [ ] Add `aria-label` to icon-only buttons (especially navigation in `AppShellLayout.tsx`)
- [ ] Verify color contrast ratios for both light and dark themes
- [ ] Test keyboard navigation through the React Flow graph editor
- [ ] Add meaningful alt text or `role="img"` + `aria-label` to background images in `Editor.tsx`
- [ ] Audit Mantine component usage for missing ARIA attributes (only 18 ARIA instances found across codebase)

---

## Notes

- The `captain-of-data/` git submodule is the source of truth for game data. Any data schema changes there ripple through the branded types (`ProductId`, `RecipeId`, etc.) — keep that coupling in mind during upgrades.
- The branded-type pattern (`type MachineId = keyof typeof machineData`) is clever for type safety but **blocks lazy-loading** since the JSON must be statically imported for TypeScript to extract keys. A migration to runtime validation (Zod schemas, ironically) would decouple types from imports.
- Overmind's `derived()` memoization is doing heavy lifting — the `nodesData` and `edgesData` derivations avoid redundant React Flow re-renders. Don't lose this during any state management migration.
