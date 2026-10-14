# Angular rendering gauntlet — 2026-10-13

Decision: can the skill reconcile static migration usages across diverse ways of
displaying Angular content, beyond the already-qualified 54-library scale fixture?

Budget: one bounded, generated rendering matrix using the existing Angular/TS
services, compiler, CDK and Material; add only the matching official router to the
isolated test harness. No new analysis engine or service. This is the owner's
authorized continuation. Stop after the matrix compiles, every discrepancy has an
investigation outcome, regressions pass, and remaining limits are documented.

Acceptance criteria defined before lookup:

- Compile real Angular 21 templates and router/API calls with strict templates.
- Author expected locations independently of reference-service responses. Preserve
  missing cases; use explicit follow-up evidence rather than shrinking the oracle.
- Cover legacy and modern conditionals, iteration/switch, deferred branches,
  template contexts/outlets/recursion, projection/fallback, custom structural
  directives, deeply nested views, inline/external and mixed module scopes.
- Cover eager/lazy/nested routes, lazy NgModules, namespace/default/destructured
  imports, dynamic components, registries, wrappers, CDK portals and Material
  component/template openers. Negative lookalikes must not become confirmations.
- Separate declaration/import/registration references from template occurrences,
  indirect render sites and potential runtime choices. A compiler pass is not
  proof that a view executes or that a conditional branch is reachable.
- Check exact positive/negative locations and config contexts, process cleanup,
  source hashes, and all peculiar cases. Retain raw evidence in ignored output.

## Progress

- [x] Author generated fixtures and independent expected evidence.
- [x] Compile and run initial collection; retain failures.
- [x] Investigate misses/ambiguities with upstream reference queries and source.
- [x] Qualify follow-ups and negative cases; run relevant regressions and scale.
- [x] Update skill guidance, results, limits, brief, index and decisions.
