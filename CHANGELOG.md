# Changelog

All notable changes to Drag Racing Calculator. Versions follow [Semantic Versioning](https://semver.org); every commit to `main` is a new version.

## v0.7.0 — 2026-11-26

- Tremec TR-9080 DCT (dual-clutch, 8-speed): C8 Corvette 8-speed.
- Tremec TR6060 (manual, 6-speed): Challenger / Charger R/T, Scat Pack, 392 (2009-23); Challenger Hellcat (2015-23) / Viper (2013-17); Camaro SS (2010-15) / HSV (2008-13); Camaro ZL1 (2012-15) / CTS-V (2009-15) / CT4-V Blackwing; Camaro SS / ZL1 (2016-24) / Corvette C6 (2008-13); Corvette C6 Z51 (2008-09); Corvette C6 ZR1 (2009-13); CT5-V Blackwing; Shelby GT500 (2007-10); Shelby GT500 (2011-12); Shelby GT500 (2013-14); Pontiac G8 GXP (2009); Chevrolet SS (2014-17).
- Tremec TR-6070 (manual, 7-speed): Corvette C7 (2014-19); Corvette C7 Z51 / Grand Sport; Corvette C7 Z06 / ZR1 (2015-19).
- Tremec TR-3160 (manual, 6-speed): Mustang GT350 / Mach 1 / Dark Horse (2016+); Camaro 2.0T / V6 (2016-24); Cadillac ATS.
- Getrag MT82 (manual, 6-speed): Mustang GT 5.0 (2011-17); Mustang V6 (2011-14); Mustang EcoBoost (2015-23); MT82-D4 Mustang GT (2018+).
- GM Muncie M21 (manual, 4-speed): Close Ratio (1963-74).
- GM Muncie M22 (manual, 4-speed): Rock Crusher (1967-74).
- Ford Toploader (manual, 4-speed): Close Ratio (1964-73); Wide Ratio (1964-73).
- Chrysler A833 (manual, 4-speed): Close Ratio (340 / 383 / 440 / Hemi); Wide Ratio (1964-79); Extra Wide (1964-66 A-body); Overdrive (1975-79 A-body).
- Borg-Warner T-10 (manual, 4-speed): U set; W set; X set; Y set.
- Doug Nash 4+3 (manual, 4-speed): Corvette C4 (1984-88), overdrive off.
- ZF S6-40 (manual, 6-speed): Corvette C4 ZF6 (1989-96).
- Toyota W58 (manual, 5-speed): Supra A60 / A70 / A80 non-turbo, SC300.
- Toyota R154 (manual, 5-speed): Supra A70 Turbo (1987-92), JZ chassis.
- Getrag V160 / V161 (manual, 6-speed): V160 Supra A80 Twin Turbo; V161 (later JDM).
- Mazda RX-7 5-speed (manual, 5-speed): FD3S (1992-2002) / FC3S Turbo II (1987-91).
- Subaru TY856 STI 6-speed (manual, 6-speed): STI (2004-07); STI (2008+).
- Subaru TY75 WRX 5-speed (manual, 5-speed): WRX 2.0T (2002-05); WRX (2008-14).
- Subaru WRX 6-speed (manual, 6-speed): WRX (2015-21).
- Toyota TL70 (manual, 6-speed): BRZ / FR-S / GT86 (2013-20).
- Honda K-series manual (manual, 5- and 6-speed): Civic Si EP3 5-speed (2002-05); RSX base 5-speed (2002-04); RSX Type-S 6-speed (2002-06); Civic Si FA5 / FG2 6-speed (2006-11); JDM DC5 / EP3 Type R 6-speed; TSX 6-speed (2004-08).
- Honda B-series manual (manual, 5-speed): Integra Type R / Civic Si (B16); Integra GSR (1994-2001); Integra LS (B18B1).
- GM 200-4R (automatic, 4-speed): THM 200-4R.
- GM 6L80 (automatic, 6-speed): Hydra-Matic 6L80.
- Mercedes-Benz NAG1 (automatic, 5-speed): W5A580 (Chrysler / Dodge / Jeep).
- Ford 6R80 (automatic, 6-speed): 6R80 (2011-17 Mustang, F-150).
- Aisin A340E (automatic, 4-speed): Supra A70 / A80, SC300 / SC400.
- Chrysler A904 TorqueFlite (automatic, 3-speed): A904 standard; Wide ratio (A904 WR / A998 / A999).
- Ford FMX (automatic, 3-speed): FMX (1968-79).
- GM 700R4 / 4L60 (automatic, 4-speed): 700R4 / 4L60 (1982-93).
- ZF 8HP90 (automatic, 8-speed): 8HP90 (Hellcat / Redeye).
- GM 10L80 / 10L90 (automatic, 10-speed): 10L80 Camaro SS / 10L90 ZL1, CT4-V, CT5-V.
- T56 variant names now list the C6 Corvette and GTO that use them; Muncie M20 gained reverse ratios.
- Dual-clutch transmissions launch on the clutch like a manual and keep driving through every upshift; the manual shift-time field is hidden for them.

## v0.6.0 — 2026-11-25

- Simple version for phones: horsepower, race weight and tires (plus an optional known 60 ft) give a simulated quarter-mile pass with 60 ft, 1/8 and 1/4 times, a timeslip and a speed chart. No gears to set up; a 15% driveline loss is used.
- Simple / Full toggle at the top of the page. Phones start in Simple, with a one-time notice; other screens start in Full. Your choice is remembered, and share links open in the version they were made in.

## v0.5.2 — 2026-11-25

- Footer credit: © 2026 Andrew Gemmel.
- Fixed: Copy link in a downloaded offline copy pointed at the wrong website address (andrewgemmel.com); it now uses andrewgemmel.ca.

## v0.5.1 — 2026-11-25

- Copy link in a downloaded offline copy now links to the published site instead of a file on your computer.
- Downloading an offline copy from an offline copy no longer adds a stray blank line each time.

## v0.5.0 — 2026-11-25 — The Racer Update

- Compare cars: the setup cards sit under car tabs. [+] adds a car (a copy of the open one), tabs can be renamed, recolored and removed, and the quarter-mile charts overlay every car, labelled by name, alternating dark and light at every shift.
- Pass replay: play the run on a drag strip, one lane per car, at 1×, ½× or ¼× speed or scrubbed by hand, with each car's distance, speed, gear and rpm and a win light at the finish. Cars drive on past the finish line and off the strip; changing any setting stops and rewinds it.
- Timing table lists every car in finishing order with its ET and distance behind the winner; the open tab's row is bold. The 1/4 mile tiles show the winning car. The shift table below the charts has a car picker, defaulting to the open tab.
- Speed chart Time / Distance / Completion toggle: speed against time or distance, or distance against time with dotted 1/8 and 1/4 lines. Completion is the default when comparing, time with one car. Dots mark the 1/8 and 1/4 on every line; hover for time and speed.
- The engine rpm chart runs on distance (feet).
- Track conditions at the top of the quarter-mile simulation: standard air, a density altitude, or weather (temperature, uncorrected barometer, humidity) with the density altitude it works out to. Power and drag follow the air density.
- Trap RPM tile: engine rpm and gear at the finish line, also in the comparison table.
- Launch control toggle in the Car card: raises traction off the line for cars with launch or traction control.
- Shift at: Auto button picks the shift rpm (to the nearest 50) with the quickest ET for the car.
- Powerglide aftermarket low gears: 1.58, 1.62, 1.64, 1.74, 1.80, 1.87, 1.94, 1.98, 2.08 and 2.18.
- New transmissions: Ford AOD, Richmond Super T-10 (2.43 S, 2.64 W, 2.64 X, 2.88 CC, 3.42 Z), Saginaw 4-speed (2.54, 2.84, 3.11 and 3.50 first gears) and Nissan CD009.
- The address bar no longer changes as you edit; Copy link makes the share link. Links and offline copies from v0.4 still open.
- Layout: the Transmission card's gearing numbers, RPM chart and gearset tables fold away under a Gearing button (open with one car, folded when comparing). Axle ratio, driven wheels and 60 ft moved to the Car card; tires have their own card.
- Charts keep the same text size on phones and wide screens, axis titles sit beside and below the axes, and distance axes mark 60, 330, 660, 1,000 and 1,320 ft.
- One car: a one-line timeslip under the tiles replaces the table. The replay moved below the charts and shows "Staged" before the clock starts.
- Refreshed colors: selected toggles use a soft orange tint instead of a solid fill, card titles get an accent bar, links and section labels are light orange, and secondary text is easier to read.

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
