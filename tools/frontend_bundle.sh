#!/usr/bin/env bash
set -euo pipefail

output_tar="$1"
shift

workspace="${BUILD_WORKSPACE_DIRECTORY:-$(pwd)}"
frontend_dir="${workspace}/frontend"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to build the frontend; install Node.js 20+ first" >&2
  exit 1
fi

if [[ ! -f "${frontend_dir}/package-lock.json" ]]; then
  echo "frontend/package-lock.json is required for a reproducible npm build" >&2
  echo "Run npm install in frontend/ once, then check in the generated lockfile" >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT
npm ci --prefix "${frontend_dir}" --cache "${tmp_dir}/npm-cache" --ignore-scripts
npm run build --prefix "${frontend_dir}"
tar -C "${frontend_dir}" -cf "${output_tar}" dist