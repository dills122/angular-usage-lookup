# Known limits

- The collector admits stable Angular/TypeScript minor lines 20.3/5.9, 21.2/5.9
  and 22.2/6.0. Exact baselines are 20.3.33/5.9.3, 21.2.25/5.9.3 and
  22.2.2/6.0.3; 20.3.31 is additionally exercised. Patch compatibility does not
  establish that every patch passed regression tests.
  The full Material matrix/catalog and compiler candidate fallback use Angular
  21.2.25 / Material 21.2.14; their private/internal Angular APIs remain guarded.
- Config manifests and known identity probes are explicit. A loaded server or
  zero references do not establish whole-workspace coverage.
- Raw references require skill reconciliation. Renamed lazy locals need verified
  source relationships and separate queries. Non-bindable descendants can appear
  in Angular's reference results even though they are inactive.
- Angular 21 reference results can omit generic component/directive templates.
  The explicit candidate-definition workflow can recover exact identities while
  keeping the raw omission visible. Absent/ambiguous definitions and shared
  ownership remain unresolved by the default backend. An explicit Angular 21
  compiler fallback verifies direct component/directive associations using native
  source spans and exact declaration references. It does not cover member APIs,
  pipes or indirect host applications. Candidate text alone is never confirmation.
- Runtime registry keys, conditional route choices, remote/federated consumers
  and arbitrary reflection/dataflow are not generally decidable statically.
- Cross-library NgModule source aliases and ngc declarations with/without maps
  are tested. Arbitrary built package/source identity, shared-template per-owner routing, actual
  Jest/Storybook integrations and API shapes beyond the fixtures need further
  qualification. Peak memory and production usefulness are not yet measured.
- Generated compiler/reference tests do not exercise browser route navigation,
  overlays, recursive view counts or runtime rendering. The helper output remains
  partial until the skill reconciles the declared scope.

See [acceptance cases](../skill/angular-usage-lookup/references/acceptance-cases.md)
and the [research results](research/README.md) for tested subsets and peculiar ledgers.
