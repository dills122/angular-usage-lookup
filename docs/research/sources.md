# Source register

All external sources accessed 2026-10-13. Documentation/source pages without a visible publication date are marked undated; access date is not publication date. Moving `main` URLs are evidence of inspected behavior, not pinned Angular 21 contracts. No application code was supplied.

| ID | Primary source and URL | Publication / revision | What it supports / limitation |
| --- | --- | --- | --- |
| S0 | Owner's request and follow-up in this chat | 2026-10-13 | Skill-first lookup, existing tooling preference, modern/current LTS target. User requirement. |
| S1 | [Angular releases](https://angular.dev/reference/releases), [compatibility](https://angular.dev/reference/versions) | Living docs; publication date not shown | Angular 21 is newest LTS at access; Angular 22 active; 21.x requires TypeScript >=5.9 <6.0 in the displayed table. Recheck at execution. |
| S2 | [Angular Language Service](https://angular.dev/tools/language-service) | Undated living docs | Inline/external templates, Angular-aware navigation, editor integrations, ngserver probe options, strictTemplates guidance. |
| S3 | [Angular language-server session source](https://raw.githubusercontent.com/angular/vscode-ng-language-service/main/server/src/session.ts) | Moving main; commit not pinned | `onReferences` delegates to `getReferencesAtPosition`; project association/analysis and template-owner lookup exist. Inspected source, not executed here. |
| S4 | [Reference implementation](https://raw.githubusercontent.com/angular/angular/main/packages/language-service/src/references_and_rename.ts), [upstream tests](https://raw.githubusercontent.com/angular/angular/main/packages/language-service/test/references_and_rename_spec.ts) | Moving main; commit not pinned | TCB-to-source mapping; tests assert component/directive class-to-template references, alias and two-way-binding cases. Upstream tests were read, not run. |
| S5 | [Component selectors](https://angular.dev/guide/components/selectors) | Undated living docs | Selector forms and compile-time matching. Literal class-name/tag search is insufficient. |
| S6 | [Programmatic rendering](https://angular.dev/guide/components/programmatic-rendering) | Undated living docs | NgComponentOutlet, ViewContainerRef/createComponent, dynamic imports. No claim of exhaustive static dataflow resolution. |
| S7 | [Directive composition](https://angular.dev/guide/directives/directive-composition-api) | Undated living docs | hostDirectives and exposed/aliased APIs; composition needs distinct classification. |
| S8 | [Nx CLI commands](https://nx.dev/docs/reference/nx-commands) | Living docs, v23 view at access | Project/config discovery and JSON output; installed Nx version must support chosen flags. |
| S9 | [Nx MCP reference](https://nx.dev/docs/reference/nx-mcp) | Living docs, v23 view at access | Default minimal mode hides workspace/generator tools in favor of skills. Does not document Angular template reference lookup. |
| S10 | [Angular 21 CLI MCP](https://v21.angular.dev/ai/mcp), [current CLI MCP](https://angular.dev/ai/mcp) | Living docs; v21 page footer 21.2.25; current footer 22.2.2 | Documented tool catalogs, angular.json-based list_projects and read-only/local-only flags; neither catalog lists general semantic references. Absence is limited to these catalogs. |
| S11 | [TemplateTypeChecker interface](https://raw.githubusercontent.com/angular/angular/main/packages/compiler-cli/src/ngtsc/typecheck/api/checker.ts) | Moving main; commit not pinned | Internal compiler APIs for templates/symbols/directives; used-directives aggregation is not an occurrence manifest. |
| S12 | [ts-morph finding references](https://ts-morph.com/navigation/finding-references) | Undated maintainer docs | Existing TS reference wrapper; this page does not establish Angular template resolution. |
| S13 | [mcp-language-server](https://github.com/isaacphi/mcp-language-server) | Moving README; publication date not shown | Generic stdio LSP bridge, references tool; maintainer lists tested servers, excluding Angular, and labels software beta. Angular pairing untested here. |
| S14 | [cclsp](https://github.com/ktnyt/cclsp/blob/main/README.md) | Moving README; publication date not shown | Configurable servers and name-based references. No Angular-specific claim found in inspected README. Not adopted. |
| S15 | [Angular issue 69768](https://github.com/angular/angular/issues/69768) | Opened 2026-07-14; issue shown open at access | Reporter describes external-template association failures in solution-style Nx workspaces. A reported defect, not independently reproduced or proof that every LTS installation is affected. |
| S16 | [Microsoft Node language-server protocol packages](https://github.com/microsoft/vscode-languageserver-node) | Moving README; publication date not shown; follow-up access 2026-10-13 | Microsoft supplies vscode-jsonrpc for message transport and vscode-languageserver-protocol for protocol definitions. Supports reusing protocol libraries, not a claim that application lifecycle/project loading is automatic. |
| S17 | [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) | Living maintainer wiki; follow-up access 2026-10-13 | Existing compiler/configuration APIs and program-building examples; implementation must confirm installed API/version instead of recreating config parsing. |

## Access limitations

Attempts to retrieve Angular `21.2.0` reference source through web fetch returned cache misses; direct GitHub raw/tag requests returned HTTP 404. Alternate `21.0.x`/`v21.2.0` web paths also failed. Accordingly, implementation findings use the available main snapshots and must be confirmed against installed LTS packages in the pilot. Do not infer that the release itself is absent from these fetch failures.

No third-party Angular MCP was promoted merely because its name contains Angular. Tool compatibility, coverage and maintenance remain distinct from popularity.

## Implementation evidence added 2026-10-13

| ID | Primary source | Revision/access | Supports / limits |
| --- | --- | --- | --- |
| S18 | [Pilot results](pilot-results.md), [fixture tests](../../skill/angular-usage-lookup/tests/lookup.test.mjs), [locked package graph](../../skill/angular-usage-lookup/package-lock.json) | Executed 2026-10-13; Angular 21.2.25, TS 5.9.3, Nx 23.3.0; registry publication dates not retained | Real references, exact source ranges, CLI discovery/typechecks, failure/cleanup behavior and local npm audit observations. Installed Angular server source was inspected for protocol/config-load behavior. This supersedes the lack of installed-version evidence in the initial research; it does not validate every upstream test, production workspace or optional MCP bridge. |

S0 additionally records the owner's explicit authorization to build and validate the Angular 21 example and two Nx projects. Earlier raw/tag fetch failures are historical; the published npm 21.2.25 packages were installed successfully for this pilot.

## Expanded fixture evidence — 2026-10-13

| ID | Primary source | Revision/access | Supports / limits |
| --- | --- | --- | --- |
| S19 | [Material 21 dialog documentation](https://v21.material.angular.dev/components/dialog/overview); installed `@angular/material/types/_dialog-chunk.d.ts` and `@angular/common/types/_common_module-chunk.d.ts`, pinned in [lockfile](../../skill/angular-usage-lookup/package-lock.json) | Material/CDK 21.2.14, Common 21.2.25; accessed 2026-10-13; publication dates not retained | Official types expose MatDialog component/template open overloads and the legacy structural directives. Registry metadata verified the Material v21 LTS tag and compatible peers. Web Material page returned no extracted text and v21 Angular API/doc fetches failed; installed types plus actual compiler checks supply the executed-version evidence. |
| S20 | [Expanded results](stress-results.md), [stress tests](../../skill/angular-usage-lookup/tests/stress.test.mjs), [TypeScript adapter](../../skill/angular-usage-lookup/scripts/typescript.mjs), independent fixture expectations | Executed 2026-10-13 | Eight-project compilation/discovery, exact references and contexts, initial dialog failures, verified alias follow-up and explicit dynamic gaps. Static/code lookup validation only, not runtime dialog rendering or a production scale benchmark. |

## Material catalog evidence — 2026-10-13

| ID | Primary source | Revision/access | Supports / limits |
| --- | --- | --- | --- |
| S21 | Installed `@angular/compiler-cli/private/migrations.d.ts`, its metadata/reflection declarations and executable readers; `@angular/material/package.json` and published types; [upstream reader source](https://raw.githubusercontent.com/angular/angular/main/packages/compiler-cli/src/ngtsc/metadata/src/dts.ts) | Installed compiler 21.2.25, Material 21.2.14; accessed 2026-10-13; publication dates not retained. Web source is moving main, not the executed version. | Official reader decodes selectors/bindings/module/host metadata; TypeScript resolves exports and heritage. The private migration API is available in the installed package, but is not a stable public contract. Version-tag web fetches failed; exact-version execution and hashed installed declarations provide qualification evidence. |
| S22 | [Material API documentation build configuration](https://github.com/angular/components/blob/main/src/BUILD.bazel) | Moving main; accessed 2026-10-13; publication date not shown | Existing Dgeni/Bazel documentation pipeline consumes source entrypoints. It is an alternative considered, not installed or measured in this experiment. |
| S23 | [Catalog results](material-catalog-results.md), [generator](../../skill/angular-usage-lookup/scripts/material-catalog.mjs), [tests](../../skill/angular-usage-lookup/tests/material-catalog.test.mjs), [reviewed profile/rules](../../skill/angular-usage-lookup/references/material-profile.json) and existing lockfile | Executed 2026-10-13 on Material/CDK 21.2.14, compiler/core 21.2.25 and TS 5.9.3 | Package-wide inventory, exact difficult cases, deterministic/relocated output, version/missing-entry/corrupt-metadata failures and CLI equivalence. Three opener rules checked against installed Material dialog, bottom-sheet and snack-bar declarations; documentation URLs are supplementary provenance, not a claim that their JavaScript-rendered pages were fully extracted. Does not prove application usages or all conceptual relationships. |

S0 additionally records the owner's request for a generated Angular Material key/value and family/relationship catalog after the harder fixture tests.

## Large-workspace and independent-review evidence — 2026-10-13

| ID | Primary source | Revision/access | Supports / limits |
| --- | --- | --- | --- |
| S24 | [Scale results and peculiar ledger](scale-results.md), [baseline review](baseline-review.md), [second review](final-review.md), [final identity review](identity-review.md), [generated fixture/oracle](../../skill/angular-usage-lookup/tests/scale/workspace.mjs), [scale assertions](../../skill/angular-usage-lookup/tests/scale/qualification.test.mjs), config/API regression tests and the existing lockfile | Executed 2026-10-13 local time; installed Angular 21.2.25, TS 5.9.3, Nx 23.3.0, Material/CDK 21.2.14 | Real 54-library/three-app discovery, compilation, reference/context comparisons, routing and identity counterexamples, member/pipe checks, cleanup/source integrity, measured wall times and explicit memory-profiling failure. Installed ngserver reference/session/owner handlers were inspected for the behavior exercised. Synthetic static evidence only; no production accuracy percentage, runtime app rendering, blind skill trial or human-helpfulness score. |

S0 additionally records the owner's larger-workspace shakedown request and explicit selection of the generated stress workspace for this round. No new backend dependency or remote service was introduced.

## Rendering gauntlet evidence — 2026-10-13

| ID | Primary source | Revision/access | Supports / limits |
| --- | --- | --- | --- |
| S25 | [Angular template fragments](https://angular.dev/guide/templates/ng-template), [route definitions](https://angular.dev/guide/routing/define-routes), [non-bindable attribute behavior](https://angular.dev/guide/directives/attribute-directives); installed Angular compiler `fesm2022/compiler.mjs`, core/router/CDK/Material declarations in the [lockfile](../../skill/angular-usage-lookup/package-lock.json) | Accessed 2026-10-13; live web docs have no retained publication date and may describe a newer Angular release. Versioned v21 web endpoints were inaccessible. Executed compiler/router/core 21.2.25 and Material/CDK 21.2.14 are the qualification authority. | Official APIs and compiler behavior for fragments, routes, dynamic views and disabled child bindings. Real strict compilation and emitted instructions resolve the installed-version non-bindable counterexample; live docs alone do not qualify newer syntax or runtime behavior. |
| S26 | [Rendering results and peculiar ledger](gauntlet-results.md), [pre-run plan](gauntlet-plan.md), [fixture/oracle generator](../../skill/angular-usage-lookup/tests/gauntlet/workspace.mjs), [qualification](../../skill/angular-usage-lookup/tests/gauntlet/qualification.test.mjs), [follow-up checks](../../skill/angular-usage-lookup/tests/gauntlet/followups.mjs), [durable metrics](gauntlet-qualification-summary.json) | Executed 2026-10-13 local date; pinned versions above, TS 5.9.3, Node 22.23.3 | Exact semantic locations plus explicit source-linked aliases/relationships, negative-control reconciliation, signal/model bindings, opener signature identity, hashes and cleanup. Author-directed static/compiler experiment, not runtime navigation/rendering, blind agent evaluation or production accuracy evidence. |

S0 additionally records the owner's explicit request to test lazy loading, modules/standalone, templates, legacy/modern control flow, deep nesting and obscure rendering paths. The matching router was installed only in the isolated test harness.
