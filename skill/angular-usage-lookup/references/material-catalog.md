# Angular Material catalog

Use this when the target is a Material family, export, selector or template API. The catalog supplies identities and candidate search terms to the lookup workflow. It does not scan application usages or establish Angular template scope.

## Generate from installed packages

From the skill directory after its authorized dependency setup:

```sh
mkdir -p test-output
node scripts/material-catalog.mjs --workspace . > test-output/material-21.2.14.json
```

`--workspace /absolute/project` resolves packages installed for that project, without installing or changing them. Save stdout outside the application. Exit 0 means generation succeeded; exit 1 means an argument, dependency, version or metadata failure. A shell redirect may create an empty file on failure, so check the exit code before using it.

The qualified profile is Material/CDK **21.2.14**, Angular core/common/forms/platform-browser/compiler/compiler-cli **21.2.25**, and TypeScript **5.9.3**. The generator rejects other versions. It uses TypeScript's export/type APIs, Angular `CssSelector`, and Angular's **private** `DtsMetadataReader`/reflection APIs from `@angular/compiler-cli/private/migrations`. Requalify against the tests before changing the [profile](material-profile.json); this is an internal API dependency, not a stable cross-version promise. No new package, service or MCP server is required.

## Read only the relevant records

The generated catalog is about 1.5 MB for this profile; do not load it wholesale into skill context. All indexes are key-to-array mappings, including selectors and `exportAs`, which can match several entities. For example:

```sh
node --input-type=module <<'JS'
import fs from 'node:fs';
const c = JSON.parse(fs.readFileSync('test-output/material-21.2.14.json', 'utf8'));
const ids = c.indexes.byAttribute.matDialogClose ?? [];
console.log(JSON.stringify({
  versions: c.versions,
  family: c.families.dialog,
  targets: ids.map(id => c.entities[id]),
  openers: c.programmaticRules.filter(rule => rule.family === 'dialog')
}, null, 2));
JS
```

| Field | Meaning and how to use it |
| --- | --- |
| `entities[id]` | Canonical installed declaration, one-based UTF-16 source location, kind, public exports and Angular metadata when present. IDs contain package-relative declaration paths and names; resolve them against the same installed package. An empty `exports` array means a supporting declaration, not a directly cataloged public import. |
| `indexes.byExport` | Exact `@angular/material/dialog#MatDialog` to entity IDs. TypeScript resolves barrel re-exports to a shared declaration. |
| `byName`, `bySelector`, `byTag`, `byAttribute`, `byExportAs`, `byPipeName` | Candidate identity/search-term indexes. Positive selector tokens retain case; complete parsed selectors retain combinations, values, classes and negations. A token hit is not a valid Angular match or usage by itself. |
| `byDeclaredInput`, `byDeclaredOutput` | Template public name to the declaration that owns the metadata. Each binding retains its class property name and input required/signal flags. These indexes are deliberately **not flattened**. |
| `relationships` | Direct `extends`, `implements`, `ngmodule-import`, `ngmodule-export`, `ngmodule-declaration`, `host-directive` and `constructor-type` edges, with source evidence. Some edge kinds have no instances in this package version. |
| `families` | One group per public secondary entrypoint plus the root `material` group. Runtime and testing/harness exports stay separate. `relatedFamilies` derives from shared exports and outgoing declaration edges; inspect those edges for their meaning. These groups are not a hand-written UI taxonomy. |
| `programmaticRules` | Three reviewed search plans for `MatDialog.open`, `MatBottomSheet.open` and `MatSnackBar.openFromComponent`, with checked overload signatures and argument positions. |
| `sources`, `versions`, `profileSha256`, `coverage` | Exact package versions, declaration/package hashes, profile fingerprint, enumerated entrypoints and explicit exclusions. Regenerate if packages change; do not transplant declaration positions across versions. |

To find inherited inputs, follow `extends` to the base record and keep its declaring identity. To inspect composed APIs, follow `host-directive` and use only its exposed input/output mappings. Do not treat every base/host API as declared on the subclass. `ngContentSelectors` describes projected-content slots; it is not the component's own selector.

A `constructor-type` edge records declarations such as `MatAnchor: typeof MatButton`. It is evidence of constructor typing, not proof that both runtime values are identical. Distinguish it from a resolved export alias.

## Apply the family to a usage investigation

1. Resolve the requested term to catalog entity candidates, then use the actual consumer's Angular/TypeScript definition lookup to establish which declaration is used. Same selectors can belong to several directives even within Material.
2. Use the family runtime exports, actual selector alternatives, public aliases and related module/host/base records to plan semantic queries and the candidate sweep. Keep harness/testing exports in the test/collateral scope.
3. For an opener rule, verify the receiver resolves to the specified Material class, inspect the actual argument at `argumentIndex`, and distinguish `ComponentType` from a `TemplateRef` overload. An arbitrary method named `open` is not sufficient. Then follow the existing skill's alias, registry and wrapper workflow; the catalog does not add dataflow analysis.
4. Keep family membership, imports and API relationships separate from confirmed rendered instances. A dialog's component class may have no selector occurrence anywhere. Family relationships guide investigation; they do not prove transitive application impact.

Queue uncertain catalog-to-consumer identities, inherited/host mappings, constructor-type relationships and opener flows as `peculiar`, with the relevant entity/edge IDs. Investigate each during the skill's final review pass using the [peculiar review ledger](report-contract.md#peculiar-review-ledger); catalog ambiguity must not silently disappear from the usage report.

The current collector remains qualified for its source-component fixtures. Package declaration identity, directive/member queries and test/story configurations still need backend qualification. Generating this catalog does not automatically broaden that coverage.

## Scope and validation

Every typed Material package entrypoint is enumerated, including testing. `_`/`ɵ`-prefixed exports are explicitly excluded as direct public targets, though reachable supporting declarations may still appear. Non-type exports (styles, Sass and package metadata) are listed as excluded. Separate adapter/experimental packages and a complete CDK catalog are outside scope. Reachable CDK/Angular declarations are retained for relationships; indexes can therefore contain supporting, non-Material entities.

Standalone template dependencies, provider configuration, all conceptual family relationships, effective inherited/host API flattening and arbitrary runtime identity are not inferred from `.d.ts` files. Syntax/options diagnostics are checked; dependency declaration type checking is skipped. Unresolved exports/edges, poisoned or unreadable Angular metadata and missing entrypoints fail generation.

`node --test tests/material-catalog.test.mjs` checks representative real metadata, shared and overlapping identities, opener signatures, determinism, portability, graph/source integrity, and refusal of changed versions/missing declarations/corrupt Ivy metadata. The package-wide result is an inventory claim for the stated scope, never a completeness claim about application usages.
