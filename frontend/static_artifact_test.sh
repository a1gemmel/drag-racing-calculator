#!/usr/bin/env bash
set -euo pipefail

index_file="${1:?standalone HTML file is required}"

test -f "${index_file}"
! grep -Eq '<script[^>]+src=|<link[^>]+href=' "${index_file}"
grep -q 'Transmission Ratio Viz' "${index_file}"