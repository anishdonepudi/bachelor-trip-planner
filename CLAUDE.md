# CLAUDE.md

## Workflow

### 1. Scope First
Before any code changes, research and understand the full scope of the task:
- What needs to change
- All files and components affected
- How they connect and depend on each other

### 2. Work in a Worktree
All code changes must be made in a git worktree (Agent tool with `isolation: "worktree"`) based on the current working branch. Never make direct edits to the working tree. If a specific branch is provided, base the worktree from that branch instead.

**Worktree verification** — After creating a worktree, always verify the base branch is correct by running `git log --oneline -3` in the worktree. The commits should match the intended base branch (usually the current working branch), not a stale or unrelated branch. If it's wrong, delete the worktree and recreate it from the correct branch.

### 3. Use Skills When Relevant
- **UI/UX enhancements** — Use the `ui-ux-pro-max` skill for design decisions and implementation
- **Performance work** (algorithms, queries, runtime) — Use `optimization-suite` performance tools:
  - `ln-810-performance-optimization-coordinator` — Coordinates algorithm, query, and runtime workers in parallel
  - `ln-811-algorithm-optimizer` — Optimizes algorithms via benchmark/research/hypothesize loop
  - `ln-812-query-optimizer` — Fixes N+1 queries, redundant fetches, over-fetching
  - `ln-813-runtime-optimizer` — Fixes blocking IO, unnecessary allocations, sync-in-async
- **Dependency upgrades** — Use `optimization-suite` dependency tools:
  - `ln-820-dependency-optimization-coordinator` — Coordinates dependency upgrades across package managers
  - `ln-821-npm-upgrader` — Upgrades npm/yarn/pnpm dependencies with breaking change handling
  - `ln-822-nuget-upgrader` — .NET NuGet packages
  - `ln-823-pip-upgrader` — Python pip/poetry/pipenv
- **Code modernization** (OSS replacement, bundle size) — Use `optimization-suite` modernization tools:
  - `ln-830-code-modernization-coordinator` — Coordinates OSS replacement and bundle optimization
  - `ln-831-oss-replacer` — Replaces custom modules with OSS packages
  - `ln-832-bundle-optimizer` — Reduces JS/TS bundle size via unused deps, tree-shaking, code splitting

### 4. Test and Verify
After implementing changes, test and verify before merging:
- **Programmatic** — Run type-checks, tests, and linting. For new endpoints or algorithms, run example tests against them and validate the results are correct. If anything fails, fix the issue and re-test.
- **Visual/interactive** — If the change requires the user's eyes (UI changes, layout, etc.), start the dev server in the worktree and provide the URL so the user can review.
- **Before starting a dev server** in a worktree, rebase/merge the working branch into the worktree branch so it has the latest changes. Also copy any gitignored runtime files (e.g. `.env.local`) from the main working tree.
- **After starting a dev server**, open it in the browser with `start http://localhost:<port>`.

### 5. Merge Back and Clean Up
- **Major changes** (multi-file refactors, new features, UI redesigns, data model changes) — require user approval before merging. Start the dev server in the worktree, provide the URL, and wait for the user to confirm before proceeding.
- **Minor changes** (bug fixes, 1-2 line tweaks, config updates) — can be merged after programmatic verification passes.

Once approved/verified:
- Merge the worktree changes back to the working branch
- **Commit but never push** — the user will push when ready
- Delete the worktree and its branch after merging
