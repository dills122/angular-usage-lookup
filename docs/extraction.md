# Standalone extraction — 2026-10-13

Created at the owner's request as `/Users/dsteele/repos/angular-usage-lookup`.
The original Research Depot idea remains a historical snapshot; ongoing code and
skill work belongs in this repository. No upstream Git history was available to
split because the source Research Depot files had no commits.

The extraction copies the portable skill, all fixture/oracle generators and tests,
and research/review/decision evidence. Generated results, dependencies, caches and
machine-specific AI context were excluded. Archived Markdown links were adjusted
to the new relative skill path. The helper package name changed from
`angular-usage-lookup-pilot` to `angular-usage-lookup`; dependency versions remained
unchanged. The owner subsequently selected MIT; root and portable package metadata
identify Dylan Steele and the intended `dills122/angular-usage-lookup` GitHub
repository. Both source and release bundle include the license. `private: true`
prevents accidental npm publication; the supported distribution is the skill ZIP.

The relocated bundle smoke test exposed a CLI entry-point bug: Node resolves an
ES module's real path, but the command-line script path can still contain a
symlink. The collector and Material catalog now compare real paths. Two focused
regressions first reproduced the silent exit, then verified direct and symlinked
invocation. Analysis algorithms and the original fixture oracles are unchanged.

New repository tooling supplies native validation, deterministic ZIP builds,
packaging regressions, production-install smoke tests, GitHub Actions quality
jobs and a fully gated draft-release workflow. AI Central was installed through
its maintained dry-run/apply workflow; local source skill links remain portable
and trackable, while shared AI Central links are locally excluded.

## Validation at the new path

Local qualification passed on 2026-10-13 (America/Toronto), Node 22.23.3:

| Gate | Result |
| --- | --- |
| Ordinary regressions, including both CLI symlink regressions | 31/31, 50.03 seconds |
| Rendering gauntlet | 1/1, 17.98 seconds; 109 reconciled locations, 47 template occurrences |
| Generated 54-library/three-app Nx qualification | 1/1, 184.20 seconds; 63 card configs |
| Card locations / location-config pairs | 489/489 and 8,015/8,015 |
| Dialog locations / location-config pairs | 114/114 and 2,184/2,184; 61 configs, two explicit scope exclusions |
| Deterministic archive, inventory/hashes, missing/version/symlink guards | 5/5 packaging tests |
| Production-only extracted installation | 11 Angular and 18 TS dialog locations; discovery and Material catalog pass |
| Catalog from installed bundle | 74 typed entrypoints, 37 families, three reviewed opener rules |
| Other checks | Skill metadata, local links/JSON/JS syntax, actionlint and issue-form YAML pass |
| AI Central | Source audit passes; refresh preserves files/exclusions; all 21 shared links resolve and are ignored |

All 139 original portable-package files are present. Fixture sources and oracles
are byte-identical to the Research Depot snapshot. The four changed original
files are the two package manifests (name/license/metadata) and two CLI entry
points (symlink fix). New instructions, license and entry-point regressions are
additions. Dependency versions and collection/catalog algorithms are unchanged.

The full `npm run check` passed after the portability fix. Subsequent changes
added the owner-selected MIT license, package metadata and onboarding files;
validation, all five packaging tests and the rebuilt installed-bundle smoke test
passed again. The README's first-lookup command also passed. No additional lookup
behavior changed. License equality and package metadata are now validation gates.

The full run log and generated evidence are under ignored `test-output/` and
`skill/angular-usage-lookup/test-output/`; a compact durable record is in
[extraction-validation.json](extraction-validation.json). AI Central verification
and bootstrap/source-audit logs remain under `test-output/`.

These are local macOS results; Linux GitHub Actions execution and release
publication have not run. The task creates a local Git repository on `main`
without a remote, commits or tags. Review intended GitHub visibility, run hosted
CI and update the README's pre-release note when the first push is authorized.
