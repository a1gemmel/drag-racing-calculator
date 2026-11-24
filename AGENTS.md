# AGENTS.md

Context for coding agents working in this repository. Last surveyed 2026-11-24.

## Purpose

Transmission Ratio Viz is a **frontend-only gearing calculator / visualizer** for car people.
A user searches for and picks a transmission (built-in catalog; text search over manufacturer, model,
variant, vehicle brand and ratios, plus a manufacturer/brand filter), enters tire diameter, rear axle ratio
and an RPM range or shift point, and gets:

- a **road speed vs RPM** chart with one line per gear (SVG, hand-rolled, hover tooltips),
- in "Shift Point" mode (the default), the RPM drop after each upshift (dashed connectors + labels),
- a **gearset overview** table (ratio, % step from previous gear, top speed at max RPM),
- a **cruising RPM** table (RPM per gear at 10–80 mph).

The production output is a single self-contained `index.html` (JS + CSS inlined) that runs from disk
with no network or API.

## History

1. `46a94a6`–`a22a6f2`: initial LLM scaffold — React frontend + Python FastAPI backend, Bazel with
   `rules_python`, `rules_pkg`, `rules_oci` (container image). See `git show a22a6f2:PLAN.md` for
   the original, much larger roadmap (persistence, share URLs, auth, OCI, typed RPC).
2. `f7e3543` "Checkpoint before refactor to remove backend": catalog moved into the backend, App grew.
3. `1a8d6bd` "Remove Python backend": backend, Python tests and OCI deleted; catalog and
   calculations ported to TypeScript; Vite plugin inlines assets into one HTML file.
4. Bazel removed (2026-11-24): npm + Vite only; artifact check moved to `frontend/scripts/`.

## Layout

```
.nvmrc               Node 20.18.1
.envrc               direnv: puts env/bin on PATH
env/bin/             shims: node/npm/npx/nvm via repo-local nvm in env/nvm (auto-installed)
frontend/
  index.html         bare: <div id=root> + module script (no doctype/title/charset)
  package.json       scripts: dev, build (tsc -b && vite build && artifact check), test (vitest)
  package-lock.json  the only lockfile
  vite.config.ts     React plugin + custom `inlineAssets` plugin (inlines JS/CSS, deletes other bundle files)
  scripts/check-artifact.mjs  asserts dist/ is only index.html, no external script/link refs, app name present
  src/main.tsx       React 18 root
  src/App.tsx        app state, Race/Crawl shell, sidebar, stats strip, ratio ladder + cruising tables
  src/components/GearChart.tsx   SVG RPM-vs-speed chart (legend, shift drops, hover crosshair/tooltip)
  src/components/CrawlView.tsx   crawl ratio hero + gear × range matrix (manual low-range ratio for now)
  src/components/NumberField.tsx numeric input: local draft, commits on blur/Enter, reverts invalid values
  src/components/Segmented.tsx   radio-group segmented control (arrow keys)
  src/components/TireField.tsx   tire input: diameter (used as entered) or size (275/55R15, 35x12.50R17)
  src/tires.ts       parseTireSize; ROLLING_DIAMETER_FACTOR = 0.97 applied to size-derived diameters only
  src/catalog.ts     typed transmission catalog (TransmissionFamily -> variants -> gear_ratios)
  src/calculations.ts pure math: totalRatio, speedMph, rpmForSpeed, gearSpeeds
  src/calculations.test.ts  vitest (4 tests)
  src/transmissionSearch.ts  pure filtering: scope (All/manufacturer/brand) + text query; resolveSelection fallback
  src/transmissionSearch.test.ts
  src/catalog.test.ts  catalog invariants
  src/styles.css     design tokens + all styles; accent switches per mode via .app[data-mode]
```

## Commands

```bash
direnv allow                         # or: export PATH="$PWD/env/bin:$PATH"
cd frontend && npm ci
npm run dev                          # vite dev server
npm test                             # vitest
npm run build                        # -> frontend/dist/index.html, then artifact check
```

## Domain

```
road_speed_mph = rpm * tire_diameter_in * pi / (trans_ratio * axle_ratio * Π transfer_ratios * 1056)
```

Units are imperial only (inches, mph). Transfer-case stages are supported by the math but **not wired
into the UI**.

## Known issues / tech debt (found during survey)

Build & tooling
- No CI and no deploy pipeline yet; no lint/format tooling.
- No git remote; only branch is `master`.

App behavior
- No error boundary.
- Reverse ratio exists in catalog but is unused.
- `gearSpeeds` in calculations.ts is unused by the app.

Data
- Catalog (2026-11-24): TKX, T5 (24 NWC/WC variants), T56, T56 Magnum, NV3500, NV4500, Aisin
  L43/L45/L50/W56, Muncie M20 — 56 variants. Each variant has an optional `source` citation; only the
  four Aisin entries still lack one. TKX wide-ratio sets fixed to 3.27/1.98/1.34/1.00/0.72.
- Public sources disagree on several values (T5 Ford 5.0 year breaks and ODs, NV4500 reverse ratios,
  T56 Cobra 5th gear). Choices made are documented per entry in `source` strings; treat these as the
  first entries to re-check if a user reports a wrong ratio.
- Not yet covered: TR6060 (public data unreliable), T5 AMC/Jeep XJ, NV3550.
- `src/catalog.test.ts` enforces invariants: unique model names, unique variant names per family,
  positive ratios, strictly descending forward ratios, no `::` in names (App.tsx uses it as a key separator).

## Roadmap

See `PLAN.md` (current, post-backend) for the checklist: export/import builds, editable gearsets,
multiple transfer-case stages, R/N/OD in chart, unit + tire-size conversion, browser smoke tests,
accessibility. Deferred: quarter-mile sim, torque curves, comparison/sharing.

## Conventions for agents

- Keep the app backend-free and the build a single offline HTML file; `scripts/check-artifact.mjs` guards this.
- Keep math pure in `calculations.ts` with vitest coverage; UI in React.
- Don't reintroduce Bazel or a second lockfile.
- Use the repo shims (`env/bin`) so the Node version matches `.nvmrc`.

## Owner decisions (2026-11-24)

- **Audience: public hobby site** for car enthusiasts. UX, accessibility, mobile and data accuracy matter.
- **Backend removal committed** as `1a8d6bd` — frontend-only is the baseline.
- **Bazel dropped**: plain npm + Vite; `package-lock.json` is the only lockfile. The Bazel artifact
  test became `frontend/scripts/check-artifact.mjs`, run at the end of `npm run build`.
- **Catalog data: research & cite.** Look up ratios from public manufacturer/supplier specs and set
  the `source` field on every variant. Don't add a variant without a source.

- **Two app modes:** Race (shift points, road speed, quarter mile) and Crawl (crawl ratio, transfer-case
  catalog incl. stacked doublers, gear × range matrix).
- **Power input methods** (for the quarter-mile sim): (1) car weight + 1/4-mile trap MPH estimate,
  (2) peak HP/torque @ RPM, (3) dyno table, with CSV/paste import feeding the same table.
- **Quarter-mile sim: mid-fidelity** — weight, drivetrain loss, traction limit, aero drag, rolling
  resistance, shift time. Outputs ET, trap, 60 ft, speed/RPM vs time.
- **Visual redesign: full freedom.**
- **Tire rolling correction (3%) applies to size mode only;** a typed diameter is used as entered.

## Open questions for the owner

- Hosting target (GitHub Pages, Netlify, Cloudflare Pages, …)? Determines CI/deploy setup.
- Units: imperial only, or metric too? Tire input as diameter or tire size (e.g. 265/70R17)?
- Priority order for PLAN.md product work.
- Which transmissions to add to the catalog (and transfer cases / axles)?
- Repo directory name is misspelled (`transmssion`); rename intended?

## Design system (2026-11-24 redesign)

- Dark only. Tokens live at the top of `styles.css`; chart surface is `--surface` #15181b.
- Gear colors: fixed order in `GEAR_COLORS` (App.tsx), the dark-mode categorical palette from the dataviz
  skill, validated for CVD separation against #15181b. Color follows the gear index — never reorder.
- Mode accent: Race #ff5a36, Crawl #3ec9a7. UI chrome only; never use the accent for data marks.
- Text in charts uses text tokens, never series colors. System font stacks only (single offline file).
