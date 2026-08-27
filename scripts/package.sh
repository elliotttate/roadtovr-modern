#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
dist_dir="$project_dir/dist"
archive="$dist_dir/roadtovr-horizon.zip"

mkdir -p "$dist_dir"
rm -f "$archive"

cd "$project_dir"
zip -qr "$archive" manifest.json README.md PRIVACY.md SECURITY.md src popup assets docs -x '*.DS_Store'
echo "$archive"
