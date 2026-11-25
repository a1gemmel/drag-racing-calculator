# Changelog

All notable changes to Drag Racing Calculator. Versions follow [Semantic Versioning](https://semver.org); every commit to `main` is a new version.

## v0.2.0 — 2026-11-25

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
