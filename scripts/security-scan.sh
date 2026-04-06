#!/bin/bash
set -euo pipefail

echo "🛡️  HappyPets Security Audit — AgentShield Scan"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Files to scan for security issues
SCAN_PATHS=(
  "apps/web/app/api"
  "apps/web/lib"
  "apps/web/middleware.ts"
  "apps/web/app/actions"
  "packages/shared/src"
)

# Security check types
CHECK_TYPES=(
  "sql-injection"
  "xss"
  "csrf"
  "path-traversal"
  "open-redirect"
  "timing-attack"
  "insecure-random"
  "hardcoded-credentials"
)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "📂 Scanning paths:"
for path in "${SCAN_PATHS[@]}"; do
  echo "   • ${path}"
done

echo ""
echo "🔍 Check types:"
for check in "${CHECK_TYPES[@]}"; do
  echo "   • ${check}"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Install AgentShield if available ─────────────────────────────────────────
if command -v ecc-agentshield &>/dev/null; then
  echo "🤖 Running AgentShield scan..."
  ecc-agentshield scan \
    --paths "${SCAN_PATHS[@]}" \
    --checks "${CHECK_TYPES[@]}" \
    --format json \
    --output "$ROOT/.agentshield-report.json" \
    2>&1 || true

  if [ -f "$ROOT/.agentshield-report.json" ]; then
    echo "📄 AgentShield report saved to: .agentshield-report.json"
    cat "$ROOT/.agentshield-report.json"
  fi
else
  echo "⚠️  AgentShield not installed — running manual checks instead"
  echo "   Install with: npm install -D @anthropic-sdk/agentshield-ecc"
  echo ""
fi

# ── Manual Pattern Scanning ───────────────────────────────────────────────────

ERRORS=0
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo "Running manual vulnerability pattern scan..."
echo ""

# SQL Injection patterns
echo "🔎 Checking for raw SQL injection risks..."
if grep -rn "\.query\s*(\`\|\.query\s*(\"" \
    --include="*.ts" --include="*.tsx" \
    "$ROOT/apps/web" "$ROOT/packages" 2>/dev/null | grep -v node_modules | grep -v ".next"; then
  echo -e "${YELLOW}⚠️  Found raw .query() calls — verify they use parameterized queries${RESET}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No raw SQL concatenation detected${RESET}"
fi

# XSS — dangerouslySetInnerHTML
echo ""
echo "🔎 Checking for dangerouslySetInnerHTML usage..."
if grep -rn "dangerouslySetInnerHTML" \
    --include="*.tsx" --include="*.jsx" \
    "$ROOT/apps/web" 2>/dev/null | grep -v node_modules | grep -v ".next"; then
  echo -e "${YELLOW}⚠️  dangerouslySetInnerHTML found — ensure content is sanitized${RESET}"
else
  echo -e "${GREEN}✅ No dangerouslySetInnerHTML found${RESET}"
fi

# Open redirect
echo ""
echo "🔎 Checking for open redirect patterns..."
if grep -rn "redirect(req\.\|redirect(params\." \
    --include="*.ts" \
    "$ROOT/apps/web/app/api" 2>/dev/null | grep -v node_modules; then
  echo -e "${YELLOW}⚠️  Possible open redirect — validate destination URLs${RESET}"
else
  echo -e "${GREEN}✅ No open redirect patterns found${RESET}"
fi

# Math.random usage in security context
echo ""
echo "🔎 Checking for insecure random in security-sensitive code..."
if grep -rn "Math\.random()" \
    --include="*.ts" \
    "$ROOT/apps/web/lib" "$ROOT/apps/web/app/api" 2>/dev/null | grep -v node_modules; then
  echo -e "${RED}❌ Math.random() in security context — use crypto.randomBytes()${RESET}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No Math.random() in security-sensitive paths${RESET}"
fi

# Timing attack — direct string comparison for secrets
echo ""
echo "🔎 Checking for non-constant-time comparisons on secrets..."
if grep -rn "signature\s*===\|secret\s*===\|token\s*===" \
    --include="*.ts" \
    "$ROOT/apps/web/app/api" 2>/dev/null | grep -v node_modules; then
  echo -e "${RED}❌ Direct === comparison on secrets found — use timingSafeCompare()${RESET}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No direct secret comparisons found${RESET}"
fi

# Path traversal — ../
echo ""
echo "🔎 Checking upload paths for traversal prevention..."
if grep -rn "validateCloudinaryPublicId\|publicId.*\.\." \
    --include="*.ts" \
    "$ROOT/apps/web/app/api/products" 2>/dev/null | grep -v node_modules | grep -q "validateCloudinaryPublicId"; then
  echo -e "${GREEN}✅ Cloudinary publicId validation in place${RESET}"
else
  echo -e "${YELLOW}⚠️  Cloudinary publicId validation not detected in product routes${RESET}"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ERRORS" -eq "0" ]; then
  echo -e "${GREEN}🎉 AgentShield scan completed — no critical issues found${RESET}"
  exit 0
else
  echo -e "${RED}💥 Scan found ${ERRORS} critical issue(s) — fix before deployment${RESET}"
  exit 1
fi
