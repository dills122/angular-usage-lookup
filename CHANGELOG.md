# Changelog

## Unreleased

- Strengthen extracted-bundle tests to isolate production language tools from
  checkout dependencies and verify actual loaded service paths.

- Qualify exact Angular 20.3.33/TS 5.9.3 and Angular 22.2.2/TS 6.0.3 profiles
  with isolated locks, real Nx typechecks, selector/host/pipe and signal API tests.
  Verify actual server startup versions and prefer matching workspace tools.
- Add a 102-library/three-app, 111-config Nx workload with independent exact
  location/context oracles alongside the existing 54-library gate.
- Add explicit, Angular 21.2.25-guarded compiler candidate evidence for static
  directive associations when language-service definitions are absent or mixed.
  Preserve native source mapping, declaration identity and indirect host matches.

- Add exact TypeScript identity fallback for package imports whose Angular
  definition response is empty, preserving the original response and alias chain.
- Add explicit template candidate verification with separate native definition
  evidence, config ownership checks and unresolved gaps. Reproduce Angular 21's
  generic component/directive reference omission and recover known candidates
  without rewriting raw reference results.
- Expand Material qualification to a frozen inventory of all 182 public
  component/directive classes and their selector alternatives, including abstract
  TypeScript-only exports, inline/external templates and modern control flow.

## 0.1.0 — 2026-10-14

- Validate the actual skill ZIP with a fresh-context agent on a transformed
  54-library/three-app Nx workspace, with private authored expectations and
  component/MatDialog reconciliation. Add repeatable trial preparation, exact
  grading checks and a manual behavioral release gate.

- Fix the TypeScript language-service host contract on case-sensitive systems,
  with exact-definition/reference regressions for both host modes. The initial
  Linux CI run exposed a boolean passed where TypeScript requires a function.
- Configure GitHub main/tag rules, repository metadata and squash-merge defaults.
- Extract the tested Angular usage lookup skill and its Angular/TypeScript/Nx
  helpers from Research Depot.
- Include Material family/catalog metadata, explicit scope/identity verification,
  lazy/render-path guidance and mandatory peculiar-case investigations.
- Preserve ordinary regressions, rendering gauntlet and 54-library/three-app tests.
- Add deterministic skill ZIPs, dependency locks, file manifests/checksums,
  production-install smoke tests, CI and tag-triggered draft releases.
- Fix collector and Material catalog CLI invocation through skill directory
  symlinks and operating-system temporary-directory aliases.
- License the repository and shipped skill under MIT, identify the author and
  GitHub project, and add user onboarding and contribution guidance.

This is a qualified Angular 21 pilot. See `docs/known-limits.md` before making
coverage or runtime claims.
