#!/usr/bin/env bash
# Export every completed scan to SARIF + JSON for triage.
#
# SARIF is the interchange format (GitHub code scanning, most viewers);
# JSON is what the triage pass actually reads.
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CXS="${CXS:-npx --no-install codex-security}"
TIER="${1:-}"
RESULTS="${RESULTS:-$here/results${TIER:+-$TIER}}"
EXPORTS="${EXPORTS:-$here/exports${TIER:+-$TIER}}"

[ -d "$RESULTS" ] || { echo "no results at $RESULTS" >&2; exit 1; }
mkdir -p "$EXPORTS"

count=0
# Each repository gets its own scan directory under the bulk-scan output dir.
for scan_dir in "$RESULTS"/*/; do
  [ -d "$scan_dir" ] || continue
  id=$(basename "$scan_dir")
  case "$id" in checkouts|logs|tmp) continue ;; esac

  # --source-root gives SARIF stable source-line fingerprints, so findings can be
  # matched across runs instead of reappearing as new every time.
  src="$here/work/$id"
  src_arg=()
  [ -d "$src" ] && src_arg=(--source-root "$src")

  for fmt in sarif json; do
    out="$EXPORTS/$id.$fmt"
    if $CXS export "$scan_dir" --export-format "$fmt" --output "$out" "${src_arg[@]}" 2>/dev/null; then
      count=$((count + 1))
    else
      echo "warn: export failed for $id ($fmt) — scan may be incomplete" >&2
    fi
  done
done

echo "exported $count artifacts -> $EXPORTS" >&2
echo "Nothing here is safe to publish: these are real findings for private repositories." >&2
