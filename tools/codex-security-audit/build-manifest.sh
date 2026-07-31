#!/usr/bin/env bash
# Turn a human-edited tier list into the strict CSV that `bulk-scan` requires.
#
# Two rules the published docs never state, both discovered by reading the
# bulk-scan parser, and both fatal if you guess:
#
#   1. `revision` MUST be a full 40-char (or 64-char) immutable Git SHA.
#      "main" / "HEAD" / a short SHA are all rejected. This script resolves them.
#   2. `id` MUST match ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ and be unique
#      case-insensitively — so "owner/repo" is invalid. This script sanitizes.
#
# It also clones locally rather than handing GitHub URLs to the scanner: the
# parser rejects https:// URLs carrying a username, so token-in-URL auth for
# private repos does not work. Local checkouts sidestep that entirely.
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
TIERS="${TIERS:-$here/tiers.csv}"
WORK="${WORK:-$here/work}"          # local checkouts (gitignored)
OUT="${OUT:-$here/work/repositories.csv}"
TIER_FILTER="${1:-}"                # optional: only emit rows for one tier
OWNER="${OWNER:-Harrywolf23}"

[ -f "$TIERS" ] || {
  echo "no tier list at $TIERS — copy tiers.example.csv to tiers.csv and fill it in" >&2
  exit 1
}

mkdir -p "$WORK"
printf 'id,repository,revision,mode,scope\n' > "$OUT"

emitted=0
# Columns: id,repo,tier,mode,scope
while IFS=, read -r id repo tier mode scope; do
  [ -z "${id:-}" ] && continue
  [ "$id" = "id" ] && continue                      # header
  case "$id" in \#*) continue ;; esac               # comment

  id=$(printf '%s' "$id" | tr -cd 'A-Za-z0-9._-')
  [ -n "$TIER_FILTER" ] && [ "$tier" != "$TIER_FILTER" ] && continue

  checkout="$WORK/$id"
  if [ -d "$checkout/.git" ]; then
    git -C "$checkout" fetch --quiet --prune origin || {
      echo "warn: fetch failed for $repo, using existing checkout" >&2
    }
  else
    echo "cloning $repo ..." >&2
    git clone --quiet "https://github.com/$OWNER/$repo.git" "$checkout" || {
      echo "warn: clone failed for $repo — skipping (is it attached to this session?)" >&2
      rm -rf "$checkout"
      continue
    }
  fi

  # Resolve the default branch tip to a full SHA. Pinning makes the run
  # reproducible and lets bulk-scan resume against identical inputs.
  head_ref=$(git -C "$checkout" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)
  [ -z "$head_ref" ] && head_ref="origin/HEAD"
  sha=$(git -C "$checkout" rev-parse "$head_ref" 2>/dev/null || git -C "$checkout" rev-parse HEAD)

  if ! [[ "$sha" =~ ^[0-9a-f]{40}$|^[0-9a-f]{64}$ ]]; then
    echo "warn: could not resolve a full SHA for $repo — skipping" >&2
    continue
  fi

  printf '%s,%s,%s,%s,%s\n' "$id" "$checkout" "$sha" "${mode:-standard}" "${scope:-}" >> "$OUT"
  emitted=$((emitted + 1))
done < "$TIERS"

echo "manifest: $emitted repositories -> $OUT" >&2
[ "$emitted" -gt 0 ] || { echo "manifest is empty; bulk-scan would reject it" >&2; exit 1; }
