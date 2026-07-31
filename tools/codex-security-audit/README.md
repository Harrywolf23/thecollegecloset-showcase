# Codex Security multi-repo audit harness

Scaffolding for a recurring security audit across a GitHub account using
[`@openai/codex-security`](https://github.com/openai/codex-security).

**Status: staged, not runnable.** The CLI is Apache-2.0 and installs fine, but the
scanner behind it is gated to approved beta accounts. Everything here is ready to
execute the day access lands; `preflight.sh` refuses to start until then.

## What this does and does not do

`bulk-scan` is already a parallel, resumable, multi-repository scanner. There is no
reason to reimplement that. This harness supplies only the parts around it:

| Layer | Owner |
| --- | --- |
| Concurrent repository scanning, retries, resume | `codex-security bulk-scan` |
| Agents *within* one scan | `features.multi_agent_v2` |
| Tiering, manifest generation, SHA pinning | `build-manifest.sh` |
| Guardrails, orchestration | `run-audit.sh` |
| Export, triage, cross-repo patterns, PRs | `export-findings.sh` + review pass |

Parallelism is two-level: `--workers` (repositories at once) × `max_concurrent_threads_per_session`
(agents inside each scan). Default 4 × 4.

## Setup

```bash
npm install @openai/codex-security          # needs Node 22.13+/24/26, Python 3.10+
export CODEX_API_KEY=...                    # or: npx codex-security login
cp tiers.example.csv tiers.csv              # then fill it in
```

## Run

```bash
./preflight.sh                 # refuses to proceed unless credentials are verified
./build-manifest.sh A          # clone/refresh tier A, pin SHAs, emit repositories.csv
./run-audit.sh A               # bulk scan
./export-findings.sh A         # SARIF + JSON per repository
```

Then triage the JSON: dedupe, rank, and look for one root cause repeated across
repositories. Run `codex-security validate` on ambiguous findings before escalating,
and `codex-security patch` to draft fixes — one draft PR per repository, never
auto-merged.

## Two undocumented constraints

Both were found by reading the `bulk-scan` CSV parser, not the docs, and both are
fatal if you guess wrong:

1. **`revision` must be a full 40- or 64-character Git SHA.** `main`, `HEAD`, and
   short SHAs are all rejected. `build-manifest.sh` resolves them.
2. **`id` must match `^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`** and be unique
   case-insensitively — so `owner/repo` is invalid.

Related: the parser rejects `https://` URLs that carry a username, so token-in-URL
auth for private repositories does not work. This harness clones locally and puts
filesystem paths in the manifest instead.

## Known blocker: output-path ownership

The scanner walks the full ancestor chain of `--output-dir` and requires every
level to have a trusted owner, failing with:

```
Scan output parent must have a trusted owner: /
```

In a Claude Code web container this fires for *every* output path, because `/` is
owned by `claude:ubuntu` while the shell runs as `root` — so no directory can
satisfy the check. Confirmed by running `bulk-scan` here: the manifest parsed and
the task started, then failed on this check alone.

Remedies, in order of preference:

1. Run the sweep somewhere `/` is root-owned — a normal laptop, VM, or CI runner.
2. Run as the uid that owns `/`.
3. `chown root:root /` inside the container. It works, but it is a system-level
   change to a shared root — do not do it silently.

This is independent of the beta-access gating; both must be resolved before a real
scan runs.

## Cost

Metered AI scans across dozens of repositories at `deep`/`xhigh` is the main runaway
risk. Pilot one tier-A repository, measure, then extrapolate before committing to a
full sweep. `codex-security scan` accepts `--max-cost`; `bulk-scan` does not expose
it, so bound the sweep with tiering and `--mode` instead.

## Handling findings

Results are real vulnerabilities in mostly-private repositories. `.gitignore` here
excludes `work/`, `results*/`, `exports*/`, and `tiers.csv` — this showcase
repository is public. Keep findings in private PRs; never put details in a public
issue tracker or PR body.

This container is ephemeral. Push `results*/` to a private repository between runs
or the resumable state is lost.

## Recurring operation

- Weekly: full sweep on tier A, then `codex-security scans compare BEFORE AFTER`
  for drift (new / persisting / reopened / resolved).
- Per-change: `codex-security scan . --diff origin/main` on active repositories.
- `codex-security install-hook` for a pre-commit scan on tier A.
- CI gate: `--fail-on-severity high` belongs on a single repository, not the sweep —
  a non-zero exit mid-sweep abandons the remaining repositories.
