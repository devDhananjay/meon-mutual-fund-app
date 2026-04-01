#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"

echo "Project root: $ROOT_DIR"
echo "Android dir : $ANDROID_DIR"

if [[ ! -d "$ANDROID_DIR" ]]; then
  echo "Android directory not found. Exiting."
  exit 1
fi

echo ""
echo "Disk usage before cleanup:"
du -sh "$ANDROID_DIR" 2>/dev/null || true

echo ""
echo "Stopping Gradle daemons..."
"$ANDROID_DIR/gradlew" --stop >/dev/null 2>&1 || true

echo "Removing Android build/caches..."
rm -rf "$ANDROID_DIR/.gradle-user-home/caches"
rm -rf "$ANDROID_DIR/.gradle-user-home/daemon"
rm -rf "$ANDROID_DIR/.gradle-user-home/native"
rm -rf "$ANDROID_DIR/.gradle"
rm -rf "$ANDROID_DIR/build"
rm -rf "$ANDROID_DIR/app/build"
rm -rf "$ANDROID_DIR/app/.cxx"
rm -rf "$ANDROID_DIR/.cxx"

echo ""
echo "Disk usage after cleanup:"
du -sh "$ANDROID_DIR" 2>/dev/null || true

echo ""
echo "Done. Next run:"
echo "  cd android && ./gradlew clean"
