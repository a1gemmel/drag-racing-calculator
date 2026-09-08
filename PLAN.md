# Transmission Ratio Viz Development

## Current Implementation Slice

The first vertical slice is a local gearing workspace:

- React and TypeScript frontend scaffold
- Python calculation module for RPM, tire circumference, and road speed
- FastAPI service boundary reserved for saved configurations and future typed RPC contracts
- Transmission and transfer-case data represented as editable configuration objects

Quarter-mile simulation, persistence, generated transport contracts, and deployment remain follow-up slices.

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

The current OCI image is an artifact assembly scaffold without a pinned Python runtime base. A later container slice must add a digest-pinned Python base and package the backend runtime dependencies before the image is production-runnable. The frontend target requires Node.js 20+ and a checked-in `frontend/package-lock.json`; those cannot be generated on the current machine because Node/npm are not installed.