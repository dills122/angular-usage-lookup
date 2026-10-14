# Rendering paths and reference traps

Use this checklist when template-only or declaration-only references cannot
explain the candidate sweep. Keep the original backend report, the investigation
and the reconciled inventory separate. A raw provider reference is evidence to
inspect; even the collector's `confirmed` semantic-reference label does not
certify an active component instance. The collector always reports partial.

## Template content versus display sites

- Include content in legacy `*ngIf`/then/else, explicit `ng-template` structural
  bindings, loops/switches, modern `@if`/`@for`/`@empty`/`@switch`/`@let`, and
  every `@defer` main/placeholder/loading/error branch. A class reference does
  not prove the bundle is deferred: other eager uses can prevent deferral.
- Include unused fragments and projection fallback in migration dependencies.
  Do not assume their branches execute. Follow `ngTemplateOutlet`, context and
  injector bindings, queried `TemplateRef` properties, `createEmbeddedView`,
  template portals and Material template overloads to explain display sites.
- A repeated or recursive outlet can render one source fragment many times.
  Keep one physical target occurrence and separate outlet relationships. Do not
  estimate runtime instance counts from reference counts.
- Check `ngNonBindable` ancestry. In the qualified Angular 21.2.25 case, Language
  Service returns a descendant's tag even though the compiler disables directive
  bindings there. Reject that descendant as an active component usage with source
  and Angular parser/compiler evidence. Do **not** discard the element carrying
  `ngNonBindable` itself: its component/directives can still be active. Preserve
  literal HTML as collateral if relevant to a selector migration. Do not add a
  regex subtree filter or silently rewrite the raw backend report.
- Comments, encoded markup and strings passed to `innerHTML` do not instantiate
  the component just because their text contains its selector. A same-selector
  component in another scope is a different identity.

## Lazy imports and route relationships

1. Query the class and verified consumers in each config, then inspect the lazy
   binding. For `const { Target: Local } = await import('./barrel')`, the exported
   property and local variable can be **different TypeScript symbols**.
2. Resolve the imported property through definition lookup to the exact class.
   Inspect the binding/initializer with TypeScript's AST or source. Query ordinary
   TS references on `Local` separately and retain the binding relationship. Do not
   weaken target qualification to accept any nearby variable declaration.
3. For `loadComponent: () => import('./default-page')`, the route contains no
   class identifier. Follow the module's default export to its declaration and
   record the route expression as a source-reviewed relationship. Class reference
   counts alone miss this route site.
4. Follow `loadChildren` into both route arrays and NgModules, then module routes
   and their component template owners. Record nested/named outlet context. A
   conditional route factory retains all possible candidates and an unresolved
   runtime choice; remote modules and arbitrary runtime paths remain gaps.

## Programmatic and indirect display

- Follow component-valued fields into `NgComponentOutlet`, including
  `ngComponentOutletNgModule` for module-declared components. Query the field with
  Angular service to include template expressions; TS-only references omit them.
- Follow direct `createComponent`, resolved component factories, component
  portals, registry properties and wrapper parameters. Query alias/property/
  method references with the existing TS service. A reference to the class in a
  `ViewChild` query or type annotation is a dependency, not another render site.
- Resolve the actual Material method/overload through TypeScript definitions or
  `getResolvedSignature`. Check `MatDialog.open`, `MatBottomSheet.open` and
  `MatSnackBar.openFromComponent`/`openFromTemplate`. An unrelated `.open(Target)`
  is not a Material render call. Literal `dialog['open'](Target)` can still resolve
  to the real API. Inspect component versus template arguments.
- Trace template/content portals to their original Angular template. A DOM
  portal moves existing nodes; it does not establish another component creation.
- A runtime registry key and generic wrapper body do not identify one definite
  component. Keep target-specific call edges separate from generic consumers.

## Qualified test and limits

Run `npm run test:gauntlet` from the isolated skill package. It generates one
strict Angular program, checks an independently authored location oracle, runs
Angular/TS queries, verifies source-linked follow-ups, and preserves raw and
reconciled evidence in `test-output/gauntlet/`. It also inspects compiler output
for the non-bindable counterexample. It is a lookup/compiler test, not a browser
or runtime route/overlay test.

Use `npm test` for smaller regressions and `npm run test:scale` for the separate
54-library/three-app/63-config workload. Neither those fixtures nor this checklist
prove universal coverage or a production accuracy/helpfulness percentage.
