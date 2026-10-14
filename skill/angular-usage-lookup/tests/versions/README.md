# Isolated modern profiles

Run `npm run setup:versions` from the repository root, then `npm run test:versions`.
Each profile has its own exact lockfile and generated ignored workspace. It
resolves its own compiler, TypeScript, language server/service and Nx, without
altering baseline dependencies. Evidence is written to the skill's
`test-output/versions/angular20` and `angular22` directories.

The fixtures compile through Nx 23.3.0 and query actual language servers. Authored
positive and negative cases cover compound/alternative selectors, decorator
input/output aliases, host composition, pipe transform, signal inputs/outputs,
model binding, external templates and `@if`/`@for`/`@defer`. These are bounded API
qualifications, not the full Material inventory or a browser application.

| Core / compiler / service | TypeScript | Server |
| --- | --- | --- |
| 20.3.33 | 5.9.3 | 20.3.0 |
| 22.2.2 | 6.0.3 | 22.2.2 |

The collector rejects unqualified combinations and checks actual startup version
logs. Angular 20's server release differs from its compatible service patch.
The compiler candidate backend deliberately stays pinned to Angular 21.2.25;
these version tests do not qualify its internal enablement option on other majors.
