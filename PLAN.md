# Transmission Ratio Viz Development

## Current Architecture

- React and TypeScript frontend
- Local typed transmission catalog
- Pure browser-side drivetrain calculations
- Single-file offline production artifact
- Bazelisk production build and npm frontend tests

## Completed Migration

- [x] Move the transmission catalog from Python into the frontend.
- [x] Move ratio, speed, inverse RPM, and gear-speed calculations into TypeScript.
- [x] Remove runtime API fetching from the application.
- [x] Inline JavaScript and CSS into the generated HTML.
- [x] Remove Python, FastAPI, Uvicorn, and OCI packaging infrastructure.
- [x] Add frontend calculation tests.

## Product Work

- [ ] Replace placeholder Save build behavior with browser export/import.
- [ ] Implement editable transmission and gearset configuration.
- [ ] Implement multiple editable transfer-case stages.
- [ ] Add reverse, neutral, and overdrive presentation to the chart.
- [ ] Add unit support and tire dimension conversion.
- [ ] Add browser smoke tests for the primary gearing workflow.
- [ ] Improve keyboard accessibility and mobile interaction checks.

## Deferred Simulation Features

- [ ] Quarter-mile acceleration simulation.
- [ ] Engine torque and power curve support.
- [ ] Configuration comparison and sharing presentation.