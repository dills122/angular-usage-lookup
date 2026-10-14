# Isolated modern profiles

Run `npm run setup:versions` from the repository root, then `npm run test:versions`.
Each profile has its own exact lockfile and generated ignored workspace. It
resolves its own compiler, TypeScript, language server/service and Nx, without
altering baseline dependencies. Evidence is written to the skill's
`test-output/versions/angular20`, `angular20-patch` and `angular22` directories.

The fixtures compile through Nx 23.3.0 and query actual language servers. Authored
positive and negative cases cover compound/alternative selectors, decorator
input/output aliases, host composition, pipe transform, signal inputs/outputs,
model binding, external templates and `@if`/`@for`/`@defer`. These are bounded API
qualifications, not the full Material inventory or a browser application.

| Core / compiler / service | TypeScript | Server |
| --- | --- | --- |
| 20.3.31 | 5.9.3 | 20.3.0 |
| 20.3.33 | 5.9.3 | 20.3.0 |
| 22.2.2 | 6.0.3 | 22.2.2 |

The collector admits stable patches in these major/minor lines, rejects other minor lines and prereleases, and checks actual startup version
logs. Angular 20's server release differs from its compatible service patch.
The compiler candidate backend deliberately stays pinned to Angular 21.2.25;
these version tests do not qualify its internal enablement option on other majors.

The command also runs cross-library NgModule source/declaration regressions for
all three profiles. Exact identity and missing-import negative controls stay
strict. Production-only bundle tests separately prove missing workspace servers
resolve to the matching helper installation.
