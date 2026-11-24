# Transmission Ratio Viz

Transmission Ratio Viz is a frontend-only gearing workspace. The transmission catalog and drivetrain calculations run in the browser, and the production build is a single self-contained `index.html` file that can be opened from disk or hosted by any static file server.

## Build and Test

The repository uses Bazelisk for the reproducible production build:

```bash
direnv allow
bazelisk build //frontend:bundle
```

The generated artifact is `bazel-bin/frontend/static/index.html`.

For local frontend development and tests:

```bash
cd frontend
npm install
npm run dev
npm test
npm run build
```

The checked-in `package-lock.json` makes the npm path reproducible. The generated HTML contains its JavaScript, CSS, and catalog data inline and does not require an API or network connection at runtime.

## Domain Formula

For tire diameter in inches, engine RPM, transmission ratio, axle ratio, and optional transfer-case stages:

```text
road_speed_mph = engine_rpm * tire_diameter_in * pi
                 / (transmission_ratio * axle_ratio * transfer_case_ratios * 1056)
```

The pure calculation functions live in `frontend/src/calculations.ts`, with focused tests in `frontend/src/calculations.test.ts`.