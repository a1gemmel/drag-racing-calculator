# Changelog

All notable changes to Drag Racing Calculator. Versions follow [Semantic Versioning](https://semver.org); every commit to `main` is a new version.

## v0.4.1 — 2026-11-25

- Tire grip presets also set rolling resistance: radials 0.015, the slick preset (now "Bias-ply slick, prepped track") 0.021, which traps about 0.65 mph slower than a radial at the default car.
- Rolling resistance moved to the Axle & tires card's Advanced section.

## v0.4.0 — 2026-11-25

- The page address now holds your setup as a short code as you change it, so the URL can be shared or bookmarked to open the exact same setup. Links keep working in later versions.
- Copy link button in the header copies that address.
- Fixed: an automatic set to have no lock-up clutch got its lock-up clutch back when an offline copy was opened.

## v0.3.0 — 2026-11-25 — UI Overhaul

- Inputs are grouped into cards on the main page: Transmission, Engine, Axle & tires, and Car, followed by the quarter-mile results.
- Transmission card: transmission picker and its shift, clutch or converter settings beside the top speed / RPM drop / cruise numbers, the RPM vs road speed chart and the gearset tables.
- Engine card: power input (trap speed, peak numbers or dyno table) and shift point beside one torque and power chart with each peak labelled.
- Axle & tires card: axle ratio, tire, grip, driven wheels and 60 ft; grip coefficient, driven-axle weight and rollout under Advanced.
- Car card: race weight; CG height, wheelbase and aero under Advanced.
- Power method "Peaks" renamed "Peak #s".
- RPM range mode removed; the shift point sets the chart, tables and quarter-mile shifts. Saved copies that used RPM range open with their saved shift point.
- RPM vs road speed has a Shifts / Full range toggle. Full range draws every gear from 1,200 rpm to the shift point (1st from 600 rpm).
- Quarter-mile tile shows the trap speed at full size next to the ET (12.95 s @ 110.9 mph).
- Fixed: hovering the 1/4 mile tile now shows gear and rpm at the finish, like the 1/8 mile tile.
- Versions can have titles (this one is "UI Overhaul", v0.2.0 is "The Automatic Update"). Titles show in the changelog window, in the footer next to the version, and as the GitHub release name.
- Changelog window: each version shows its number and title, with the date underneath; the note about version numbering is gone.

## v0.2.2 — 2026-11-25

- Trap-speed power: choose a 1/4 mile or 1/8 mile trap. A 1/8 mile trap is scaled by 1.25 to its 1/4 mile equivalent, which is shown with the hp estimate.

## v0.2.1 — 2026-11-25

- New automatics: ZF 8HP45, Chrysler 727 TorqueFlite, 545RFE, 65RFE (Drive or all six ratios), Ford 10R80 and GM 8L90.
- 1/4 mile and 1/8 mile tiles show gear and rpm at the mark on hover.
- RPM vs road speed chart: hover snaps to the start or end of a gear line.
- Biggest RPM drop shows without a minus sign.
- Gearset table opens on Cruising RPM.

## v0.2.0 — 2026-11-25 — The Automatic Update

- Automatic transmissions: Powerglide (1.76 and 1.82 low), TH350, TH400, C4, C6, 4L60E, 4L80E and ZF 8HP70.
- Torque converter simulation: stall speed, torque multiplication, converter slip at full throttle, and lock-up (off, top gear, or 2nd and up) for transmissions with a lock-up clutch.
- Automatic upshifts are power shifts: drive continues through the shift, less a shift-clutch loss (Advanced: Shift time, Shift loss).
- Trans brake or foot brake launch, with launch rpm capped at the converter stall speed.
- Automatic pane with per-transmission defaults, editable settings and a reset.
- Custom transmissions: manual or automatic, 1 to 10 gears, any ratios; create new, copy an existing transmission, edit or delete. Saved in offline copies.
- Transmission filter by type (manual or automatic).

## v0.1.1 — 2026-11-25

- Changelog window shows formatted text: headings, bullet lists, links and code.

## v0.1.0 — 2026-11-25

First versioned release.

- Gearing: RPM vs road speed chart per gear, shift-point and RPM-range modes, ratio ladder and cruising RPM tables.
- Transmission catalog with cited sources: Tremec TKX, T5, T56, T56 Magnum; New Venture NV3500, NV4500; Aisin L43, L45, L50, W56; Muncie M20.
- Transmission text search and manufacturer/brand filter.
- Tire input by diameter or tire size (275/55R15, 35x12.50R17) with a 3% rolling-diameter correction.
- Power input: trap speed and race weight (Hale), peak numbers, or dyno table with CSV/paste import; crank or wheel basis.
- Quarter-mile simulation: best-estimate or known 60 ft, timeslip and shift tables, speed and RPM traces with 1/8 and 1/4 mile marks.
- Default car: Muncie M20 wide ratio, 3.73 axle, 26" tire, 3,700 lb, 110 mph trap, 11% drivetrain loss.
- Download an offline copy of the page with the current settings as its defaults.
- Version, commit link and this changelog in the page footer.
