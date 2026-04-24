#!/bin/bash
# bump-version.sh — Centralized version management for Fitness Room System
#
# Usage: ./scripts/bump-version.sh <new_version>
# Example: ./scripts/bump-version.sh 1.6.0
#
# Updates version in all required locations:
# 1. /VERSION (root)
# 2. /frontend/package.json
# 3. /portal/package.json
# 4. /backend/pyproject.toml
# 5. /backend/src/routers/health.py
# 6. /frontend/src/lib/changelog.ts (APP_VERSION only, manual changelog entry needed)

set -e

NEW_VERSION="$1"

if [ -z "$NEW_VERSION" ]; then
    echo "Usage: $0 <new_version>"
    echo "Example: $0 1.6.0"
    exit 1
fi

# Validate version format (semver)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version must be in semver format (e.g., 1.6.0)"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Bumping version to $NEW_VERSION..."

# 1. Update /VERSION
echo "$NEW_VERSION" > "$ROOT_DIR/VERSION"
echo "✓ Updated VERSION"

# 2. Update frontend/package.json
sed -i '' "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$NEW_VERSION\"/" "$ROOT_DIR/frontend/package.json"
echo "✓ Updated frontend/package.json"

# 3. Update portal/package.json
sed -i '' "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$NEW_VERSION\"/" "$ROOT_DIR/portal/package.json"
echo "✓ Updated portal/package.json"

# 4. Update backend/pyproject.toml
sed -i '' "s/^version = \"[0-9]*\.[0-9]*\.[0-9]*\"/version = \"$NEW_VERSION\"/" "$ROOT_DIR/backend/pyproject.toml"
echo "✓ Updated backend/pyproject.toml"

# 5. Update backend/src/routers/health.py
sed -i '' "s/version=\"[0-9]*\.[0-9]*\.[0-9]*\"/version=\"$NEW_VERSION\"/" "$ROOT_DIR/backend/src/routers/health.py"
echo "✓ Updated backend/src/routers/health.py"

# 6. Update frontend/src/lib/changelog.ts APP_VERSION
sed -i '' "s/export const APP_VERSION = \"[0-9]*\.[0-9]*\.[0-9]*\"/export const APP_VERSION = \"$NEW_VERSION\"/" "$ROOT_DIR/frontend/src/lib/changelog.ts"
echo "✓ Updated frontend/src/lib/changelog.ts (APP_VERSION)"

echo ""
echo "=========================================="
echo "Version updated to $NEW_VERSION"
echo "=========================================="
echo ""
echo "IMPORTANT: You still need to manually:"
echo "1. Add a new changelog entry at the TOP of frontend/src/lib/changelog.ts"
echo "2. Add a new section at the TOP of CHANGELOG.md"
echo ""
echo "Changelog entry template:"
echo "  {"
echo "    version: \"$NEW_VERSION\","
echo "    date: \"$(date +%Y-%m-%d)\","
echo "    title: \"Your title here\","
echo "    items: ["
echo "      { icon: \"🔧\", text: \"Change description\" },"
echo "    ],"
echo "  },"
echo ""
