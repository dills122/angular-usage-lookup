# Development

Install test dependencies only with `npm run setup` at repo root; it delegates to
the portable package's `npm ci`. The root has no dependency graph of its own.
Fixtures intentionally resolve Angular/TS/Nx from that package's node_modules.

Use the root commands in README. Ordinary regressions cover scopes, API identities,
failure boundaries and catalog metadata. The separate gauntlet covers unusual
rendering and required skill follow-ups. Scale checks actual Nx discovery,
compilation and exact physical/config reference sets. Do not substitute counts
for location equality or weaken expected identities to make a test pass.

`npm run validate` checks skill/author/repository metadata, matching MIT licenses,
release-version consistency, JSON,
JavaScript syntax and local Markdown links/anchors. It excludes generated content
and local AI links. The original author also used Codex's skill-creator validator;
that host-specific tool is not a CI dependency.

Packaging is Python standard library code. `npm run test:packaging` checks bytes,
file inventory/hash manifest, required entries, versions and symlink rejection.
The build allowlist is in `tools/build_bundle.py`. Add a runtime asset there only
when the skill needs it. Do not ship test dependencies or machine-specific context.

CI uses independent jobs for validation/bundling, normal tests, gauntlet and scale.
Artifacts preserve failures and bundle smoke evidence. Require the CI aggregate
check on protected branches once a GitHub remote exists. Hosted runner results
must be observed separately from local validation.
