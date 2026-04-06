#!/bin/bash
set -euo pipefail

echo "🔒 HappyPets Security Audit — AgentShield Scan"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

PASS="${GREEN}✅ PASS${RESET}"
FAIL="${RED}❌ FAIL${RESET}"
WARN="${YELLOW}⚠️  WARN${RESET}"

ERRORS=0

# ── Helper functions ─────────────────────────────────────────────────────────

check() {
  local label="$1"
  local result="$2"
  if [ "$result" = "0" ]; then
    echo -e "  ${PASS}  ${label}"
  else
    echo -e "  ${FAIL}  ${label}"
    ERRORS=$((ERRORS + 1))
  fi
}

warn() {
  echo -e "  ${WARN}  $1"
}

section() {
  echo ""
  echo -e "${BLUE}── $1 ──${RESET}"
}

# ── 1. Dependency Audit ───────────────────────────────────────────────────────
section "NPM Dependency Audit"

if command -v pnpm &>/dev/null; then
  pnpm audit --audit-level=high 2>/dev/null && check "No high/critical vulnerabilities" "0" || {
    warn "pnpm audit found issues — review above output"
    ERRORS=$((ERRORS + 1))
  }
else
  warn "pnpm not found — skipping dependency audit"
fi

# ── 2. Secret Scanning (git history) ─────────────────────────────────────────
section "Secret Scanning"

# Check for hardcoded secrets in tracked files
SECRET_PATTERNS=(
  "sk_live_"           # Stripe live key
  "rzp_live_"          # Razorpay live key
  "SUPABASE_SERVICE_ROLE"
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"  # JWT tokens
  "cloudinary://"
  "postgres://"
)

FOUND_SECRETS=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  if git -C "$(dirname "$0")/.." grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" \
      -e "$pattern" \
      -- ':!*.env*' ':!node_modules' ':!.next' ':!dist' 2>/dev/null | grep -v "example\|placeholder\|YOUR_" | grep -q .; then
    echo -e "  ${FAIL}  Possible hardcoded secret found: ${pattern}"
    FOUND_SECRETS=1
    ERRORS=$((ERRORS + 1))
  fi
done

if [ "$FOUND_SECRETS" = "0" ]; then
  check "No hardcoded secrets detected in source" "0"
fi

# Check .env files are not tracked
if git -C "$(dirname "$0")/.." ls-files | grep -q "^\.env$\|^\.env\.local$\|^\.env\.production$"; then
  echo -e "  ${FAIL}  .env file is tracked by git — add to .gitignore immediately!"
  ERRORS=$((ERRORS + 1))
else
  check ".env files are not tracked by git" "0"
fi

# ── 3. API Security Checks ────────────────────────────────────────────────────
section "API Route Security"

API_DIR="apps/web/app/api"
ROOT="$(dirname "$0")/.."

# Check that all routes use authentication
UNPROTECTED=0
while IFS= read -r file; do
  # Skip webhook routes (they use signature-based auth)
  if echo "$file" | grep -q "webhook"; then
    continue
  fi
  # Check for getUser or auth check
  if ! grep -q "getUser\|auth\.getUser\|withSecurityHeaders" "$file" 2>/dev/null; then
    warn "Route may lack auth check: ${file#$ROOT/}"
    UNPROTECTED=$((UNPROTECTED + 1))
  fi
done < <(find "$ROOT/$API_DIR" -name "route.ts" -type f)

if [ "$UNPROTECTED" = "0" ]; then
  check "All API routes appear to have auth checks" "0"
fi

# Check for console.log in API routes (should use secureLog)
CONSOLE_LOGS=$(grep -rn "console\.log(" "$ROOT/$API_DIR" 2>/dev/null | grep -v "// " | wc -l | tr -d ' ')
if [ "$CONSOLE_LOGS" -gt "0" ]; then
  warn "${CONSOLE_LOGS} console.log() calls found in API routes (use secureLog instead)"
else
  check "No raw console.log in API routes" "0"
fi

# ── 4. Security Headers Check ─────────────────────────────────────────────────
section "Security Headers Middleware"

SECURITY_HEADERS_FILE="$ROOT/apps/web/app/api/security-headers.ts"
if [ -f "$SECURITY_HEADERS_FILE" ]; then
  check "security-headers.ts exists" "0"

  for header in "X-Content-Type-Options" "X-Frame-Options" "Strict-Transport-Security" "Content-Security-Policy"; do
    if grep -q "$header" "$SECURITY_HEADERS_FILE"; then
      check "$header defined" "0"
    else
      echo -e "  ${FAIL}  $header missing from security-headers.ts"
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo -e "  ${FAIL}  security-headers.ts not found"
  ERRORS=$((ERRORS + 1))
fi

# ── 5. Security Library Check ────────────────────────────────────────────────
section "Security Library (lib/security.ts)"

SECURITY_LIB="$ROOT/apps/web/lib/security.ts"
if [ -f "$SECURITY_LIB" ]; then
  check "security.ts exists" "0"

  for fn in "timingSafeCompare" "verifyRazorpaySignature" "validateCloudinaryPublicId" "secureLog"; do
    if grep -q "export function ${fn}" "$SECURITY_LIB"; then
      check "${fn} exported" "0"
    else
      echo -e "  ${FAIL}  ${fn} missing from security.ts"
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo -e "  ${FAIL}  lib/security.ts not found"
  ERRORS=$((ERRORS + 1))
fi

# ── 6. Environment Variables Check ───────────────────────────────────────────
section "Environment Variables"

REQUIRED_ENV_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "RAZORPAY_KEY_ID"
  "RAZORPAY_KEY_SECRET"
  "RAZORPAY_WEBHOOK_SECRET"
  "CLOUDINARY_CLOUD_NAME"
  "CLOUDINARY_API_KEY"
  "CLOUDINARY_API_SECRET"
)

ENV_FILE="$ROOT/apps/web/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="$ROOT/apps/web/.env"
fi

if [ -f "$ENV_FILE" ]; then
  for var in "${REQUIRED_ENV_VARS[@]}"; do
    if grep -q "^${var}=" "$ENV_FILE"; then
      check "${var} defined" "0"
    else
      echo -e "  ${FAIL}  Missing env var: ${var}"
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  warn "No .env file found at ${ENV_FILE} — ensure env vars are set in deployment"
fi

# ── Final Report ──────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ERRORS" -eq "0" ]; then
  echo -e "${GREEN}🎉 Security audit passed — 0 issues found${RESET}"
  exit 0
else
  echo -e "${RED}💥 Security audit failed — ${ERRORS} issue(s) found${RESET}"
  echo "   Please fix the issues above before deploying to production."
  exit 1
fi
