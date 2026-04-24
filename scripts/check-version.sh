#!/bin/bash
# check-version.sh — Verify all version numbers are in sync
#
# Usage: ./scripts/check-version.sh
#
# Checks version consistency across:
# 1. /VERSION
# 2. /frontend/package.json
# 3. /portal/package.json
# 4. /backend/pyproject.toml
# 5. /backend/src/routers/health.py
# 6. /frontend/src/lib/changelog.ts

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Extract versions from each location
VERSION_FILE=$(cat "$ROOT_DIR/VERSION" | tr -d '\n')
FRONTEND_VERSION=$(grep '"version"' "$ROOT_DIR/frontend/package.json" | head -1 | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/')
PORTAL_VERSION=$(grep '"version"' "$ROOT_DIR/portal/package.json" | head -1 | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/')
BACKEND_VERSION=$(grep '^version' "$ROOT_DIR/backend/pyproject.toml" | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/')
HEALTH_VERSION=$(grep 'version=' "$ROOT_DIR/backend/src/routers/health.py" | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/')
CHANGELOG_VERSION=$(grep 'export const APP_VERSION' "$ROOT_DIR/frontend/src/lib/changelog.ts" | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/')

echo "Version Check"
echo "============="
echo ""
echo "Location                              Version"
echo "----------------------------------------------"
printf "%-37s %s\n" "VERSION (root)" "$VERSION_FILE"
printf "%-37s %s\n" "frontend/package.json" "$FRONTEND_VERSION"
printf "%-37s %s\n" "portal/package.json" "$PORTAL_VERSION"
printf "%-37s %s\n" "backend/pyproject.toml" "$BACKEND_VERSION"
printf "%-37s %s\n" "backend/src/routers/health.py" "$HEALTH_VERSION"
printf "%-37s %s\n" "frontend/src/lib/changelog.ts" "$CHANGELOG_VERSION"
echo ""

# Check if all versions match
EXPECTED="$VERSION_FILE"
MISMATCH=0

if [ "$FRONTEND_VERSION" != "$EXPECTED" ]; then
    echo "❌ MISMATCH: frontend/package.json ($FRONTEND_VERSION) != VERSION ($EXPECTED)"
    MISMATCH=1
fi

if [ "$PORTAL_VERSION" != "$EXPECTED" ]; then
    echo "❌ MISMATCH: portal/package.json ($PORTAL_VERSION) != VERSION ($EXPECTED)"
    MISMATCH=1
fi

if [ "$BACKEND_VERSION" != "$EXPECTED" ]; then
    echo "❌ MISMATCH: backend/pyproject.toml ($BACKEND_VERSION) != VERSION ($EXPECTED)"
    MISMATCH=1
fi

if [ "$HEALTH_VERSION" != "$EXPECTED" ]; then
    echo "❌ MISMATCH: backend/src/routers/health.py ($HEALTH_VERSION) != VERSION ($EXPECTED)"
    MISMATCH=1
fi

if [ "$CHANGELOG_VERSION" != "$EXPECTED" ]; then
    echo "❌ MISMATCH: frontend/src/lib/changelog.ts ($CHANGELOG_VERSION) != VERSION ($EXPECTED)"
    MISMATCH=1
fi

if [ "$MISMATCH" -eq 0 ]; then
    echo "✅ All versions match: $EXPECTED"
    exit 0
else
    echo ""
    echo "Run ./scripts/bump-version.sh $EXPECTED to fix"
    exit 1
fi
