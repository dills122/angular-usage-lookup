# Material family catalog experiment

Executed 2026-10-13 after the six-library/two-app lookup test. The owner requested a generated key/value catalog, mappings, relationships and family configs for Angular Material to support the skill.

The [generator](../../skill/angular-usage-lookup/scripts/material-catalog.mjs) and [skill runbook](../../skill/angular-usage-lookup/references/material-catalog.md) are implemented. They reuse installed TypeScript export/type resolution, Angular's `DtsMetadataReader` and `CssSelector`. No dependency was added. The generated catalog remains separate from semantic usage collection. [S21, S23]

## Decision and alternatives

Question: can published, installed package metadata replace a hand-maintained list of Material components/selectors while preserving version and identity evidence?

| Approach | Evidence and decision |
| --- | --- |
| Installed declarations plus official readers | Selected. The package export map supplies the inventory; Angular reads Ivy declarations and parses selectors; TypeScript resolves re-exports, constructor types and heritage. A small script serializes the results. Exact installed versions and hashes accompany the output. |
| Material's documentation pipeline | Material's repository uses a Dgeni/Bazel API-doc pipeline over source entrypoints. Useful upstream evidence, but invoking that build would introduce source/build setup for a problem the installed declarations already satisfy. Not executed or benchmarked here. [S22] |
| Manually maintained family/selector dictionary | Avoided for package facts because it can drift and collapse aliases or overlapping selectors. A small reviewed rule file remains appropriate for programmatic opener behavior that needs interpretation. |

This deliberately adds a pinned **private Angular API** dependency for catalog generation. It does not change the language-service collector's engine. Unqualified versions fail generation; upgrading the profile requires rerunning the difficult metadata and failure tests. [S21, S23]

## Observed inventory

Profile: Material/CDK **21.2.14**, Angular core/common/forms/platform-browser/compiler/compiler-cli **21.2.25**, TypeScript **5.9.3**, executed with Node **22.23.3**. Publication dates were not collected. Counts below come from the generated JSON and package export map, not the documentation navigation tree. [S23]

| Output | Observed count |
| --- | ---: |
| Typed Material entrypoints, including testing | 74 |
| Generated family groups | 37: 36 secondary-entrypoint groups plus package root |
| Public export-to-declaration mappings | 712 |
| Distinct directly exported entities | 692 |
| Entities including reachable supporting declarations | 826 |
| Selector keys declared in Material files | 262 |
| Selector keys including reachable CDK/Angular support | 333 |
| Direct declaration relationships | 1,212 |
| Source/package files with SHA-256 evidence | 132 |
| Explicitly excluded non-type package exports | 12 |
| Explicitly excluded `_`/`ɵ`-prefixed public export names | 15 |
| Reviewed programmatic opener rules | 3 |

The family configs contain runtime/testing identities, selector alternatives, related families derived from declaration edges/shared exports, and applicable opener rules. They are entrypoint-based groups, not a claim that every conceptual UI relationship has been modeled.

The output's kind counts include 86 directly exported components and 96 directly exported directives. Supporting records add private/reachable declarations and CDK/Angular bases; these must not be mistaken for directly importable Material APIs. Services, tokens, interfaces, types, modules and harnesses appear in the public export inventory; generic TS classes/variables are not exhaustively reclassified into semantic service/token categories.

## Difficult cases and validation

Six catalog tests exercise installed package data with expectations authored before the generator:

- `MatButton` preserves ten selector alternatives, `matButton`/`matAnchor` exports, and the `appearance` → `matButton` input alias. Its `aria-disabled` input remains owned by `MatButtonBase`, reachable through inheritance.
- `MatAnchor: typeof MatButton` is a `constructor-type` relationship. The generator does not promote constructor typing into runtime alias identity.
- `MatDialogTitle` preserves both attribute spellings; `MatDialogContent` preserves element/attribute forms and its `CdkScrollable` host directive.
- `MatRowDef` retains `columns` → `matRowDefColumns` and its CDK base; `MatInput` links to the `MatFormFieldControl` contract.
- `MatOption` re-exports from core/select/autocomplete map to the same declaration. The overlapping `mat-grid-tile-footer` selector maps to both `MatGridTileFooterCssMatStyler` and `MatGridTileText`.
- Every relationship endpoint and evidence file resolves. Testing entrypoints remain classified separately. Repeated generation and generation from a relocated package are identical; output embeds no workspace absolute paths.
- Changed package versions, missing entrypoint declarations and corrupt Ivy metadata fail generation. The copied-package negative fixture initially lacked some Material peers and failed early on an unknown symbol; adding all declared peers made the corruption test reach the intended metadata failure. No expected metadata was dropped.

The CLI was executed and its JSON matches the function/test output byte-for-byte. Raw output is approximately 1.49 MB in the ignored `skill/angular-usage-lookup/test-output/material-21.2.14.json`; it is reproducible rather than a large checked-in catalog. The runbook demonstrates extracting a small family/target subset for skill context. [S23]

Three reviewed rules cover `MatDialog.open`, `MatBottomSheet.open`, and `MatSnackBar.openFromComponent`. Each is checked against actual method overloads and identifies the component argument. Dialog/bottom-sheet template overloads remain explicit. The prior stress fixture validates real dialog references, aliases and wrappers; bottom-sheet/snack-bar application usage flows were **not** added to that fixture.

## Limits and next action

Catalog coverage means enumerating the installed typed entrypoints with the stated exclusions. It does not mean application usage coverage, all APIs on every class, every conceptual relationship, or a complete CDK catalog. Bindings remain declared rather than flattened across inheritance/host exposure. Sass/CSS, separate adapter/experimental packages, standalone template dependencies, provider wiring and arbitrary runtime alias/registry behavior remain outside this extractor.

The catalog uses declaration paths and source positions from this exact installed package. The existing collector still needs qualification for package `.d.ts` targets, directives and API members. Next: use a generated family to drive a bounded real-workspace lookup, verify package declaration identity and independently review the resulting usages before widening those claims.
