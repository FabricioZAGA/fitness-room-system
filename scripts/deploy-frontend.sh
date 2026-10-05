#!/usr/bin/env bash
# Deploy admin and/or portal static sites to S3 + CloudFront with correct cache headers.
#
# Usage:
#   ./scripts/deploy-frontend.sh admin      # Build + deploy admin only
#   ./scripts/deploy-frontend.sh portal     # Build + deploy portal only
#   ./scripts/deploy-frontend.sh both       # Build + deploy both
#   SKIP_BUILD=1 ./scripts/deploy-frontend.sh portal   # Upload existing dist/ without rebuilding
#
# Why this script exists:
#   A plain `aws s3 sync --delete` uploads index.html WITHOUT Cache-Control. Browsers then
#   cache it heuristically; after the next deploy the stale index.html points at a hashed
#   bundle that no longer exists in S3 -> CloudFront serves index.html for the 404 -> the
#   browser gets HTML where it expected JS -> React never mounts -> black screen.
#
#   Correct pattern (same as infrastructure/buildspec-frontend.yml):
#     - hashed assets      -> public, max-age=31536000, immutable
#     - index.html / *.json -> no-cache, no-store, must-revalidate

set -euo pipefail

PROFILE="salle-cajas"
ADMIN_BUCKET="fitness-room-frontend-prod-948999370306"
PORTAL_BUCKET="fitness-room-portal-prod-948999370306"
ADMIN_CF="E1B51EPZN5PP0I"
PORTAL_CF="E1VDFNEUSV0C0D"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

IMMUTABLE_CC="public, max-age=31536000, immutable"
NOCACHE_CC="no-cache, no-store, must-revalidate"

TARGET="${1:-}"
if [[ ! "$TARGET" =~ ^(admin|portal|both)$ ]]; then
  echo "Usage: $0 <admin|portal|both>"
  exit 1
fi

# upload_dist <dist_dir> <bucket>
# Uploads a Vite build with the cache-header split described above.
upload_dist() {
  local dist="$1" bucket="$2"

  # 1. Hashed assets: long-lived, immutable. --delete prunes old hashes.
  aws s3 sync "$dist/" "s3://$bucket" \
    --delete \
    --cache-control "$IMMUTABLE_CC" \
    --exclude "index.html" \
    --exclude "*.json" \
    --profile "$PROFILE" --only-show-errors

  # 2. Entry point + manifests: always revalidate.
  aws s3 cp "$dist/index.html" "s3://$bucket/index.html" \
    --content-type "text/html" \
    --cache-control "$NOCACHE_CC" \
    --profile "$PROFILE" --only-show-errors

  # Any *.json at root (manifest, version, etc.) — optional, may not exist.
  find "$dist" -maxdepth 1 -name "*.json" -print0 2>/dev/null | while IFS= read -r -d '' f; do
    aws s3 cp "$f" "s3://$bucket/$(basename "$f")" \
      --cache-control "$NOCACHE_CC" \
      --profile "$PROFILE" --only-show-errors
  done
}

# invalidate <distribution_id>
invalidate() {
  local cf="$1"
  aws cloudfront create-invalidation \
    --distribution-id "$cf" --paths "/*" \
    --profile "$PROFILE" --output text --query 'Invalidation.Id' \
    | xargs -I{} echo "   Invalidation: {}"
}

# deploy_site <src_dir> <bucket> <cf_id> <label>
deploy_site() {
  local src="$1" bucket="$2" cf="$3" name="$4"

  if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
    echo "🏗️  [$name] Building..."
    (cd "$src" && npm run build --silent)
  fi

  if [[ ! -f "$src/dist/index.html" ]]; then
    echo "❌ [$name] $src/dist/index.html not found — build failed or SKIP_BUILD without dist/"
    exit 1
  fi

  echo "📤 [$name] Uploading to s3://$bucket ..."
  upload_dist "$src/dist" "$bucket"

  echo "🔄 [$name] Invalidating CloudFront $cf ..."
  invalidate "$cf"

  echo "✅ [$name] Deployed"
}

echo ""
[[ "$TARGET" == "both" || "$TARGET" == "admin" ]]  && deploy_site "$ROOT_DIR/frontend" "$ADMIN_BUCKET"  "$ADMIN_CF"  "Admin"
[[ "$TARGET" == "both" || "$TARGET" == "portal" ]] && deploy_site "$ROOT_DIR/portal"   "$PORTAL_BUCKET" "$PORTAL_CF" "Portal"
echo ""
echo "Done! CloudFront propagation takes ~30-60 seconds."
