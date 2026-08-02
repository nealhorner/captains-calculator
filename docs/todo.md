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

- [x] Migrate off `yarn` to `pnpm` (or `npm`) — regenerate lockfile, update `package.json` scripts/engines, update CI workflow (`.github/workflows/`), and update any docs/README referencing `yarn` commands

### Runtime Upgrade

- [x] Migrate to Node 26 — updated `engines` in `package.json`, `.nvmrc` (no Dockerfile present), and `node-version-file` in **both** `.github/workflows/ci.yml` job blocks (`checks` and `e2e`)

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

The project has testing libraries installed (`@testing-library/react`, `jest-dom`, `user-event`) and now has real coverage across unit, integration, and E2E layers.

- [x] Set up Vitest (replaces Jest after Vite migration)
- [x] Add unit tests for `ProductionNode` class (`src/state/recipes/ProductionNode.ts`) — see `ProductionNode.test.ts`
- [x] Add unit tests for key Overmind actions: `selectRecipe`, `calculateGraph`, `deleteNode`
- [x] Add unit tests for key Overmind action: `linkRecipe`
- [x] Add integration tests for the Editor flow (select product -> machine -> recipe -> link nodes) — see `src/state/recipes/editorFlow.test.ts`
- [x] Add smoke tests for each route/screen rendering without crashing — see `App.test.tsx` and `src/screens/app/screens.test.tsx`
- [x] Add Playwright E2E tests covering the main production-chain workflow (product -> building -> recipe -> results summary, plus localStorage persistence across reload) — see `e2e/production-chain.spec.ts`, run with `pnpm test:e2e`

Upgraded `@testing-library/react` (12 -> 16) and `@testing-library/user-event` (13 -> 14) as part of this work — they didn't support React 19's `createRoot`-based test rendering, which blocked any DOM-level test. This also closes the corresponding item under Phase 4.

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

- [x] **Found and fixed a real layout bug**: v7's Drawer/Modal `body` part is `display:block` by default (v4's was effectively a flex column filling available height). The app's custom `DrawerBody`/`DrawerBodyScrollArea` (`src/components/ui/DrawerBody.tsx`) relied on percentage-height resolving through that chain, so every drawer's scrollable list silently collapsed to 0px height (fully present in the DOM, invisible on screen). Fixed via `theme.ts`'s `Drawer` component styles (flex column + `flex: 1` body) plus updating `DrawerBody` to use `flex: 1 1 auto; min-height: 0` instead of a hardcoded `calc(100% - 77px)`.
- [x] **`~59` pre-existing TypeScript errors** — resolved down to 14 (all in framer-motion's `AnimatePresence`/`motion.div` children typing, tracked separately under "Other Dependency Upgrades" below as the `framer-motion` 3.x -> 11+ upgrade):
  - React 19 typing gap fixed — added `React.PropsWithChildren` to `DrawerBody.tsx`, `AnimatedList.tsx`, `PageLayoutBlank.tsx`, `PageLayout.tsx`, `StatsCard.tsx` (the `Calculator.tsx`/`NotFound.tsx` call-site errors cleared once the components they render were fixed).
  - `FieldRenderer.tsx` and the rest of `src/components/forms/` (`FormInline.tsx`, `FormDrawer.tsx`, `PhoneField.tsx`, `_types.ts`) plus `src/utils/forms.ts` — turned out to be ~1,655 lines of dead code with zero callers anywhere in the app (leftover generic-form boilerplate unrelated to the calculator). Deleted rather than fixed, and removed the now-unused `formik` dependency along with it.
  - `src/state/recipes/testFixtures.ts` and `ProductionNode.test.ts` fixture objects — fixed by casting the empty fixture (`{}`) to `ProductRecipes`, matching the existing `{} as ProductRecipes` pattern already used in `getInputSources.ts`/`getOutputTargets.ts`.
  - `ImportExportMenu.tsx` — `importGraph(data)` "expected 0 arguments" was an Overmind action-typing bug: a payload typed as bare `unknown` is structurally assignable to `void` (an unknown-accepting function is a supertype of a void-accepting one), which collapses Overmind's bound-action type to a zero-arg function. Fixed by typing the action's payload as a concrete `UnknownJson` union (`src/state/recipes/actions/importGraph.ts`) instead of `unknown`.
- [x] **Browser verification via real simulated clicks** — re-verified with actual `left_click` calls (not direct prop invocation) through the full target-product → building → recipe flow across `ProductSelectDrawer`, `BuildingSelectDrawer`, and `RecipeSelectDrawer`. All three drawers open, scroll, and select correctly with real clicks; the earlier "clicks don't reach React's handler" issue did not reproduce. The production chain summary populated correctly at the end of the flow.
- [x] **Visual diff pass** — re-checked Drawers (all three selection drawers), Cards, the recipe node card, React Flow graph controls, and the results summary panel in both light and dark mode; all rendered correctly with no visual regressions from the v4 look.

### react-flow-renderer -> @xyflow/react

- [x] Rename `react-flow-renderer` (deprecated) to `@xyflow/react` — the package was renamed twice (`react-flow-renderer` v10 → `reactflow` v11 → `@xyflow/react` v12); installed `@xyflow/react@12.11.2` (the current major; smart-edge itself now requires `>=12`)
- [x] Update custom node/edge type APIs (`RecipeNodeType.tsx`, `RecipeEdgeType.tsx`)
- [x] Verify `@tisoap/react-flow-smart-edge` compatibility or find alternative — upgraded to `4.13.1`, which targets `@xyflow/react` directly
- [x] Update Dagre layout integration for new React Flow API — sizing now reads `node.measured` instead of the old `node.width`/`node.height`

### Other Dependency Upgrades

- [ ] `framer-motion` 3.x -> 11+ (currently pinned to exact `3.10.6` — likely a compat hack)
- [x] `formik` 2.x — removed. Its only consumers (`src/components/forms/` and `src/utils/forms.ts`) were dead code with no callers anywhere in the app; deleted rather than upgraded/replaced.
- [ ] `yup` 0.x -> 1.x (breaking changes in schema API)
- [ ] `@iconify/react` 3.x -> 4.x
- [x] `@testing-library/react` 12 -> 16+ (done in Phase 3, was blocking React 19 DOM tests)
- [ ] `dagre` 0.8.5 — check if still maintained, consider `@dagrejs/dagre` or `elkjs` exclusively
- [ ] `dayjs` 1.10 -> 1.11+ (minor)
- [ ] Audit all dependencies for necessity and currency — check `package.json` for unused packages (beyond Phase 1's dead-weight pass) and compare installed vs. latest versions across the full dependency tree (known-CVE scanning is covered separately by the security audit item in Phase 8)

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

## Phase 8 — Untracked Gaps (from follow-up audit, 2026-08-01)

### Crash Risk

- [ ] Wrap `JSON.parse(settings)` in `src/state/app/effects/loadLocaStorageSettings.ts` in a try/catch — unlike the sibling `loadGraphState.ts`, corrupted or manually-edited `app-settings` localStorage throws uncaught on every app boot, causing a full white-screen crash with no recovery
- [ ] React Error Boundary — see Phase 5's "Add a React Error Boundary" item (canonical, not duplicated here)

### CI

- [ ] Add `pnpm typecheck` to `.github/workflows/ci.yml` — CI currently runs `format:check`, `lint`, and `test:ci` but never type-checks, so TS errors can merge to `main` silently mid-migration

### Data Integrity

- [ ] Validate imported JSON chains against the real `RecipeIODictInput`/`RecipeIODictOutput` shapes in `src/state/recipes/actions/importGraph.ts` / `importExport.ts` — current validation only checks `typeof === 'object'`, so a malformed export can pass validation and fail later
- [ ] Add a schema/version field to the values stored under the `production-graph` and `app-settings` localStorage keys (the export format already has one) so a future state-shape change has a migration path instead of silently loading stale/incompatible data

### Repo Hygiene

- [ ] Remove or relocate `notes.txt` (41KB) and `parse.js` (11KB, hardcoded local paths) from repo root — unreferenced scratch/migration leftovers
- [ ] Add a `LICENSE` file and `CONTRIBUTING.md` — app is publicly hosted at captains-calculator.com with neither

### Untracked Categories

- [ ] Add error-tracking/monitoring (e.g. Sentry) for production crash visibility — today `console.error` is the only mechanism
- [ ] Evaluate i18n needs — all UI strings are hardcoded English with no i18n framework in place
- [ ] Evaluate mobile/responsive support for the three-panel Editor layout — `useMediaQuery` is used in `FieldRenderer.tsx` only; the core editor has no mobile adaptation
- [ ] Run a security audit — `yarn audit`/`npm audit` for known CVEs in dependencies, review localStorage-persisted data for sensitive content, check for XSS vectors in user-provided graph data (import/export)

---

## Notes

- The `captain-of-data/` git submodule is the source of truth for game data. Any data schema changes there ripple through the branded types (`ProductId`, `RecipeId`, etc.) — keep that coupling in mind during upgrades.
- The branded-type pattern (`type MachineId = keyof typeof machineData`) is clever for type safety but **blocks lazy-loading** since the JSON must be statically imported for TypeScript to extract keys. A migration to runtime validation (Zod schemas, ironically) would decouple types from imports.
- Overmind's `derived()` memoization is doing heavy lifting — the `nodesData` and `edgesData` derivations avoid redundant React Flow re-renders. Don't lose this during any state management migration.
