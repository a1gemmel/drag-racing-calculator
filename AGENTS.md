# AGENTS.md

Context for coding agents working in this repository. Last surveyed 2026-11-24.

## Purpose

**Drag Racing Calculator** (formerly "Transmission Ratio Viz"; repo dir name unchanged) is a
**frontend-only drag-racing gearing and quarter-mile calculator** for car people.
A user searches for and picks a transmission (built-in catalog; text search over manufacturer, model,
variant, vehicle brand and ratios, plus a manufacturer/brand filter), enters tire diameter, rear axle ratio
and a shift point, and gets:

- a **road speed vs RPM** chart with one line per gear (SVG, hand-rolled, hover tooltips),
- the RPM drop after each upshift (dashed connectors + labels), or, with the chart's "Full range" toggle,
  every gear from 1,200 rpm (1st from 600) to the shift point,
- a **gearset overview** table (ratio, % step from previous gear, top speed at max RPM),
- a **cruising RPM** table (RPM per gear at 10–80 mph),
- **power input** (trap speed, peak numbers or dyno table) and a **quarter-mile simulation**
  (60 ft, splits, ET, trap, shifts, speed/RPM traces).

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
  src/App.tsx        app state, sidebar, stats strip, ratio ladder + cruising tables, power + quarter-mile cards
  src/components/GearChart.tsx   SVG RPM-vs-speed chart (legend, shift drops, hover crosshair/tooltip)
  src/components/NumberField.tsx numeric input: local draft, commits on blur/Enter, reverts invalid values
  src/components/Segmented.tsx   radio-group segmented control (arrow keys)
  src/components/TireField.tsx   tire input: diameter (used as entered) or size (275/55R15, 35x12.50R17)
  src/power.ts       power curves: torqueAt, synthesizeCurve (peaks), estimateFromTrap (Hale), parseDynoText, buildCurve
  src/quarterMile.ts simulateQuarterMile: 1 ms time-step point mass, traction limit with steady-state weight transfer,
                     effective-mass factor 1.04 + 0.0025·ratio², clutch launch, shift time, NHRA-style 66 ft trap
  src/components/PowerCard.tsx      PowerInputs (three power methods, dyno editor + CSV import) and PowerCurves (peaks, torque/HP charts)
  src/components/QuarterMileCard.tsx TractionInputs, CarInputs, ManualInputs and QuarterMileCard (results: tiles, traces, tables)
  src/components/Subgroup.tsx        titled block of inputs inside a card
  src/components/LineChart.tsx      generic single-axis line chart with crosshair tooltip
  src/offline.ts     "Download offline copy": captures the page before React renders (first import in main.tsx),
                     embeds current settings, saves as drag-racing-calculator.html via a Blob (no fetch)
  src/shareToken.ts  share links: whole setup <-> short versioned binary token in the URL fragment (FORWARD-COMPATIBLE, see below)
  src/shareToken.golden.json, src/shareToken.v*-schema.json  frozen fixtures guarding old tokens
  src/simplePass.ts  simple (phone) mode pass: constant wheel power, traction limit, no gears
  src/components/SimpleView.tsx  simple mode page: hp / weight / tires / 60 ft inputs, tiles, timeslip, speed chart
  src/appState.ts    AppSettings + DEFAULT_SETTINGS; parseSettings (type-checked merge over defaults),
                     embedSettings / readEmbeddedSettings (<script type="application/json" id="saved-settings">)
  src/automatic.ts   AutomaticSetup (converter, launch, lock-up, shift time, loss), defaults, launchRpm, lockedInGear
  src/customTransmissions.ts  CustomTransmission -> family under manufacturer "Custom"; customProblems validation
  src/components/CarTabs.tsx  car tabs over the setup cards ([+] copies the open car, rename, remove)
  src/components/InfoTip.tsx  small "i" tooltip (launch control)
  src/components/AutomaticPane.tsx  sidebar pane shown when an automatic is selected
  src/components/CustomTransmissionDialog.tsx  create / copy / edit / delete custom transmissions
  src/tires.ts       parseTireSize; ROLLING_DIAMETER_FACTOR = 0.97 applied to size-derived diameters only
  src/catalog.ts     typed transmission catalog (TransmissionFamily -> variants -> gear_ratios)
  src/calculations.ts pure math: totalRatio, speedMph, rpmForSpeed, gearSpeeds
  src/calculations.test.ts  vitest (4 tests)
  src/transmissionSearch.ts  pure filtering: scope (All/manufacturer/brand) + text query; resolveSelection fallback
  src/transmissionSearch.test.ts
  src/catalog.test.ts  catalog invariants
  src/styles.css     design tokens + all styles
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
road_speed_mph = rpm * tire_diameter_in * pi / (trans_ratio * axle_ratio * 1056)
```

Units are imperial only (inches, mph). `calculations.ts` still accepts optional extra ratio stages
(left over from the removed crawl mode); the UI doesn't use them.

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
  Automatics (v0.2.0-0.2.1): Powerglide, TH350, TH400, C4, C6, 4L60E, 4L80E, 8HP70, 8HP45, 727 TorqueFlite,
  545RFE, 65RFE, 10R80, 8L90, AOD (v0.5.0). Manuals added v0.5.0: Richmond Super T-10 (5 sets from Richmond's catalog;
  the 2.88 Y set has no published ratios, left out), Saginaw 4-speed (4 groove-count variants, Advance Adapters values;
  Chevy Hardcore differs by 0.01-0.04 on some 2nd/3rd gears, noted in `source`), Nissan CD009 (350Z/G35; no Nissan
  document found, enthusiast/spec sources agree on 3.794-0.794, reverse 3.446).
- v0.7.0 catalog round (owner list + a research pass): TR-9080 DCT, NAG1, 6L80, 200-4R; manuals TR6060 (13 sets), TR-6070,
  TR-3160, MT82 / MT82-D4, Muncie M21 / M22, Toploader, A833, BW T-10, Doug Nash 4+3 (overdrive off; OD ratio unsettled),
  ZF S6-40, W58, R154, V160 / V161, RX-7 5-speed, TY856, TY75, WRX 6-speed, TL70, Honda K- and B-series; automatics 6R80,
  A340E, A904, FMX, 700R4 / 4L60, 8HP90, 10L80 / 10L90 (the last three reuse 4L60E / 8HP70 / 10R80 gearsets). Weak (forum
  or vendor-only) sources are said so in `source`: ZF6, 4+3, V160/V161, Honda K/B, FC Turbo II 5th. Reverse unknown (null):
  Toploader, A833, MT82-D4. Skipped as unsourced: FC non-turbo, FB RX-7, Honda D-series, Jerico/Liberty, 8HP95.
- Renaming a variant: keep the old name in `formerNames` (resolveSelection matches it) so saved settings and share links still
  pick it; a catalog test checks every former name resolves. Never rename a family `model` (autoSetups and tokens key on it).
- Public sources disagree on several values (T5 Ford 5.0 year breaks and ODs, NV4500 reverse ratios,
  T56 Cobra 5th gear). Choices made are documented per entry in `source` strings; treat these as the
  first entries to re-check if a user reports a wrong ratio.
- Not yet covered: TR6060 (public data unreliable), T5 AMC/Jeep XJ, NV3550.
- `src/catalog.test.ts` enforces invariants: unique model names, unique variant names per family,
  positive ratios, strictly descending forward ratios, no `::` in names (App.tsx uses it as a key separator).

## Roadmap

See `PLAN.md` for the checklist: shift-point finder, hold-a-gear runs, editable gearsets, setup
comparison, metric units, browser smoke tests, accessibility.

## Automatic transmissions (v0.2.0)

Model (quarterMile.ts header has the equations): K-factor torque converter. Pump torque = (engine rpm / K)²
lb-ft with K = stall rpm / sqrt(engine torque at stall), so a held turbine stalls the engine exactly at the
stall speed. Torque ratio falls linearly from the stall torque ratio (SR 0) to 1.0 at the coupling point;
capacity falls to 65% of stall capacity there (K +24%), so rpm climbs from stall during the launch. Above
the coupling point pump torque falls linearly to zero at SR 1; the coupling point is solved so slip at WOT
at peak power equals the "converter slip" setting. Engine and turbine are separate inertias. Lock-up joins
them like a locked clutch in the gears the lock-up mode allows. Shifts are power shifts (2026-11-25, owner request): drive
continues for the shift time, multiplied by (1 - shiftLoss). Into an unlocked gear the converter absorbs the
rpm change; into a locked gear the shift clutches slip, pulling the engine down to the new gear's speed by the
end of the shift, and engine torque plus the released inertia torque drives the new gear (slip energy is lost).
Shift time is floored at one step for automatics so the inertia always goes through the clutches. Manuals
still coast with no drive for their shift time. Launch rpm: trans brake rpm or foot
brake rpm, both capped at stall (the turbine is held either way). Manual cars still search for the best
launch rpm; automatics use their setting, and the 60 ft tile says "est.".

Settings are per transmission: `autoSetups[model]` holds only the ones the user changed; otherwise the
catalog/custom defaults apply. The pane's Reset restores defaults.

### Executive decisions (2026-11-25, owner may tweak)

Sources: ratios are cited per variant in catalog.ts. Converter behaviour and defaults below are my
engineering choices; public converter sources give stall rules of thumb but not numeric curves.
- Converter model shape: constant-K multiplication phase replaced by capacity falling to 65% at the
  coupling point (COUPLING_CAPACITY in quarterMile.ts), linear torque-ratio fall, linear coupling phase.
  Coupling point clamped to SR 0.6-0.95 (dragzine: stator freewheels around SR ~0.8).
- Default stall torque ratio 2.0 for every automatic.
- v0.7.0 automatics: 200-4R like the TH350 (2800 stall, band shifts 0.20 s / 20%, 14% loss; lock-up clutch present,
  off at WOT like stock); 6L80 2800 stall, 5% slip, lock-up off, 0.18 s / 12% (clutch-to-clutch), 13% loss; NAG1 (Chrysler
  W5A580 gearset) 2800 stall, 6% slip, lock-up off, 0.20 s / 15%, 13% loss.
- Dual-clutch (v0.7.0): catalog `dualClutch: true` on a manual family (TR-9080). Clutch launch and best-launch search as a
  manual; upshifts take the automatic locked-gear power-shift path over `DCT_SHIFT_TIME_S` (0.08 s, quarterMile.ts) with
  no shift loss; the car's Shift time field is hidden. Custom transmissions can't be dual-clutch ("Copy as custom" gives a
  plain manual). C8 check (495 hp, 3,750 lb, 5.17, 27.3", 60% rear, Cd 0.32, performance street + launch control):
  11.23 @ 124.4 vs magazine ~11.2 @ 121-122.
- AOD (v0.5.0): 2800 stall, 6% slip, lock-up "top" (4th is a direct mechanical drive through the split-torque input
  shaft; 3rd's 60/40 mechanical split isn't modelled), 0.22 s / 15% shift loss, 15% loss (known for parasitic loss).
- v0.2.1 additions (same reasoning as the matching older units): 8HP45 like the 8HP70 but 11% loss; 727 like the
  TH400 (3000 stall); 545RFE/65RFE 2400 stall, 6% slip, lock-up clutch off, 0.22 s / 15% shift loss, 14% / 15%
  loss; 10R80 and 8L90 like the 8HP70 (2400 stall, 4% slip, lock-up 2nd & up, 0.15 s / 10%, 12% loss).
  RFE upshifts skip the 1.50 2nd prime (kickdown only); the 65RFE has a second variant with all six ratios (ERS).
- Default converter slip at WOT: 6% (old GM/Ford 3-speeds, 4L60E, 4L80E, Powerglide), 4% (8HP70).
- Default stall speeds (typical street/strip converter for each trans, not stock): Powerglide 4000,
  TH350 3000, TH400 3200, C4 3000, C6 3000, 4L60E 2800, 4L80E 2800, 8HP70 2400.
- Launch: trans brake by default, at the stall speed. Foot brake default holds 75% of stall (forums: a foot
  brake can't hold full stall; trans brake vs foot brake ~0.03-0.04 s on the 60 ft, which the sim reproduces
  at high grip).
- Lock-up: only 4L60E, 4L80E, 8HP70 have a lock-up clutch by default (Advanced can add one for converted
  units). Default mode off for 4L60E/4L80E (stock WOT unlocks), "2nd & up" for 8HP70.
- Shift time (power shift duration): 0.20 s Powerglide/TH350/TH400/C4/C6, 0.22 s 4L60E/4L80E, 0.15 s 8HP70.
- Shift loss (drive lost in the shift clutches during a shift): 20% Powerglide/TH350/TH400/C4/C6 (band and
  sprag shifts), 15% 4L60E/4L80E, 10% 8HP70 (clutch-to-clutch), 15% generic custom.
- Result, default car on 1.0 grip: Muncie 12.99 @ 110.8; old 3-speeds/Powerglide 12.89-12.92 @ 109.8-110.3;
  4L60E 13.19 @ 108.8; 4L80E 12.95 @ 109.4; 8HP70 12.65 @ 114.0 (lock-up 2nd+, 8 close ratios, no torque gap).
- Drivetrain loss excluding converter slip (pump + gears): Powerglide 11% (lighter to turn than a TH400),
  TH350/C4/4L60E 13%, TH400/C6 14%, 4L80E 15%, 8HP70 12%. Manual default stays 11%.
- Wheel-basis power curves (chassis dyno) skip drivetrain loss but still go through the converter, which
  slightly double-counts slip for automatics measured on a chassis dyno.
- Custom transmissions are saved only in settings (offline copies), not in browser storage. A new custom
  automatic starts from GENERIC_AUTOMATIC (3000 stall, 2.0 TR, 6% slip, lock-up clutch present but off,
  0.20 s shifts, 15% shift loss, 13% loss); "Copy as custom" copies the source's current settings.
- Gear chart, ratio ladder and cruising tables show locked-converter (ideal gearing) rpm for automatics.

## Versioning (required for every commit)

The app uses [Semantic Versioning](https://semver.org). **Every commit gets a new version**: CI refuses to
release a version that already exists, so a commit without a bump fails the release run.

For each commit:
1. Pick the bump from what changed since the last version, using standard semver rules:
   - **MAJOR** (x.0.0): an incompatible change for users, such as removing a feature, or saved offline
     copies / settings no longer loading.
   - **MINOR** (0.x.0): a new feature or a visible behavior change that stays compatible.
   - **PATCH** (0.0.x): bug fixes, calibration tweaks, copy/style fixes, docs, tests, CI and build-only changes.
   - While the version is 0.y.z, an incompatible change bumps MINOR instead of MAJOR (semver allows
     anything to change before 1.0.0); 1.0.0 is a deliberate decision for the owner.
   - Reset the lower parts on a bump (0.1.3 -> 0.2.0; 0.9.0 -> 1.0.0).
2. Set the version in `frontend/package.json` **and** `frontend/package-lock.json` (both "version" fields,
   top of the file). `npm version <x.y.z> --no-git-tag-version` in `frontend/` updates both.
3. Add a section at the top of `CHANGELOG.md`: `## vX.Y.Z — YYYY-MM-DD` (optionally ` — Title`, which also becomes
   the GitHub release title and shows in the footer and changelog window via src/changelog.ts,
   e.g. `## v0.2.0 — 2026-11-25 — The Automatic Update`), then one `- ` line per change,
   written for users (what changed on the page), newest version first.
4. `npm run build` runs `scripts/version.mjs check` first and fails if package.json, the lockfile and the
   newest changelog section disagree, the section lists no changes, or versions aren't newest-first.

The page footer shows `v<version> <short sha>` linking to the commit on GitHub, and a Changelog button
that opens CHANGELOG.md in a modal. Both are baked in at build time (`define` in vite.config.ts;
`GITHUB_SHA` in CI, `git rev-parse HEAD` locally). Releases are tagged `vX.Y.Z` with the changelog
section as release notes. (Older `build-1`/`build-2` releases predate versioning.)

## Release and website

- `.github/workflows/release.yml`: every push to `main` builds and tests, then publishes
  `frontend/dist/index.html` as a GitHub Release asset (tag `vX.Y.Z`, marked latest) using the
  built-in token, and POSTs the `CLOUDFLARE_DEPLOY_HOOK` secret (if set) to redeploy the website.
- The website (repo a1gemmel/andrewgemmel.com; the live domain is andrewgemmel.ca, Cloudflare Pages) downloads
  `https://github.com/a1gemmel/drag-racing-calculator/releases/latest/download/index.html` in its build
  command (`scripts/build.sh` in that repo). Requires this repo to stay public.
- Local branch is `master`, tracking `origin/main`.

## Conventions for agents

- **UI copy is numbers and labels only.** No advice, recommendations, ratings ("rock crawler territory"),
  explanatory hints or "coming soon" notes. Warnings state the fact only ("Traction-limited for 4.4 s").
  Tire size shows only the rolling diameter.
- Keep the app backend-free and the build a single offline HTML file; `scripts/check-artifact.mjs` guards this
  (no other files in dist/, no `<link>`, `<script src>`, external media src, `@import`, non-data `url()`,
  source maps, module preload or dynamic `import()`). Vite's module-preload polyfill is disabled in vite.config.ts.
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

- **Renamed to "Drag Racing Calculator" and crawl mode removed (2026-11-25).** One mode only; no
  transfer-case or crawl features. Saved offline copies from before still load (unknown fields are dropped).
- **Power input methods** (for the quarter-mile sim): (1) car weight + 1/4-mile trap MPH estimate,
  (2) peak HP/torque @ RPM, (3) dyno table, with CSV/paste import feeding the same table.
- **Quarter-mile sim: mid-fidelity** — weight, drivetrain loss, traction limit, aero drag, rolling
  resistance, shift time. Outputs ET, trap, 60 ft, speed/RPM vs time.
- **Visual redesign: full freedom.**
- **Power basis:** peak numbers and dyno table each have a Crank (engine dyno) / Wheel (chassis dyno)
  toggle. The trap-speed estimate is crank hp (shown as whp · hp crank). Drivetrain loss is applied
  only to crank curves; the loss field is disabled for wheel curves.
- **Default car:** 26" tire, 3.73 axle, 3,700 lb, trap-speed power at 110 mph, Muncie M20 66-70 wide ratio.
  Since v0.8.1 (owner request) its Advanced fields come from the Classic Muscle preset (44% rear, 21 in CG, 114 in, Cd 0.45,
  23 ft²) via DEFAULT_CAR in appState.ts; DEFAULT_VEHICLE (quarterMile.ts, used by sim tests and simple mode) keeps Cd 0.35.
- **60 ft:** "Best estimate" searches launch RPM (250 rpm steps, lowest RPM wins ties within 1 ms) for the
  quickest 60 ft; launch RPM is no longer an input. "Known" binary-searches a drive-force multiplier over
  the first 60 ft (`launchScale`, 0.02-4) to hit the entered 60 ft; the rest of the pass runs normally
  from there. See `runQuarterMile` in quarterMile.ts.
- **Offline copy:** header button downloads the page itself with the on-screen settings embedded; the saved
  file opens with them as defaults. New settings must be added to the types and defaults in
  appState.ts (per-car settings go in CarSetup / DEFAULT_CAR, or inside power / vehicle), parseSettings if it's a new
  top-level group, App's state and currentSettings(), and a new field in TOKEN_SCHEMA (shareToken.ts; per-car fields
  also in CAR_ELEMENT). Hidden in `npm run dev` (the dev page isn't standalone).
- **Share links (v0.4.0, v0.5.0):** a share token (`#ASHAAzGCOTmA6wZa…`) for the whole setup (all cars, conditions;
  search text and filter excluded) in the URL fragment. Fragment rather than query params: works from file://, never
  sent to a server. Since v0.5.0 (owner request) the address bar is NOT updated as settings change; the header
  "Copy link" button builds the link (`shareUrl`: the page's own address over http(s); from file:// it uses `PUBLIC_URL`,
  https://andrewgemmel.ca/applications/drag-racing-calculator/, where the website build publishes the latest release —
  update it if the site path changes). On load a valid token wins over embedded offline-copy settings; a fragment pasted
  into an open page (hashchange) reloads it. Format: base64url(version byte 1 + protobuf-style message), fields tagged
  with numeric ids, only values differing from each field's frozen base are written; documented in shareToken.ts.
  The token keeps the pre-v0.5.0 one-car layout: the first car's fields at the top level (`toTokenView`), further cars
  in `extraCars` (elements reuse the per-car ids), `carName`, `carColor`, `activeCar`, `conditions`.

## Share token compatibility (hard rule)

**Every share token a released version wrote must decode to the same setup in every later version.** People
bookmark and post these links. When changing settings or `src/shareToken.ts`:
- Never change a field's id, kind or base, and never reuse an id. Enum value lists are append-only (tokens
  store the index), so never reorder or remove a value.
- Bases are literals in `TOKEN_SCHEMA`, never references to app defaults. Changing an app default is fine and
  needs no token change; changing a base is not.
- A new setting gets a new field (next free id in its message) whose base is the value that reproduces how the
  app behaved before the setting existed. `shareToken.test.ts` fails if a setting in DEFAULT_SETTINGS (or
  an automatic setup) has no field.
- A removed setting keeps its field with `retired: true`. A renamed setting keeps its id (update the path in
  the fixtures only for a pure rename).
- The version byte changes only for an incompatible format change; keep decoders for every older version.
- `src/shareToken.golden.json` (tokens and the complete setup each decodes to, in `toTokenView` layout) and the
  schema snapshots (`src/shareToken.v1-schema.json` = v0.4.0, `src/shareToken.v0.5.0-schema.json`, `src/shareToken.v0.6.0-schema.json`) are frozen: never
  edit or delete entries, only add. When a release adds fields, add golden tokens that use them and a new
  `shareToken.v<version>-schema.json` snapshot listed in SCHEMA_SNAPSHOTS (shareToken.test.ts). Don't "fix" a failing compatibility test
  by changing the fixtures.

- **1/8-mile trap (v0.2.2):** the trap method has a 1/4 / 1/8 mile toggle (`power.trapDistance`, separate
  `trapEighthMph`, default 88). An eighth trap × `EIGHTH_TO_QUARTER_MPH` (1.25, power.ts) goes into Hale's formula.
  1.25 is the common rule of thumb (1.25-1.27) and matches this sim's own passes (1.20-1.29, mostly ~1.25);
  a test keeps the sim's 1/8 mph within 3% of the entered value.
- **Trap-speed weight:** the trap method has its own race-weight field (`power.trapWeightLb`, the weight on
  that pass). Editing it also sets the sim's race weight; editing the sim's race weight does not touch it,
  so power stays fixed and ET responds to weight.
- **Cars / compare (v0.5.0):** `AppSettings.cars: CarSetup[]` (max 6) + `activeCar`; per car: name, search/filter,
  transmission pick, tire, axle, shift rpm, power, vehicle, autoSetups. Global: gearsetView, chartView, conditions,
  customTransmissions (a custom rename/delete reaches every car). `parseSettings` also reads the pre-v0.5.0 flat shape
  (one car). The setup cards (Transmission, Engine, Axle & tires, Car) sit in `.car-setup` under CarTabs; the quarter-mile
  card runs every car (`SimCar[]`, results cached by input JSON). One car: traces coloured by gear with shift markers.
  Several: each car in its color (`CarSetup.color` #rrggbb from the tab's color picker, else CAR_COLORS = GEAR_COLORS
  order by tab index; [+] starts a new car on its palette color), one segment per gear alternating the car color and a
  50% white tint (`gearShade`; owner asked for alternating over a gradient), car names as end labels (LineChart
  `endLabels`, per-series `endLabel`). Speed chart mode: Time (speed vs s) | Distance (speed vs ft) | Completion (ft vs s,
  dotted horizontal 1/8 and 1/4 lines via LineChart `hMarkers`) (UI state, not saved): defaults to completion when
  comparing, time for one car, resets when the car count crosses 1. The engine rpm chart always runs on distance (ft).
  Dots (LineChart `dots`) at each car's
  1/8 and 1/4 with "ET @ trap mph" hover text. Tiles show the winner (quickest ET); the comparison table is in finishing
  order (DNF last), Δ ET and margin in feet vs the winner (`marginFt`: how far short of 1,320 ft a car is when the
  winner finishes), open tab's row bold; shown for one car too (Δ column hidden). Under the RPM chart: a shifts-only
  table with a car picker that follows the open tab. A gap-to-winner chart was tried and removed at the owner's request.
- **Pass replay (v0.5.0):** `PassReplay.tsx`, under the summary/comparison table, for one car or several: SVG strip with
  lanes, timing marks (60', 330', 1/8, 1,000', 1/4), cars placed by `stateAtTime(run, t)` (interpolated ft/mph/rpm/gear on
  the timing-slip clock; past the ET a car rolls on at its finish-line speed and leaves the clipped strip, the clock runs
  1.5 s past the last finisher). The card remounts it (key = JSON of every car's sim input + air density) on any
  setting change, which stops and rewinds it; names, colors and the open tab don't. Play/Pause (requestAnimationFrame), 1× / ½× / ¼×, range scrubber,
  clock, per-car readouts (ft · mph, gear · rpm; ET @ trap once finished) and a WIN label on the quickest car once it
  finishes (compare only). Timeslip/shift tables show the open car. [+] copies the open car.
- **Auto shift point (v0.5.0):** "Auto" beside Shift at runs `bestShiftRpm`: 50 rpm steps from peak hp to the end of the
  power curve (never past it: torque beyond the curve is unknown), launch rpm/known-60 ft fit held from one full run,
  quickest ET wins (ties to the lower rpm), at the current track conditions. ~125 ms. Often lands at the curve's end with
  wide-ratio boxes, since power past the peak still beats the power after the drop.
- **Track conditions (v0.5.0):** top of the quarter-mile card: Standard (no correction) | Density altitude (ft) |
  Weather (°F, uncorrected/station inHg, RH %) -> DA via dry+vapor density and the ISA relation (quarterMile.ts
  `densityFromWeather`, `densityRatioAtAltitude`). Density ratio σ (vs ISA sea level) scales engine torque
  (`airCorrectedCurve`, naturally aspirated assumption; boost not modelled) and aero drag. Power inputs are treated as
  standard-air numbers; DA 0 gives exactly the Standard result. ~1 mph per 1,000 ft at the default car.
- **Launch control (v0.5.0):** `vehicle.launchControl` multiplies grip by `LAUNCH_CONTROL_GRIP` = 1.2 (electronics hold
  the slip-curve peak; peak vs spinning friction is 15-30%). Calibrated so a 2018 Mustang GT (10R80, 460 hp, 4,000 lb,
  3.55, 26.6") on "Performance street" runs 11.85 @ 118.8 vs magazine 11.83-11.98 @ 119 (test guards 11.75-12.05).
  The owner asked for a tooltip on this toggle (InfoTip, text set by the owner: "More accurate 60 foot calculation for
  late-model cars"), an exception to the numbers-only copy rule.
- **Top speed (v0.7.1, owner request):** the Gearing stats tile uses `topSpeed` (quarterMile.ts): per gear, the first speed
  where drive force (torque × gearing × (1 − loss)) falls to drag + rolling resistance, capped at the shift rpm; best gear
  wins. Automatics slip `couplingSlip` in unlocked gears. Open car's vehicle and power, air-corrected. Falls back to the
  gearing speed when there's no power curve. The ladder table's "Speed at <rpm>" column stays pure gearing.
  Drag-limited / rpm-limited explanation is a hover tooltip on the tile (owner request; an exception to the numbers-only
  copy rule). The sim shares the force balance (`steadyForces`): it upshifts only if the next gear's steady surplus at the
  current speed is positive, else it holds the gear on the limiter, so a pass levels off at topSpeed in the same gear.
- **Car presets (v0.8.0, owner request):** `carPresets.ts` + `components/CarPresets.tsx`: an "Aero Preset" field in the main Car
  inputs (after 60 ft; v0.8.2) opens a floating menu (absolute, z-index; closes on pick, outside click, Escape) so the layout never
  shifts. Labels: Full-size truck, Corvette, Modern Muscle (average of Mustang S550 GT and 2020 Challenger R/T Scat Pack: 111.7 in, 46% rear, Cd 0.36, 24 ft², CG 21 in; Challenger silhouette), Classic Muscle,
  Classic Pony, Dragster. Silhouettes: 160 × 56 side profiles (front left), body + glass + tire/rim/hub. Owner-supplied reference
  photos: F-150, C6, 2020 Challenger and 1969 Nova (Classic Muscle) were traced (outline + glass, tyres placed by hand);
  1969 Camaro (Classic Pony) and a rear-engine dragster were drawn from their pictures. A preset sets ONLY the Advanced fields (driven-axle weight, CG height, wheelbase, Cd, frontal
  area); presets store the rear share, converted to the front share for FWD. The Advanced fields flash (`.preset-flash`, remount via a
  key) after a pick when Advanced is open; when it's closed the Advanced header flashes (`.advanced-flash`) instead,
  restarted by toggling the class on the same element (re-keying a `<summary>` leaves the old one first inside `<details>`). Not a saved setting: the active button is whichever preset the values match. Data: C6 105.7 in, 51/49,
  Cd 0.28 (GM); Mustang S550 GT 107.1 in, 53/47, Cd ~0.35; muscle car = 1968-72 intermediates avg (Chevelle 112 in, 56/44,
  Cd 0.42-0.47); pony car = 1967-70 avg (Camaro 108 in, 55/45, Cd 0.34 catalog -> 0.40 class); truck = F-150 SuperCrew /
  Silverado crew (145 in, Cd 0.416/~0.41, 42% rear); bracket dragster ~230 in, ~75% rear. Frontal areas (0.82 × width × height),
  CG heights and the dragster's aero are estimates. Wheelbase field max raised to 400 in.
- **Trap RPM (v0.5.0):** its own tile (rpm and gear at 1,320 ft) instead of the 1/4 tile hover.
- **Powerglide gearsets (v0.5.0):** ATI's aftermarket low gears (1.58-2.18, 2nd 1.00) added as "x.xx Low (aftermarket)"
  variants, source ATI gear set catalog.
- **Tire construction (v0.4.1):** tire presets set grip and rolling resistance together (`TIRE_PRESETS` in
  QuarterMileCard.tsx; constants in tires.ts). Radials 0.015; bias-ply slick 0.021 (+40%; published bias vs radial
  rolling-resistance gaps are ~14-150% by pressure/load). That costs ~0.65 mph of trap at the default car, matching
  racers' reports of a bias-ply slick trapping under 1 mph slower than a radial (test guards 0.4-1 mph). Bias-ply growth
  at speed isn't modelled. A setup whose grip/rolling pair matches no preset shows "Custom".
- **Tire rolling correction (3%) applies to size mode only;** a typed diameter is used as entered.

## Open questions for the owner

- Hosting target (GitHub Pages, Netlify, Cloudflare Pages, …)? Determines CI/deploy setup.
- Units: imperial only, or metric too? Tire input as diameter or tire size (e.g. 265/70R17)?
- Priority order for PLAN.md product work.
- Which transmissions to add to the catalog?
- Repo directory name is misspelled (`transmssion`); rename intended?

## Input layout (v0.3.0, revised v0.5.0)

No sidebar. Car tabs over the setup cards, then the quarter-mile card. Setup cards:
- Transmission: picker, ratio chips, custom links, then "Shifts & clutch" (`ManualInputs`) or the automatic's
  "Converter & shifts". A "Gearing" disclosure in the header shows/hides the stats strip, RPM vs road speed chart and
  gearset tables (`split-results`): open for one car, folded when comparing (resets when the car count crosses 1);
  folded, the inputs spread into columns (`.split.collapsed`).
- Engine: `PowerInputs` + "Shift point" (with Auto) | `PowerCurves` (torque and hp on one chart, peaks labelled).
- Car (`CarInputs`): race weight, axle ratio, driven wheels, launch control, 60 ft (best/known); Advanced: driven-axle
  weight, CG height, wheelbase, aero. Tires (`TireInputs` + TireField): diameter/size, grip preset; Advanced: grip
  coefficient, rolling resistance, rollout. Car and Tires side by side (`.card-pair`).
Quarter-mile card order: air conditions, tiles (winner), timing table (comparing) or one-line `TimeslipStrip` (one car),
speed chart, rpm chart, shifts table, pass replay. Cards stack below 1100 px (split) and 900 px (pair). The trap method
keeps its own race weight in Engine (it drives Car's race weight one way).

## Simple mode (v0.6.0, owner request)

Phones get a simple version: one car, no racing, no gears. `src/simplePass.ts` + `components/SimpleView.tsx`.
- Inputs: crank hp, race weight, tire preset (grip + rolling resistance from `TIRE_PRESETS`), 60 ft estimate / known.
  Settings in `AppSettings.simple` (separate from the full mode's cars), token field 19 `simple`.
- Model: constant wheel power (an ideal gearbox at the power peak) = hp × (1 − 15% `SIMPLE_DRIVELINE_LOSS`) ×
  `GEARING_UTILIZATION` 0.94, capped by the traction limit (RWD, weight transfer), with the full sim's default
  geometry, aero, rolling resistance, rollout timing and trap windows; rotating mass ×1.08. 0.94 is calibrated so trap
  speed reproduces Hale's rule (the same one the full mode's trap-speed power estimate uses) within ±0.6% from 250 to
  1,000 hp (tests guard 1%). Default car (384 hp / 3,700 lb): 13.07 @ 110.3 vs full mode 12.95 @ 110.9. Known 60 ft:
  traction over the first 60 ft scaled by binary search, like the full mode.
- Output: 1/4 (hero), 60 ft, 1/8 tiles; `TimeslipStrip`; one speed chart with Time / Distance / Completion and 1/8, 1/4
  dots. No replay, rpm chart, air conditions or comparison.
- Mode: `AppSettings.mode` "auto" | "simple" | "full" (token field 20). On load: a link's or saved copy's explicit mode,
  else the last choice in localStorage (`drag-racing-calculator:mode`), else simple when `(max-width: 700px)` matches.
  Copy link and offline copies carry the mode in use. Simple / Full toggle in the top bar.
- First-load notice (owner asked for a warning; an exception to the numbers-only copy rule): shown when simple was picked
  by screen size and `drag-racing-calculator:phone-notice` isn't set; OK or "Use full version" sets it. These two
  localStorage keys are the app's only browser storage (wrapped in try/catch; blocked storage just means no memory).

## Design system (2026-11-24 redesign)

- Dark only. Tokens live at the top of `styles.css`; chart surface is `--surface` #15181b. `--text-3` is #8b929a
  (5.6:1; the old #6f767e was 3.9:1). Solid accent only for the brand mark, primary buttons (Play), the open car tab,
  focus rings and the hero tile. Selected segments and the open Gearing button use a soft accent tint
  (`--control-active` 16% accent, warm text #ffe3da); plain neutral grey was tried and the owner found it lifeless.
  Text buttons and subgroup titles use `--accent-light` #ff8a6b; card titles have a 4 px accent bar; cards lighten
  toward the top (`--card-top`).
- Charts (LineChart, GearChart, replay strip) draw in real pixels: `useMeasuredWidth` (ResizeObserver) sets the svg
  width, so 11 px text stays 11 px on any screen. Y axis title rotated left of the ticks, x title centred below.
  Distance axes use fixed ticks at the timing marks (`xTicks`/`yTicks` props).
- Gear colors: fixed order in `GEAR_COLORS` (App.tsx), the dark-mode categorical palette from the dataviz
  skill, validated for CVD separation against #15181b. Color follows the gear index — never reorder.
- Accent #ff5a36. UI chrome only; never use the accent for data marks.
- Text in charts uses text tokens, never series colors. System font stacks only (single offline file).

## Quarter-mile sim calibration notes (2026-11-24)

- 400 hp / 3,500 lb, 3.73 axle, 26" tire, TKX wide ratio: 13.4 s @ 111.6 mph on 1.0 grip, 12.8 s on 1.3.
  With the Hale estimate treated as crank hp, sim trap lands 1-3.5% under the input trap; treated as wheel
  hp (current behavior) it lands ~4-5% over (1% over at 600 hp / 2,800 lb). The consistency test runs the
  trap curve as crank.
- Owner decision (2026-11-24, final): Hale's 234 formula gives crank hp; the sim takes drivetrain loss
  off it, and the result at the tires is the pass's wheel hp. Default drivetrain loss is **11%** (owner
  target: 115 mph / 3,700 lb ≈ 390 whp; Hale gives 439 hp crank -> 391 whp, so the 234 constant is
  unchanged). The trap method's basis is "crank". At 11% the sim traps 0-1.7% above the input with Cd 0.35
  (round-trip test guards 2%). Don't change the default Cd (0.35) to calibrate. A simulator-based power
  solve was tried and rejected by the owner: keep Hale's formula as the source of the number.
- Timing uses a rollout (default 11.5 in): splits, ET, shift times and traces start when the car has
  rolled that far, like a timing slip. Worth ~0.3 s on 60 ft and ET; trap is unaffected.
- Defaults after both fixes (430 hp, 3,500 lb, TKX close, 4.10, 26", 0.15 s shifts): 60 ft 2.22 /
  ET 12.81 on 1.0 grip, 1.88 / 12.10 on 1.3, 1.73 / 11.90 on 1.6.
- Launch model (2026-11-24): explicit engine inertia (0.0025·m·r²) and wheel/driveline mass (4% of m).
  The clutch ramps from launch-RPM torque to full clamp (1.25× peak torque) over `clutchReleaseS`
  (default 0.25 s, per the owner's launch-control reference); the engine is dragged down to driveline
  speed, so RPM dips early and then climbs with road speed. Wheelspin is held to 10% slip, or 7 m/s at
  low speed. Capacity and slip floor were tuned for a 30-40% RPM dip bottoming at 0.2-0.4 s (owner's
  target); 1.6+ grip launches high and hooks, so it dips ~50%. Best-launch ties within 5 ms go to the RPM nearest the torque peak.
  vs the previous held-RPM model, 60 ft moved -0.05/-0.04/-0.03/-0.11 s at grip 0.9/1.0/1.3/1.6.
- No traction-limited warning in the UI (owner request).
