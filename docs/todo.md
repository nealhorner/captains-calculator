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

- [x] Replace `createStyles()` with CSS Modules or Mantine's new `classNames` API
- [x] Replace `sx` prop usage with `style` prop or CSS variables
- [x] Update all component imports (many were renamed/removed between v4-v7)
- [x] Replace `@mantine/modals` and `@mantine/notifications` with v7 equivalents
- [x] Remove Emotion dependency (Mantine v7 dropped CSS-in-JS)

**Gaps / follow-ups from this migration:**

- **Found and fixed a real layout bug**: v7's Drawer/Modal `body` part is `display:block` by default (v4's was effectively a flex column filling available height). The app's custom `DrawerBody`/`DrawerBodyScrollArea` (`src/components/ui/DrawerBody.tsx`) relied on percentage-height resolving through that chain, so every drawer's scrollable list silently collapsed to 0px height (fully present in the DOM, invisible on screen). Fixed via `theme.ts`'s `Drawer` component styles (flex column + `flex: 1` body) plus updating `DrawerBody` to use `flex: 1 1 auto; min-height: 0` instead of a hardcoded `calc(100% - 77px)`. Worth double-checking any other custom component that assumes percentage-height Mantine internals if more v7 upgrades land.
- **`~59` pre-existing TypeScript errors remain** (verified unrelated to Mantine, left untouched as out of scope for this task):
  - React 19 typing gap — many components use `React.FC` and destructure `children` without `PropsWithChildren`, so `children` isn't a recognized prop under React 19's stricter types (e.g. `DrawerBody.tsx`, `AnimatedList.tsx`, `PageLayoutBlank.tsx`, `StatsCard.tsx`, `Calculator.tsx`, `NotFound.tsx`). This predates the Mantine work and should be tracked as its own "React 17 -> 19+" follow-up (that phase is marked done above but didn't cover this).
  - `FieldRenderer.tsx` — Formik generic type errors (`FormikErrors<T>` not assignable to `ReactNode`) and a few implicit-`any` params, unrelated to the `createStyles` removal done here.
  - `src/state/recipes/testFixtures.ts` and `linkRecipe.test.ts` — fixture objects missing the 220+ keys of `ProductRecipes`; predates this branch.
  - `ImportExportMenu.tsx` — `importGraph(data)` "expected 0 arguments" error; unrelated to the notification/icon prop renames made here.
- **Browser verification was done via direct React prop invocation (`props.onClick(...)`) rather than the automation tool's simulated mouse clicks** — real `left_click` calls on Drawer trigger buttons were unreliable in the sandboxed browser tool for reasons that look tool-specific (hover/focus CSS applied, but the click event didn't reach React's handler), not a code issue. Worth a manual click-through in a real browser to be 100% sure, though the underlying rendering/state was confirmed correct.
- **Not covered by this pass**: verifying every Mantine component still uses its intended `variant`/`color` visuals pixel-for-pixel against the old v4 look (spot-checked Drawers, Cards, Select, Tabs, AppShell, dark/light toggle — looked correct — but a full visual diff wasn't done).

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
