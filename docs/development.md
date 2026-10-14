# Development

Install baseline test dependencies with `npm run setup` at repo root; it delegates to
the portable package's `npm ci`. The root has no dependency graph of its own.
Baseline fixtures resolve Angular/TS/Nx from that package's node_modules.
`npm run setup:versions` installs the separate locked Angular 20 and 22 profiles
under `tests/versions/`. Run it before the complete `npm run check` gate.
`npm run test:versions` uses those isolated installations and real Nx typechecks;
it does not modify the baseline or an application dependency tree.

Use the root commands in README. Ordinary regressions cover scopes, API identities,
failure boundaries and catalog metadata. The separate gauntlet covers unusual
rendering and required skill follow-ups. Scale checks actual Nx discovery,
compilation and exact physical/config reference sets. Do not substitute counts
for location equality or weaken expected identities to make a test pass.

`npm run test:material` compiles the frozen public component/directive matrix and
checks each selector alternative in inline/external and control-flow templates.
It compares exact consumer reference spans and verifies omitted occurrences with
separate exact Angular definition or explicit compiler association evidence. Raw misses remain in the summary;
recovery is not reported as reference-query recall. Abstract exports without
selectors use the TypeScript backend. This suite runs separately in CI and is
included in `npm run check`.

`npm run validate` checks skill/author/repository metadata, matching MIT licenses,
release-version consistency, JSON,
JavaScript syntax and local Markdown links/anchors. It excludes generated content
and local AI links. The original author also used Codex's skill-creator validator;
that host-specific tool is not a CI dependency.

Packaging is Python standard library code. `npm run test:packaging` checks bytes,
file inventory/hash manifest, required entries, versions and symlink rejection.
The build allowlist is in `tools/build_bundle.py`. Add a runtime asset there only
when the skill needs it. Do not ship test dependencies or machine-specific context.

CI uses independent jobs for validation/bundling, normal tests, gauntlet, both
scale sizes, Material and modern version profiles. `npm run test:scale:large`
doubles the generated dependency-chain length: 102 libraries, three apps,
111 nonempty configs. It retains independent exact location/context oracles.
Artifacts preserve failures and bundle smoke evidence. Require the CI aggregate
check on protected branches once a GitHub remote exists. Hosted runner results
must be observed separately from local validation.

Use the [fresh-agent evaluation](agent-evaluation.md) when changing skill workflow
or release behavior. It exercises the installed ZIP with a fresh context and
private expectations; it is separate from scripted collector qualification.
The preparation/scoring helpers are development-only. Their regression tests run
with `npm run test:packaging`; the agent itself is not invoked in CI.
