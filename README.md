# Transmission Ratio Viz

Transmission Ratio Viz is a frontend-only gearing workspace. The transmission catalog and drivetrain calculations run in the browser, and the production build is a single self-contained `index.html` file that can be opened from disk or hosted by any static file server.

## Build and Test

Node.js is pinned in `.nvmrc`. With direnv, the repository shims in `env/bin` install and use that version automatically through a repo-local nvm:

```bash
direnv allow
```

Then, from `frontend/`:

```bash
npm ci
npm run dev
npm test
npm run build
```

`npm run build` type-checks, builds `frontend/dist/index.html`, and runs `scripts/check-artifact.mjs` to verify the output is one HTML file with its JavaScript, CSS, and catalog data inline. It needs no API or network connection at runtime. `package-lock.json` is the only lockfile.

## Domain Formula

For tire diameter in inches, engine RPM, transmission ratio, axle ratio, and optional transfer-case stages:

```text
road_speed_mph = engine_rpm * tire_diameter_in * pi
                 / (transmission_ratio * axle_ratio * transfer_case_ratios * 1056)
```

The pure calculation functions live in `frontend/src/calculations.ts`, with focused tests in `frontend/src/calculations.test.ts`.
