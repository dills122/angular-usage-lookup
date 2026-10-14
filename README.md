# Angular Usage Lookup

Find where an Angular component, directive, pipe or API is used, and understand
what that evidence means for a migration. This agent skill combines Angular
Language Service, TypeScript and Nx with small local helpers and a deliberate
review of uncertain cases.

Give it `SuperCoolComponent`, a selector or an API to investigate. The skill
resolves the declaration, inventories the workspace, collects references, follows
relevant aliases and rendering paths, and explains what remains unknown.

**Status:** Angular 21 pilot, qualified on generated fixtures including **54
libraries and three apps**. [Version 0.1.0](https://github.com/dills122/angular-usage-lookup/releases/tag/v0.1.0)
is the initial pilot release. Source and CI are hosted on GitHub;
[repository rules](docs/github-settings.md) protect the default branch
and tags. The skill does not modify application code.

## What you get

- An inventory of evidenced usages with file locations and project/config context.
- Separate template instances, imports, registrations and programmatic references,
  including Material dialog paths that need TypeScript follow-up.
- A Material catalog with 37 families and selector, binding, module and inheritance
  relationships, generated from the installed package's declarations.
- A ledger of **peculiar** observations: each receives an investigation and an
  outcome; unresolved cases remain visible in the final report.
- Scope and coverage gaps that prevent a partial collection being mistaken for
  a complete migration inventory.

This is a skill with supporting scripts. Your agent performs the investigation;
the collector alone does not produce the final migration report.

## Start here

### 1. Get the skill

Clone [this repository](https://github.com/dills122/angular-usage-lookup),
or download the [v0.1.0 skill ZIP](https://github.com/dills122/angular-usage-lookup/releases/download/v0.1.0/angular-usage-lookup-0.1.0.zip).
From an existing checkout, install only the helper's
runtime dependencies:

```sh
npm ci --omit=dev --prefix skill/angular-usage-lookup
```

Point your agent at `skill/angular-usage-lookup/SKILL.md`, or place that complete
folder in the skill directory supported by your agent. Preserve its relative
layout. A release ZIP already contains the top-level `angular-usage-lookup/`
folder; follow its [installation notes](skill/angular-usage-lookup/INSTALL.md).
The instructions are readable without installing dependencies.

### 2. Supply a workspace and a target

Open the Angular/Nx workspace with your agent and use a request like:

> Use angular-usage-lookup at /path/to/angular-usage-lookup/skill/angular-usage-lookup/SKILL.md.
> Find usages of SuperCoolComponent in /path/to/my-workspace for a migration.
> Resolve its exact declaration, include app/library/test/story configs, inspect
> lazy and dynamic rendering paths, and investigate every peculiar result.
> Report confirmed usages, indirect relationships and remaining coverage gaps.
> Do not change application code.

The scanned workspace must have its own installed dependencies. The helper checks
versions; it does not upgrade your application to make a lookup succeed.

### 3. Review the evidence

Expect locations and config coverage, plus the investigation ledger and remaining
limits described in the [report contract](skill/angular-usage-lookup/references/report-contract.md).
Check that discovery and the analyzed config list agree before acting on results.
**`collectionStatus: "succeeded"` with `status: "partial"` is intentional**: the
mechanical lookup succeeded, but scope and candidate reconciliation still belong
to the skill. A gap is not evidence of zero usages.

## Try a working example

From the repository root, use the Node version in `.nvmrc` and npm. This installs
the isolated fixture dependencies and performs a real Angular lookup:

```sh
npm run setup
mkdir -p test-output
node skill/angular-usage-lookup/scripts/collect-references.mjs \
  --workspace skill/angular-usage-lookup/tests/fixtures/angular-single \
  --manifest lookup.json \
  --output test-output/first-lookup.json
```

Open `test-output/first-lookup.json`. The fixture produces **11 exact reference
locations**, including templates, and deliberately retains partial report status.
The source and expected locations are in `tests/fixtures/angular-single/` inside
the skill. For a dialog-only example, change the workspace to
`skill/angular-usage-lookup/tests/fixtures/nx-stress` and the manifest to
`lookup-dialog.json`; it produces **18 TypeScript reference locations** with an
explicit template coverage gap. These are reference counts, not rendered instances.

For your own workspace, discovery is a useful first mechanical step:

```sh
node skill/angular-usage-lookup/scripts/discover.mjs --workspace /path/to/my-workspace
```

Collection requires a reviewed manifest with verified identity probes; there is
no automatic class-name-only CLI scan. Follow the [runnable lookup guide](skill/angular-usage-lookup/references/local-collection.md)
for manifest examples, backend selection and failure codes. Keep reports outside
the scanned workspace.

## Compatibility and limits

| Tool | Qualified version |
| --- | --- |
| Angular core/compiler/language server | 21.2.25 |
| TypeScript | 5.9.3 |
| Angular Material / CDK catalog | 21.2.14 |
| Nx | 23.3.0 |
| Node / npm (original local qualification) | 22.23.3 / 10.9.9 |

The original local qualification used Node 22. The published `.nvmrc` selects
Node 24 LTS for hosted CI; see [current CI results](https://github.com/dills122/angular-usage-lookup/actions/workflows/ci.yml)
for the tested revision and runtime. Python 3.11+
is needed for repository validation and packaging, not for normal skill use.
The collector and catalog have different version guards; other profiles need
requalification. Legacy `ngIf`/NgModules are tested on Angular 21, not old releases.

The tests include standalone/NgModule mixtures, `*ngIf` and modern control flow,
lazy routes, 48 nested views, recursive/unused templates, portals and dynamic
Material openers. They do not prove arbitrary runtime registry choices, all
package/test/story configurations or production accuracy. A fresh-context agent also completed a ZIP-only component/dialog trial; see the
[agent evaluation](docs/agent-evaluation-results.md) for exact results and limits.
The generated workload does **not** establish a universal 95% score. See [known limits](docs/known-limits.md)
and the [qualification evidence](docs/research/README.md).

## Develop, test and build

```sh
npm run setup
npm run check
```

The complete gate runs metadata/docs/syntax validation, packaging regressions,
33 ordinary tests, the rendering gauntlet, the large Nx fixture and an extracted
bundle installation test. Allow several minutes. Run `npm test`,
`npm run test:gauntlet` or `npm run test:scale` individually during development.

`npm run build` creates a deterministic skill ZIP, SHA-256 checksum and file
manifest under `dist/`. `npm run test:bundle` installs and runs that ZIP. Tests,
research, node_modules and local AI Central setup are excluded from the deliverable.
GitHub CI runs the same gates; version-matched tags create a **draft** release
only after they pass. See [releasing](docs/releasing.md).

| Where to go next | Guide |
| --- | --- |
| Report a miss or propose an improvement | [Contributing](CONTRIBUTING.md) |
| Understand checks and repository layout | [Development](docs/development.md) |
| Handle large scopes and difficult rendering | [Large workspaces](skill/angular-usage-lookup/references/large-workspaces.md), [rendering paths](skill/angular-usage-lookup/references/rendering-paths.md) |
| Generate Material mappings | [Material catalog](skill/angular-usage-lookup/references/material-catalog.md) |
| Restore the optional maintainer AI setup | [AI Central](docs/ai-central.md) |
| Trace the Research Depot extraction | [Provenance and validation](docs/extraction.md) |

## Author and license

Created by [Dylan Steele](https://github.com/dills122). Licensed under [MIT](LICENSE);
the same license is included in the skill bundle. Dependencies retain their own
licenses. Both package manifests use `private: true` because this project's
deliverable is a skill ZIP; it is not published to npm.

[Repository](https://github.com/dills122/angular-usage-lookup) ·
[Issues](https://github.com/dills122/angular-usage-lookup/issues) ·
[Releases](https://github.com/dills122/angular-usage-lookup/releases)
