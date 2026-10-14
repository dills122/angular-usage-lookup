# Running a large Angular/Nx lookup

Use this checklist when the workspace has many libraries, applications or overlapping test/story configurations. Keep orchestration in the skill and reuse Nx, Angular, TypeScript and ordinary source search. A new service or semantic engine is not required for the qualified path.

## Scope accounting comes first

1. Run discovery once. Retain project names, every leaf config, solution references, parse errors and versions. Inspect custom executors, file replacements and remote/package boundaries separately.
2. Build a target-specific scope ledger from that inventory. Each config needs one state: analyzed, failed, unresolved, or explicitly excluded with a reason. Empty solution configs can be accounted for through their referenced leaves. A missing positive probe is **unresolved**, not evidence that a project has zero uses.
3. Resolve target identity and its selector/API family. Use the installed Material catalog for package declarations and related classes when relevant. Do not count family membership as an application occurrence.
4. Use `rg` over declared source roots to seed probes and collateral candidates. Verify each chosen probe through definition lookup. A fixture generator can author its own manifest; a real-workspace manifest needs this evidence and must not quietly assume the fixture's layout.

## Collect in bounded batches

Use the [local collector](local-collection.md) with explicit config manifests and an outer process timeout. Keep one target/backend per report and merge by physical location, preserving config/evidence contexts. Sequential collection bounds simultaneous server count; measure before adding concurrency or caching. Do not reuse a report after source/config/dependency changes without requalification.

For ngserver, the query file chooses the default project. A config appearing in logs is not enough. The helper queries a verified consumer uniquely owned by an enabled Angular program; shared roots or external templates with several owners can remain unresolved. Use a config-specific consumer when available. Keep the native query and ownership evidence with the result.

The explicit TypeScript backend covers TS references only. Lazy imported bindings, constant aliases, registry properties and wrapper methods can require follow-up reference queries. Add verified alias probes in **every program containing the affected code**, including downstream apps; recovering a physical location in one program does not recover its other config contexts.

## Reconcile and investigate

Compare collected results with the candidate sweep and scope ledger. Group repeated peculiar symptoms while preserving all affected files/configs. Investigate every group using source, definitions, references, compiler metadata and overloads. Do not let large repeated-template totals hide a missed dialog flow or an unresolved test program.

Classify imports/exports, declarations, registrations, direct templates, code opens and indirect wrapper/host impact separately. A host directive can affect a wrapper instance without appearing as a direct selector use of the host class. Runtime-key selection stays unresolved until its values are established. Plain story render strings require owner/runtime investigation; a selector token alone is not an Angular usage.

## Report measurable claims

- Precision: correct confirmed locations divided by all confirmed locations.
- Recall: recovered expected locations divided by independently established expected locations. This is measurable in a fixture; a real repo usually lacks a complete oracle.
- Context correctness: compare the config set for every location, not just location counts.
- Coverage: every discovered config accounted for, with verified and unresolved totals kept separate.
- Helpfulness: can a reviewer locate consumers, understand their relationship, plan supported migration checks and act on each remaining uncertainty? Review this separately; do not infer a human score from reference recall.

Report per-pattern results beside overall totals. Unknowns are accountable gaps, not recovered usages. A generated passing fixture establishes only its frozen patterns/version/layout; it does not establish 95% accuracy on arbitrary production repositories.

## Reproduce the scale qualification

From the isolated skill directory after authorized dependency setup:

```sh
npm test
npm run test:scale
npm run test:scale:large
```

The scale command generates its workspace under ignored `test-output/scale/workspace`, freezes source hashes and an independent location/context oracle, invokes Nx discovery and Angular compilation, then collects two targets. Reports and measurements are outside the scanned workspace in `test-output/scale`. The generator is test infrastructure, not a production manifest generator. No application packages/configs are upgraded during lookup.

The normal profile has 54 libraries, three apps and 63 nonempty configs.
The large profile doubles each of three dependency chains to 32 features, for
102 libraries, three apps and 111 nonempty configs; its independent artifacts
are under `test-output/scale-large`. Both retain eight auxiliary templates per
feature, negative same-selector scopes and overlapping app/spec/story configs.

The generated apps are source/typecheck fixtures. Their test/story configs exercise overlapping Angular programs; they are not browser, Jest or Storybook runtime qualifications. Include those real integrations in a supplied-workspace trial before claiming them covered.
