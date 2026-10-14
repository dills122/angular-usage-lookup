# Rendering gauntlet — 2026-10-13

The new matrix passes after explicit skill reconciliation. It recovered **seven
references missed by a class-only query** and rejected **one inactive tag reported
by Angular Language Service**. Those corrections are preserved separately from
the raw provider evidence; the collector was not changed to guess aliases or
silently filter results. Two runtime choices remain unresolved. [S25, S26]

## Scope and independent oracle

The [plan](gauntlet-plan.md) predates collection. The [generator](../../skill/angular-usage-lookup/tests/gauntlet/workspace.mjs)
authors exact TS tokens and template start tags before querying either service.
All 18 source/config/oracle files are hashed before compilation and collection.
The fixture uses one strict Angular program to vary rendering mechanisms; the
separate scale workload covers 54 libraries, three apps and 63 leaf configs.

Installed Angular/compiler/Language Service/router **21.2.25**, TypeScript
**5.9.3**, Material/CDK **21.2.14**, Node **22.23.3**. Only the matching official
router was added as an isolated dev dependency. Its installation reported zero
npm advisories; that is an installation-time observation, not a security audit.
No application dependency, production collector or Material catalog code changed.

| Area | Exercised cases |
| --- | --- |
| Legacy views | `*ngIf`, then/else fragments, explicit `[ngIf]`, `*ngFor`, explicit `ngFor`, `ngSwitchCase`/default, nested structural views |
| Modern views | `@if`/else-if/else, `@for`/`@empty`, `@switch`, `@let`, all four `@defer` branches, nested defer, 48 alternating legacy/modern nested views |
| Fragments and content | Context/injector outlets, two outlets sharing a fragment, recursive outlet, unused fragment, projection slots/fallback, `ngProjectAs`, custom structural directive, embedded views via both APIs |
| Scopes and source forms | NgModule declarations/re-exports, standalone importing modules, modules importing standalone, inline/external templates, same-line tags, self-closing tags, CRLF and emoji |
| Routes | Eager, renamed/default/namespace imports, named/default/destructured/namespace lazy components, lazy route array, lazy NgModule, nested routes, named outlet, registry and conditional factories |
| Dynamic components | `ViewContainerRef.createComponent`, core `createComponent`, deprecated component-factory path, standalone and module-backed `NgComponentOutlet`, registry/property/wrapper follow-ups |
| Portals and Material | Component/Template/DOM portals, `CdkPortal`, portal outlets, real dialog/bottom-sheet/snack-bar component and template overloads, literal computed method access, misleading local `.open()` |
| APIs and negatives | Signal input/output public aliases, `model()` two-way binding, queried component/type references, unrelated same-name/selector scope, comment/encoded/string markup, non-bindable child versus active host |

This tests legacy **syntax on Angular 21**, not old Angular releases. A compiled
`@defer` block does not prove its dependency gets a separate lazy bundle when
that component also has eager uses. No browser was launched, routes navigated,
portals attached or overlays opened at runtime.

## Measured lookup results

| Target | Raw references | Reconciled locations | Template occurrences | Correction |
| --- | ---: | ---: | ---: | --- |
| `GauntletCard` | 57 | 56 | 44 | Reject one descendant beneath `ngNonBindable`; retain active host |
| `LegacyCard` | 8 | 8 | 3 | None; includes dependency through module-backed component outlet |
| `DynamicCard` | 38 | 45 | 0 | Add seven source-linked local-alias references |
| Total | 103 | 109 | 47 | No missing/extra locations against the final oracle after reconciliation |

The seven recovered locations are **related local symbols**, not the same class
declaration. They remain labeled source-linked alias references. The 109 total
includes declarations, imports, registrations, types, queries and other TS
dependencies; it is not 109 render sites. A fake `.open(DynamicCard)` is still a
real class dependency, but is excluded from Material opener classification.

Further independent checks:

- Seven member queries match **16 exact locations**, including signal aliases,
  the model binding and fields referenced by Angular outlets.
- Seven TS property/method/local queries match **18 exact locations** for
  registries, wrappers, factories and queried templates.
- TypeScript resolves **11 opener signatures**: ten Material calls, including
  generic/template consumers, and one local lookalike rejected as Material.
- **12 source-reviewed relationships** connect identifier-free default lazy
  routes, lazy route arrays/NgModules, template queries and repeated/recursive
  outlets to their source endpoints. These are authored skill investigations,
  not automatically inferred whole-program dataflow.
- Every Angular child exits, every returned config context is the declared
  program, and all 18 frozen input hashes remain unchanged. Raw reports remain
  `partial`; every TS-only row retains its template capability gap.

The [machine summary](gauntlet-qualification-summary.json) retains these counts,
location discrepancies, corrections and explicit gaps. Do not add the auxiliary
query denominators together as if they were distinct component usages.

## Peculiar investigation ledger

| ID | Observation and checks | Outcome / report correction |
| --- | --- | --- |
| G1 | Class query misses renamed destructured lazy bindings in routes and dialog/create calls. A direct alias probe fails exact-class identity. Verify the imported property through TS definitions and the binding's import initializer; query the distinct local variable. | `recovered-miss`: three source chains recover seven exact binding/use locations. Preserve distinct-symbol identity and query each relevant program. |
| G2 | Initial expected set omitted the named/default export aliases returned by TS; an opener count also omitted the generic wrapper's call. Inspect source and resolved declarations. Two draft template syntax errors were caught by `ngc` before lookup. | `explained`: fix fixture/oracle authoring errors, add positive alias expectations and the fifth dialog call; never drop missing usages to pass. Initial failure artifacts are retained. |
| G3 | LS returns a component tag under `ngNonBindable`. Inspect Angular AST ancestry and emitted `ɵɵdisableBindings`/element/`ɵɵenableBindings` sequence; add a positive component host carrying that attribute. | `explained`: reject the descendant as inactive Angular usage, preserve its raw reference/collateral and retain the host. New skill instruction and regression. |
| G4 | Default-export `loadComponent` has no class token. Follow the explicit import path to the verified default export. Follow `loadChildren` into route arrays and NgModules. | `explained`: retain source-reviewed route relationships separately from class-reference spans; compilation alone is not navigation proof. |
| G5 | Repeated/recursive outlets and template-based openers can display one fragment several times; an unused fragment is still returned. Inspect fragment/query/outlet endpoints. | `already-accounted-for`: keep one physical template dependency plus display relationships; runtime multiplicity/reachability is not established. |
| G6 | `.open()` can be unrelated, while `dialog['open']()` is a real Material API. Resolve actual TS signatures and component/template overloads. | `explained`: local lookalike is a TS dependency, not a Material render call. Shared template opener content is counted once. |
| G7 | `REGISTRY[key]` has two statically visible component values. Inspect registry, callers and typed open API. | `unresolved`: caller-provided key can select either component. Preserve a conditional candidate; caller/runtime constraints are the next discriminating evidence. |
| G8 | Conditional lazy route chooses between two components with `Math.random()`. Inspect factory and both target declarations. | `unresolved`: both candidates are real dependencies; the selected runtime component cannot be established statically. Runtime input/trace is needed. |

All eight items were investigated: **one recovered miss, four explained, one
already accounted for, two unresolved**. Other pre-existing scale gaps, including
shared-template per-owner routing, are still present; this pass does not close them.

## Reproduce and interpret

From [the skill package](../../skill/angular-usage-lookup/package.json):

```sh
npm run test:gauntlet
npm test
npm run test:scale
```

| Final run | Result | Wall time |
| --- | --- | ---: |
| Rendering gauntlet | Pass, one matrix qualification | 20.63 s |
| Existing regressions | 29/29 pass | 55.91 s |
| Large Nx qualification | Pass; 63 configs compile, 489 card and 114 dialog spans, 8,015/2,184 context pairs, no mismatches | 213.64 s |

The fresh scale rerun is preserved in the machine summary without rewriting the
earlier scale experiment's historical timings. The final gauntlet uses singleton
deep-loop data so its 48-level fixture does not imply an exponential runtime fanout.
The
[qualification harness](../../skill/angular-usage-lookup/tests/gauntlet/qualification.test.mjs)
and [follow-ups](../../skill/angular-usage-lookup/tests/gauntlet/followups.mjs) retain raw
reports, first-pass evidence, alias identities, source edges, member locations,
resolved opener signatures and compiler output under ignored `test-output/gauntlet`.
`first-pass-workspace` preserves the initial source/oracle alongside its reports.

The new [portable rendering runbook](../../skill/angular-usage-lookup/references/rendering-paths.md)
incorporates the findings. This was an author-directed fixture test, not a blind
evaluation of an agent following the skill. It supports the tested static paths;
it does not establish a 95% production accuracy or human-helpfulness score.
Built package identity, real test/story integrations, remote/federated consumers,
arbitrary runtime dataflow, other Angular versions and production resource use
remain outside this qualification.
