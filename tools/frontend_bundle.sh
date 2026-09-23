#!/usr/bin/env bash
set -euo pipefail

output_tar="${1:?usage: frontend_bundle.sh OUTPUT_TAR [extra args]}"
shift

frontend_dir=""
for arg in "$@"; do
  case "${arg}" in
    frontend/package-lock.json|*/package-lock.json|package-lock.json)
      frontend_dir="$(dirname "${arg}")"
      break
      ;;
  esac
done

if [[ -z "${frontend_dir}" ]]; then
  workspace="${BUILD_WORKSPACE_DIRECTORY:-$(pwd)}"
  frontend_dir="${workspace}/frontend"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to build the frontend; install Node.js 20+ first" >&2
  exit 1
fi
npm_bin="$(command -v npm)"

if [[ ! -f "${frontend_dir}/package-lock.json" ]]; then
  echo "frontend/package-lock.json is required for a reproducible npm build" >&2
  echo "Run npm install in frontend/ once, then check in the generated lockfile" >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT
"${npm_bin}" ci --prefix "${frontend_dir}" --cache "${tmp_dir}/npm-cache" --ignore-scripts
"${npm_bin}" run build --prefix "${frontend_dir}"
tar -C "${frontend_dir}" -cf "${output_tar}" dist