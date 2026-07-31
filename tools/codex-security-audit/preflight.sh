#!/usr/bin/env bash
# Verify this machine can actually run Codex Security scans before we spend anything.
# Exits non-zero with a specific reason so run-audit.sh can refuse to start.
set -euo pipefail

CXS="${CXS:-npx --no-install codex-security}"
fail() { printf 'preflight: %s\n' "$1" >&2; exit 1; }

# Node: the package declares ^22.13.0 || ^24 || ^26. Anything else fails at runtime.
command -v node >/dev/null 2>&1 || fail "node not found (need 22.13+, 24.x, or 26.x)"
node_major=$(node -p 'process.versions.node.split(".")[0]')
case "$node_major" in
  22|24|26) ;;
  *) fail "node $(node --version) unsupported (need 22.13+, 24.x, or 26.x)" ;;
esac

# Python: the bundled plugin does the scanning and exporting.
python_bin="${PYTHON:-python3}"
command -v "$python_bin" >/dev/null 2>&1 || fail "$python_bin not found (need 3.10+)"
"$python_bin" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' \
  || fail "$python_bin is older than 3.10"

command -v git >/dev/null 2>&1 || fail "git not found"

$CXS info >/dev/null 2>&1 || fail "codex-security not installed (npm install @openai/codex-security)"

# The real gate. The CLI is open source but the scanner is gated to approved beta
# accounts, so install succeeding proves nothing. A dry-run reports whether the
# stored credentials are actually verified; anything else burns time and fails late.
probe_repo="${1:-$PWD}"
probe=$($CXS scan "$probe_repo" --dry-run --format json 2>&1) \
  || fail "dry-run failed against $probe_repo:
$probe"

if ! grep -q '"verified"[[:space:]]*:[[:space:]]*true' <<<"$probe"; then
  fail "credentials are not verified — scans will be rejected.
Set CODEX_API_KEY (or OPENAI_API_KEY) for non-interactive use, or run:
  $CXS login
Full-repository scans may additionally require Trusted Access for Cyber.
Dry-run said:
$probe"
fi

echo "preflight: ok — node $(node --version), $($python_bin --version), credentials verified"
