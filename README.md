# Transmission Ratio Viz

Local development is driven through Bazelisk. `direnv` adds `env/bin` to `PATH`, where the Bazelisk and Node/NVM bootstrap shims live. The first `node`, `npm`, or `npx` invocation installs the pinned NVM release and the Node.js version from `.nvmrc` into the ignored `env/nvm/` directory. The Bazel toolchain pins Python 3.11 for the backend; the frontend bundle requires a checked-in npm lockfile.

## Bazel

```bash
direnv allow
bazelisk build //...
bazelisk test //...
```

The Node version can also be managed directly:

```bash
nvm install 20.18.1
node --version
npm --version
```

The `node`, `npm`, and `npx` commands automatically select the version in `.nvmrc` for each invocation.

The main targets are:

- `//backend:server` — Python API executable
- `//tests:calculations_test` — backend calculation test
- `//frontend:bundle` — reproducible frontend production bundle
- `//oci:application_image` — OCI image assembled from the application outputs
- `//oci:application_tarball` — loadable OCI tarball tagged `transmission-ratio-viz:dev`

Before the frontend and OCI targets can build, generate and commit `frontend/package-lock.json` with Node.js 20+:

```bash
cd frontend
npm install
```

## Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
uvicorn backend.app:app --reload
```

Run the calculation tests with:

```bash
pytest
```

## Frontend

Build the production bundle with Bazel:

```bash
bazel build //frontend:bundle
```

This creates the bundled frontend output in `bazel-bin/frontend/dist`.

For local frontend development, install the frontend dependencies and run Vite directly:

```bash
cd frontend
npm install
npm run dev
```

If you want to run the app through Bazel-managed JS tooling instead of a raw npm dev server, the frontend build target is:

```bash
bazel build //frontend:bundle
```

The generated bundle is suitable for production and can be served by the backend or by a static host as needed.

