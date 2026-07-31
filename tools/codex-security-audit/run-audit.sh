#!/usr/bin/env bash
# Run the bulk scan. Resumable: re-running against the same --output-dir picks up
# where it stopped, which is what makes this survivable in an ephemeral container.
#
# Usage:  ./run-audit.sh [tier]        # tier: A | B | C  (default: all)
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CXS="${CXS:-npx --no-install codex-security}"
TIER="${1:-}"

# Results MUST live outside every scanned repository, or the scanner ends up
# reading its own output on the next pass.
RESULTS="${RESULTS:-$here/results${TIER:+-$TIER}}"
MANIFEST="${MANIFEST:-$here/work/repositories.csv}"

# Guardrails. This is a metered scan across many repositories; an unbounded run
# is the single most expensive mistake available here.
WORKERS="${WORKERS:-4}"          # concurrent repositories
MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"
MODE="${MODE:-standard}"         # per-repo `mode` column overrides this
EFFORT="${EFFORT:-high}"
MODEL="${MODEL:-gpt-5.6-terra}"
THREADS="${THREADS:-4}"          # agents *within* each scan

"$here/preflight.sh" >&2

[ -f "$MANIFEST" ] || { echo "no manifest at $MANIFEST — run build-manifest.sh first" >&2; exit 1; }

mkdir -p "$RESULTS"
echo "scanning $(($(wc -l < "$MANIFEST") - 1)) repositories (tier=${TIER:-all}, workers=$WORKERS, mode=$MODE, effort=$EFFORT)" >&2
echo "results -> $RESULTS" >&2

# Deliberately no --fail-on-severity here: this is a survey, and a non-zero exit
# partway through would abandon the remaining repositories. Severity gating
# belongs in CI on a single repo, not in the sweep.
$CXS bulk-scan "$MANIFEST" \
  --output-dir "$RESULTS" \
  --workers "$WORKERS" \
  --max-attempts "$MAX_ATTEMPTS" \
  --mode "$MODE" \
  --model "$MODEL" \
  --effort "$EFFORT" \
  --codex "features.multi_agent_v2.max_concurrent_threads_per_session=$THREADS"

echo "scan complete. Next: ./export-findings.sh ${TIER:-}" >&2
