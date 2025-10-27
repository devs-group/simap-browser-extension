#!/bin/bash

set -euo pipefail

PROJECT_NAME="simap-project-notes"
MANIFEST_PATH="manifest.json"
CI_MODE=0
VERSION_ARG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ci)
      CI_MODE=1
      shift
      ;;
    --version)
      VERSION_ARG="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ ! -f "$MANIFEST_PATH" ]]; then
  echo "manifest.json not found. Run this script from the repository root."
  exit 1
fi

current_version=$(python3 - <<'PY'
import json
with open("manifest.json", "r", encoding="utf-8") as f:
    data = json.load(f)
print(data.get("version", "0.0.0"))
PY
)

echo "Current version: ${current_version}"

new_version=""

if [[ $CI_MODE -eq 1 ]]; then
  tag_version="$VERSION_ARG"
  if [[ -z "$tag_version" ]]; then
    tag_version=$(git describe --tags --exact-match 2>/dev/null || true)
  fi

  if [[ -z "$tag_version" ]]; then
    echo "Unable to determine tag version in CI mode. Pass --version or run on a tagged commit."
    exit 1
  fi

  if [[ "$tag_version" == v* ]]; then
    new_version="${tag_version#v}"
  else
    new_version="$tag_version"
  fi

  if [[ "$new_version" != "$current_version" ]]; then
    echo "manifest version ($current_version) must match tag version ($new_version) in CI mode."
    exit 1
  fi
else
  if [[ -z "$VERSION_ARG" ]]; then
    read -rp "Enter new version (x.y.z): " VERSION_ARG
  fi

  new_version="$VERSION_ARG"

  if [[ ! $new_version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Version must match the format x.y.z"
    exit 1
  fi

  is_higher=$(python3 - <<PY
def parse(v):
    return tuple(int(part) for part in v.split("."))

cur = parse("$current_version")
new = parse("$new_version")
print("yes" if new > cur else "no")
PY
)

  if [[ "$is_higher" != "yes" ]]; then
    echo "New version must be greater than current version."
    exit 1
  fi

  python3 - <<PY
import json
with open("$MANIFEST_PATH", "r", encoding="utf-8") as f:
    manifest = json.load(f)
manifest["version"] = "$new_version"
with open("$MANIFEST_PATH", "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)
    f.write("\n")
PY

  git add "$MANIFEST_PATH"
  git commit -m "Release v$new_version"
  git tag -a "v$new_version" -m "Release v$new_version"
fi

# Ensure dist directory exists
mkdir -p dist

zip_name="dist/${PROJECT_NAME}-${new_version}.zip"
if [[ -f "$zip_name" ]]; then
  rm "$zip_name"
fi

zip -r "$zip_name" . \
  -x "*.git*" \
  -x "dist/*" \
  -x "deploy.sh" \
  -x "webstore/*" \
  -x "simap.png"

echo "Created $zip_name"
