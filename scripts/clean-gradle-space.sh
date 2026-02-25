#!/bin/bash
# Safe Gradle cleanup - frees ~10 GB. No project will break.
# Next time you run ./gradlew or build Android, Gradle will re-download only what it needs.

set -e

echo "=== Gradle space cleanup (safe - no project break) ==="

# 1. Global Gradle cache (~9.3 GB) - SAFE: re-downloads on next build
if [ -d "$HOME/.gradle/caches" ]; then
  echo "Cleaning global Gradle caches..."
  rm -rf "$HOME/.gradle/caches"/*
  echo "  Done: .gradle/caches"
fi

# 2. Gradle daemon logs (~61 MB) - SAFE: daemon restarts automatically
if [ -d "$HOME/.gradle/daemon" ]; then
  echo "Cleaning Gradle daemon..."
  rm -rf "$HOME/.gradle/daemon"/*
  echo "  Done: .gradle/daemon"
fi

# 3. Temp files (~223 MB) - SAFE
if [ -d "$HOME/.gradle/.tmp" ]; then
  echo "Cleaning Gradle temp..."
  rm -rf "$HOME/.gradle/.tmp"/*
  echo "  Done: .gradle/.tmp"
fi

# 4. Kotlin profile (~2 MB) - SAFE
if [ -d "$HOME/.gradle/kotlin-profile" ]; then
  echo "Cleaning Kotlin profile..."
  rm -rf "$HOME/.gradle/kotlin-profile"/*
  echo "  Done: .gradle/kotlin-profile"
fi

echo ""
echo "=== Cleanup complete. Space freed: ~9.5–10 GB ==="
echo "Next Android build may take a bit longer (re-downloads dependencies)."
du -sh "$HOME/.gradle" 2>/dev/null || true
