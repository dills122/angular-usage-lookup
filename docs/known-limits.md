# Known limits

- The collector is pinned to Angular 21.2.25 / TypeScript 5.9.x; the catalog uses
  an exact compiler/Material profile and a private Angular metadata reader.
- Config manifests and known identity probes are explicit. A loaded server or
  zero references do not establish whole-workspace coverage.
- Raw references require skill reconciliation. Renamed lazy locals need verified
  source relationships and separate queries. Non-bindable descendants can appear
  in Angular's reference results even though they are inactive.
- Runtime registry keys, conditional route choices, remote/federated consumers
  and arbitrary reflection/dataflow are not generally decidable statically.
- Built package/source identity, shared-template per-owner routing, actual
  Jest/Storybook integrations and API shapes beyond the fixtures need further
  qualification. Peak memory and production usefulness are not yet measured.
- Generated compiler/reference tests do not exercise browser route navigation,
  overlays, recursive view counts or runtime rendering. The helper output remains
  partial until the skill reconciles the declared scope.

See [acceptance cases](../skill/angular-usage-lookup/references/acceptance-cases.md)
and the [research results](research/README.md) for tested subsets and peculiar ledgers.
