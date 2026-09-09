# Transmission Ratio Viz Development

## Current Implementation Slice

The first vertical slice is a local gearing workspace:

- React and TypeScript frontend scaffold
- Python calculation module for RPM, tire circumference, and road speed
- FastAPI service boundary reserved for saved configurations and future typed RPC contracts
- Transmission and transfer-case data represented as editable configuration objects

The application scaffold exists, but the current frontend is a static presentation slice and the backend does not yet persist configurations.

## Domain Formula

For a tire diameter in inches, engine RPM, transmission ratio, and total final-drive ratio:

```text
road_speed_mph = engine_rpm * tire_diameter_in * pi
				 / (transmission_ratio * final_drive_ratio * 1056)
```

The first implementation treats transfer-case ratios as additional multiplicative stages.

## Bazel Build

- Bazelisk is pinned through `.bazelversion` and bootstrapped from `env/bin`.
- `//backend:server` builds with the Bazel-managed Python 3.11 toolchain.
- `//tests:calculations_test` runs the calculation tests through Bazel.
- `//frontend:bundle` runs the production frontend build and emits a tar archive.
- `//oci:application_image` assembles the application artifacts with `rules_oci`.
- `//oci:application_tarball` emits a tagged OCI archive for local loading.


The current OCI image is an artifact assembly scaffold without a pinned Python runtime base. A later container slice must add a digest-pinned Python base and package the backend runtime dependencies before the image is production-runnable. The frontend target requires Node.js 20+ and a checked-in `frontend/package-lock.json`.

## Implemented Foundation

- React/TypeScript frontend layout with configuration, gearing chart, and ratio overview presentation.
- Python calculation functions for total ratios, road speed, and chart-ready gear speeds.
- FastAPI application with health and gearing calculation routes.
- Executable backend entrypoint: `bazel run //backend:server` starts Uvicorn and honors `HOST` and `PORT`.
- Bazelisk bootstrap and pinned Bazel version.
- Bzlmod dependency graph using `rules_python`, `rules_pkg`, and `rules_oci`.
- Bazel backend build and calculation test targets.
- Repository-local NVM/Node shims using `.nvmrc` and `env/bin`.

## Unimplemented Work

### Product And Domain

- [ ] Define the primary user persona and success criteria.
- [ ] Finalize supported units: imperial, metric, or both.
- [ ] Define tire input formats and conversion rules: diameter, circumference, or full tire dimensions.
- [ ] Specify validation ranges and error messages for RPM, tire dimensions, ratios, and axle values.
- [ ] Decide how reverse, neutral, overdrive, and arbitrary ratio stages appear in charts.
- [ ] Add canonical transmission data and support named wide-ratio and close-ratio gearsets.
- [ ] Add representative domain fixtures, including a custom transmission and stacked transfer cases.

### Functional Frontend

- [ ] Replace hard-coded chart data in `frontend/src/App.tsx` with editable application state.
- [ ] Connect controls for tire diameter, axle ratio, redline, and gear ratios to calculations.
- [ ] Implement transmission and gearset editing: add, remove, reorder, and validate gears.
- [ ] Implement transfer-case/crawl-box editing with multiple arbitrary ratio stages.
- [ ] Add chart/table handling for unit labels, selected gears, tooltips, legends, and empty/error states.
- [ ] Select and integrate a production charting approach or formalize the current CSS chart limitations.
- [ ] Add keyboard accessibility, screen-reader labels, focus states, and mobile interaction checks.
- [ ] Add frontend loading and API error states.

### Backend And API

- [ ] Replace untyped `dict` request/response payloads with Pydantic models.
- [ ] Define API versioning and a stable schema for vehicles, transmissions, gearsets, tires, and ratio stages.
- [ ] Choose the typed React-to-Python transport and contract source of truth.
- [ ] Add generated TypeScript and Python client/server types to the Bazel graph.
- [ ] Add CORS and development configuration for the frontend/backend split.
- [ ] Add API integration tests for health, valid gearing requests, invalid inputs, and stacked transfer cases.

### Persistence And Sharing

- [ ] Choose a persistence database and migration strategy.
- [ ] Define the saved-build schema, schema versioning, timestamps, and ownership model.
- [ ] Implement create, read, update, copy, and delete operations for saved configurations.
- [ ] Generate opaque keyed URLs for shareable builds.
- [ ] Implement editable-copy behavior without mutating the original shared build.
- [ ] Decide whether authentication is required for saved builds or whether anonymous builds are allowed.
- [ ] Add persistence and sharing integration tests.

### OCI And Bazel Delivery

- [ ] Generate and commit `frontend/package-lock.json` using the pinned Node version.
- [ ] Make frontend package versions deterministic; remove `latest` dependency ranges from `frontend/package.json`.
- [ ] Validate `//frontend:bundle` with `bazel build` on a clean machine.
- [ ] Add a digest-pinned Python runtime base to `//oci:application_image`.
- [ ] Package backend runtime dependencies and verify the image entrypoint can import and serve the application.
- [ ] Ensure frontend build artifacts are placed at the intended path in the OCI image.
- [ ] Add a container smoke test for `/health` and `/api/gearing/speeds`.
- [ ] Decide whether the local image should be loaded with Docker, Podman, or only emitted as an OCI archive.

### Quality And Operations

- [ ] Add formatting, linting, type checking, and Bazel targets for each language.
- [ ] Add browser smoke tests for the primary gearing workflow.
- [ ] Add API contract tests and frontend/backend compatibility checks.
- [ ] Document clean-machine bootstrap from `direnv allow` through Bazel build and server startup.
- [ ] Add CI/CD and infrastructure-as-code after the local build graph and OCI image are stable.

### Deferred Product Features

- [ ] Quarter-mile acceleration simulation with explicit assumptions for mass, traction, drag, rolling resistance, drivetrain loss, shift time, and RPM limits.
- [ ] Shift timing and distance visualization, estimated ET, trap MPH, and finish-line RPM.
- [ ] Engine torque/power curves and full dyno-curve import.
- [ ] Configuration comparison, export, and share presentation improvements.