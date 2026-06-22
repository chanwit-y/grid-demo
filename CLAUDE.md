# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `bun run dev` — start the Vite dev server with HMR
- `bun run build` — type-check (`tsc -b`) then build for production with Vite
- `bun run lint` — run ESLint over the repo
- `bun run preview` — preview the production build

This project uses **bun** (`bun.lock`). There is no test runner configured.

## What this is

A single-page POC: an **interactive CSS Grid editor**. The user adds/removes
grid items, drags to reorder them, tweaks per-breakpoint container and item
properties, previews the layout at four breakpoints, and inspects the generated
JSON config + CSS. There is no backend or routing — `App` renders one `<Grid />`
which renders `<Layout />`.

All meaningful code lives under `src/components/Layout/`. `src/components/common/`
holds presentational primitives (`cn`, `IconButton`, `Popover`, `CodeViewer`).

## Architecture

### State: one Zustand store

`gridStore.ts` is the single source of truth — grid data (`items`,
`containerSettings`), drag state (`activeId`), and UI state (`selectedItemId`,
`settingsTarget`, `popoverAnchor`, `previewBreakpoint`). Components subscribe via
selectors (`useGridStore((s) => ...)`); helper hooks `useSelectedItem` /
`useActiveItem` derive the current item. **Mutations go through store actions,
never local component state.**

### Responsive data model

Every styleable property is a `Responsive<T>` = `Record<'xs'|'sm'|'md'|'lg', T>`
(`types.ts`). Container and item settings are objects of these responsive maps.
`breakpoints.ts` is the canonical breakpoint list (`BREAKPOINTS`) with min-widths
and preview widths; `MAX_GRID_COLUMNS` (12) is the hard cap enforced by
`clampColumns` / `clampSpan`. Edits flow through `gridSettings.ts`
(`updateContainerBreakpoint` / `updateItemBreakpoint`), which clamp numeric keys
and write a single breakpoint immutably.

### Rendering: generated CSS, not inline styles

`gridStyles.ts#generateGridStyles` turns the store data into a CSS string that
`Layout.tsx` injects via a `<style>` tag. Each layout gets a unique class prefix
(`gl-<id>` for the container, `gi-<itemId>` per item) derived from `useId()` and
sanitized by `escapeClassName` (`utils.ts`). Two output modes:
- **Preview mode** (a `previewBreakpoint` is passed): emits only that one
  breakpoint's rules, so the canvas shows exactly that size.
- **Full mode** (no breakpoint): emits base `xs` rules plus `min-width` media
  queries, and **only re-emits rules that actually change** at each breakpoint.

`gridConfig.ts` produces the serializable JSON shown in the code panel,
collapsing responsive values to a scalar when all breakpoints are equal.

### Drag & drop

`@dnd-kit` (`core` + `sortable`). The `DndContext` / `SortableContext`
(`rectSortingStrategy`) live in **`GridCanvas`** — a `memo`'d component inside
`Layout.tsx`, not inline in `Layout` itself (see Performance below for why).
`GridItem.tsx` uses `useSortable` with a dedicated drag-handle activator.
Reordering commits via `moveItem` (uses `arrayMove`). A `DragOverlay` renders
`GridItemOverlay` for the floating item.

### FLIP animations — the subtle part

Property/breakpoint changes animate via a FLIP technique that spans the store and
React, because animation needs DOM refs/effects the store can't hold:

1. `useGridFlipAnimation.ts` (a hook in `Layout.tsx`) owns `gridRef` / `frameRef`
   and registers `{ capture, schedule }` callbacks into the store as an
   **`AnimationBridge`** (`setAnimator`).
2. Store data actions wrap mutations in an internal `animated()` helper:
   `capture()` snapshots positions → mutate → `schedule()` plays the animation.
   The `changedItemId` arg (`'all'` or an id) drives a content opacity fade.
3. `gridAnimation.ts` does the work: `captureGridSnapshot` records rects;
   `playGridFlipAnimation` waits two `requestAnimationFrame`s for React to commit,
   then FLIPs each `[data-grid-item]` using positions measured **relative to the
   container** (so it stays correct while the preview frame resizes). New items
   get an enter animation; `playFrameResizeAnimation` animates the preview frame
   width on breakpoint changes.

Reordering drags are the exception — dnd-kit animates those itself, so `moveItem`
does **not** go through `animated()`. All animations respect
`prefers-reduced-motion`.

`updateItem` / `updateContainer` take an `animate` flag (default `true`).
Text-`input` edits in `ResponsivePropertyForm` pass `animate: false` so live
typing updates the grid (CSS transitions smooth `gap`/columns) **without** a JS
FLIP per keystroke; discrete controls (`select`, `span-buttons`) pass `true`.

### Performance — what's load-bearing

The render/animation path was tuned for ~100 items; a few non-obvious things
are doing real work and must not be casually undone:

- **`GridCanvas` is `memo`'d and excludes `previewBreakpoint` / popover state
  from its props.** This is the main re-render win. `memo(GridItem)` alone does
  **nothing**: `useSortable` re-renders every item via dnd-kit's `DndContext`
  whenever `Layout` re-renders, so the only way to skip the 100-item re-render
  on a breakpoint switch is to keep the whole dnd-kit subtree from re-rendering.
  Sensors are created **inside** `GridCanvas` (not passed as a prop) because an
  unstable `sensors` array would break the memo.
- **`sortableIds` is a `useMemo` keyed on the id *sequence*** (joined string),
  not `items.map(i => i.id)` inline — an inline array changes identity every
  render and churns `SortableContext`.
- **The code panel's `fullGridCss` + `gridConfigJson` are only computed when
  `settingsTarget === 'code'`** (`computeCode`), not on every edit.
- **Known ceiling:** per-item edits and selection still re-render all items
  (dnd-kit context); `memo` can't fix that. Only virtualization / dropping
  `useSortable` would, and neither is in place.

`perf.ts` is a **dev-only** profiling harness (stripped from prod via
`import.meta.env.DEV`): `measure()` wraps the hot paths (`generateGridStyles`,
the FLIP play pass), `?seed=N` seeds N items on load, `Layout` wraps the tree in
a React `<Profiler>` logging commit times, and `gridStore.ts` exposes
`window.__gridStore` for scripted benchmarks. All log to the console with a
`[perf]` prefix.

### Settings UI

The `Popover` (anchored to a clicked button's `DOMRect`) shows one of three
panels keyed by `settingsTarget`: `ContainerSettingsPanel`, `ItemSettingsPanel`
(both in `SettingsPanel.tsx`, both rendering the shared
`ResponsivePropertyForm`), or the `CodeViewer` (`'code'`). The form fields are
data-driven by `gridProperties.ts` (`containerResponsiveFields` /
`itemResponsiveFields`), each declaring a `type` (`text` / `select` /
`number-select` / `span-buttons`).

## Conventions

- **Styling is Tailwind v4** (via `@tailwindcss/vite`, configured in CSS, no
  `tailwind.config.js`). Compose conditional classes with `cn()` from
  `common/`. Note Tailwind's `!` important modifier is used inline (e.g.
  `h-6!`).
- **TypeScript is strict-ish**: `noUnusedLocals`/`noUnusedParameters` are on, and
  `verbatimModuleSyntax` requires `import type` for type-only imports.
- Icons come from `lucide-react`.
- When adding a new grid property: add it to the `Responsive` shape in
  `types.ts` (+ defaults), handle clamping in `gridSettings.ts`, emit CSS in
  `gridStyles.ts`, and declare the form field in `gridProperties.ts`.

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->