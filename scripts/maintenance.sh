#!/usr/bin/env bash
# Toggle maintenance mode for admin and/or portal
# Usage:
#   ./scripts/maintenance.sh on          # Both sites → maintenance
#   ./scripts/maintenance.sh off         # Both sites → restore
#   ./scripts/maintenance.sh on admin    # Only admin
#   ./scripts/maintenance.sh on portal   # Only portal
#   ./scripts/maintenance.sh off admin   # Restore only admin
#   ./scripts/maintenance.sh off portal  # Restore only portal

set -euo pipefail

PROFILE="salle-cajas"
ADMIN_BUCKET="fitness-room-frontend-prod-948999370306"
PORTAL_BUCKET="fitness-room-portal-prod-948999370306"
ADMIN_CF="E1B51EPZN5PP0I"
PORTAL_CF="E1VDFNEUSV0C0D"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MAINTENANCE_DIR="$ROOT_DIR/maintenance"

ACTION="${1:-}"
TARGET="${2:-both}"

if [[ -z "$ACTION" || ! "$ACTION" =~ ^(on|off)$ ]]; then
  echo "Usage: $0 <on|off> [admin|portal|both]"
  echo ""
  echo "  on   — Deploy maintenance page"
  echo "  off  — Restore live application"
  exit 1
fi

deploy_maintenance() {
  local bucket="$1" cf="$2" name="$3"
  echo "🔧 [$name] Uploading maintenance page..."
  aws s3 sync "$MAINTENANCE_DIR/" "s3://$bucket" --delete --cache-control "no-cache, no-store, must-revalidate" --profile "$PROFILE" --quiet
  echo "🔄 [$name] Invalidating CloudFront cache..."
  aws cloudfront create-invalidation --distribution-id "$cf" --paths "/*" --profile "$PROFILE" --output text --query 'Invalidation.Id' | xargs -I{} echo "   Invalidation: {}"
  echo "✅ [$name] Maintenance mode ON"
}

restore_site() {
  local target="$1"
  # Delegates to deploy-frontend.sh so cache headers are always correct
  # (index.html no-cache, hashed assets immutable).
  "$ROOT_DIR/scripts/deploy-frontend.sh" "$target"
}

echo ""
if [[ "$ACTION" == "on" ]]; then
  echo "=== MAINTENANCE MODE: ON ==="
  [[ "$TARGET" == "both" || "$TARGET" == "admin" ]] && deploy_maintenance "$ADMIN_BUCKET" "$ADMIN_CF" "Admin"
  [[ "$TARGET" == "both" || "$TARGET" == "portal" ]] && deploy_maintenance "$PORTAL_BUCKET" "$PORTAL_CF" "Portal"
else
  echo "=== RESTORING LIVE SITES ==="
  restore_site "$TARGET"
fi

echo ""
echo "Done! CloudFront propagation takes ~30-60 seconds."
