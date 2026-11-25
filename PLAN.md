# Drag Racing Calculator Development

## Current Architecture

- React and TypeScript frontend
- Local typed transmission catalog with cited sources
- Pure browser-side drivetrain, power and quarter-mile calculations
- Single-file offline production artifact, downloadable from the page with saved settings
- npm + Vite build and Vitest tests

## Done

- [x] Move the transmission catalog and calculations from Python into the frontend.
- [x] Single self-contained HTML build; Bazel, Python and OCI infrastructure removed.
- [x] Transmission text search and manufacturer/brand filter.
- [x] Tire input by diameter or tire size.
- [x] Power input: trap speed (Hale), peak numbers, dyno table with CSV import; crank/wheel basis.
- [x] Quarter-mile simulation: 60 ft (best estimate or known), splits, trap, shift table, speed/RPM traces.
- [x] Offline copy download with embedded settings.
- [x] Automatic transmissions with torque converter, lock-up and trans/foot brake launch (v0.2.0).
- [x] Custom transmissions, manual or automatic (v0.2.0).

## Product Work

- [ ] Optimal shift-point finder.
- [ ] Hold a gear to the finish (e.g. a pass that hit the limiter in 3rd).
- [ ] Configuration comparison (two setups on one chart).
- [ ] Unit support (metric).
- [ ] Browser smoke tests for the primary workflow.
- [ ] Keyboard accessibility and mobile interaction checks.
