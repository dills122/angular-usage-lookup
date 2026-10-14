# Skill plus collection helpers

Updated 2026-10-13 after the owner authorized the Angular 21 example and two-project Nx extension. The initial pilot and requested six-library/Material extension are implemented; see [initial results](pilot-results.md) and [expanded results](stress-results.md). Broader workspace/API qualification remains open.

## Implemented division of work

| Piece | Existing tool | Glue retained here |
| --- | --- | --- |
| Semantics | Official Angular server/service 21.2.25 | Fresh server per manifest config, file synchronization, probes and references |
| Discovery | Installed Nx CLI or angular.json; TypeScript config APIs | `scripts/discover.mjs` emits inventory and errors |
| Protocol | Microsoft's JSON-RPC/LSP libraries | `scripts/lsp.mjs` bounds requests and cleans up |
| Evidence | Official definition/reference responses | `scripts/collect-references.mjs` retains ranges, hashes and contexts |
| Reconciliation | Existing `rg` plus source inspection | Skill classifies usages, resolves candidates and explains implications |

Scripts live inside the [skill package](../../skill/angular-usage-lookup/SKILL.md). The extension adds `scripts/typescript.mjs`, a public TypeScript language-service adapter for TS-only consumers and alias navigation. No persistent service, custom compiler analyzer or MCP integration is needed for the proved path. An existing Angular-aware editor/MCP connection remains an alternative after qualification. [S2–S4, S8, S16–S18; see sources.md.]

## Completed pilot

1. Defined expected references before implementation. The single-project example returns all 11 expected spans, including three template instances, and excludes unrelated identical names/selectors.
2. Added two Nx applications with shared source, barrel/path alias, standalone and NgModule consumers. Official CLI discovery finds both projects. Collection returns 10 distinct spans with accurate contexts and three template instances.
3. Verified ranges, missing-config/wrong-probe/timeout failures, process cleanup, no source/config mutation and report destination protection. Angular compiler checks run directly and through Nx. Nine tests pass.
4. Connected skill instructions to commands and collection-stage JSON. Reconciled additional fixture text matches and retained observed results/limitations. Dependencies are locked in the isolated helper package.

Discovery is not silently treated as verified coverage. The skill compares its inventory with the explicit manifest and records omissions. Known backend-appropriate identity probes are required per config; configs without them remain unresolved, not proven unused.

## Next decision-changing work

The requested [Material catalog extension](material-catalog-results.md) is implemented separately: TypeScript exports/types, Angular's pinned private metadata reader and selector parser supply family/lookup data. Six integration tests exercise difficult metadata and failure cases. The [runbook](../../skill/angular-usage-lookup/references/material-catalog.md) makes the distinction from application usage explicit.

1. Supply one Angular 21 workspace and exact component/Material family target. Inventory every relevant build/test/story config, reconcile candidates, and compare known locations with an Angular editor baseline. Record setup burden, unexpected contexts and resource use.
2. Add an attribute directive and aliased input/output fixture after the component trial. Reuse official references/definitions and add glue only for demonstrated gaps.
3. Exercise source versus built `.d.ts` identity and shared-template owners before advertising those scopes. Keep runtime registries and remote consumers explicit.

Success remains an independently reviewed exact inventory with no false targets and every declared config accounted for. Failed probes and unresolved identity remain gaps. Version updates require fixture requalification; the current collector is a narrow Angular 21.2.25 pilot.

Migration execution, public packaging, automatic installation into target repositories and a persistent MCP service remain separate follow-on work. No commit, publication or application migration was performed.

## Generated scale qualification — 2026-10-13

The owner selected a generated 50+ library/three-app workload. The [scale plan](scale-vetting-plan.md) and [results](scale-results.md) extend the original pilot with independent location/context oracles, 54 libraries/three apps, overlapping leaf configs, bounded API identity tests and an investigated peculiar ledger. Corrections remain small Angular/TypeScript integration glue. The next gate is a supervised supplied-workspace sample; do not infer production accuracy or human usefulness from synthetic counts.

## Rendering gauntlet — 2026-10-13

The owner's requested [gauntlet](gauntlet-plan.md) and [results](gauntlet-results.md) add real lazy routing, mixed scopes, deeply nested/recursive templates, portals, dynamic component/template APIs and negative controls. Existing Angular/TS tools supply evidence; the skill supplies source-linked alias and render-path reconciliation. Two runtime choices remain explicitly unresolved. The official matching router is the only new test dependency; no new service or production analyzer is introduced.
