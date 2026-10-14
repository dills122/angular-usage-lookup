# Changelog

## Unreleased

- Admit stable patches within supported Angular/TypeScript/server minor lines,
  retaining exact regression baselines and private compiler/catalog guards.
  Record compatible patches separately in reports; add real 20.3.31 qualification.
- Decouple TypeScript collection from Angular server/service resolution. Mixed
  manifests retain successful TS evidence when Angular qualification fails.
- Align Node support and CI to >=22.22.3 <23 (tested 22.23.3), the common
  declared engine range of the bundled servers, and test engine-strict installs.
- Ship pinned Angular 20/22 server aliases alongside 21 and verify all lines in
  extracted production-only bundles, including the pilot workspace service.
- Add cross-library NgModule source/declaration regressions with spread
  declarations, mapped/unmapped identities and missing-import negative controls.
  Explain DOM-only probe failures without weakening exact identity checks.
- Correct source-install guidance to use the runtime ZIP inside Nx workspaces;
  verify in-workspace release installation does not introduce fixture projects.

- Add paired blind discovery fixtures with independent authored expectations,
  renamed/re-exported symbols, moved external templates, CRLF/UTF-16 ranges and
  transitive app/test/story contexts. Grade native evidence and coverage separately
  from exact location/context matches; retain failed attempts and scope limits.
- Fix explicit compiler candidate verification for transitively imported template
  owners. Preserve exact program/source/declaration evidence and reject foreign
  owners without changing raw Language Service references.
- Keep Nx discovery caches outside scanned workspaces and remove temporary data
  after success or failure. Preserve pre-existing workspace caches untouched.

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
