# Contributing

The project owns skill instructions, evidence contracts and small integrations of
maintained Angular/TypeScript/Nx tools. Prefer improving those over adding a new
analysis engine or service. Read [known limits](docs/known-limits.md) before treating
an explicitly unresolved runtime choice as a collector defect.

## Local setup

Use the Node version in `.nvmrc`, npm 10.9.9 and Python 3.11+:

```sh
npm run setup
npm run validate
npm test
```

No AI Central checkout is required to develop, test or build. Maintainers can
restore their optional local links using [these instructions](docs/ai-central.md).
Portable source is under `skill/angular-usage-lookup/`; repository packaging and
delivery live under `tools/` and `.github/`. Research provenance is archived under
`docs/research/`.

## Report a lookup problem

Use [GitHub Issues](https://github.com/dills122/angular-usage-lookup/issues) once the
repository is hosted. Include an anonymized minimal fixture, exact package versions,
the declaration/selector, backend and config manifest, expected source locations,
and the actual report/coverage rows. Distinguish a missing reference, false match,
wrong config and unresolved runtime behavior. A count alone is not enough to
identify the defect. Do not upload credentials or proprietary application source.

## Change the skill or helpers

1. Describe the failure or intended behavior and its scope.
2. For a behavior change, author expected locations/configs from source before
   running the collector. Keep negative controls and original failure evidence.
3. Reuse official semantic APIs. Never weaken declaration/config identity checks
   or remove expected locations simply to get a passing test.
4. Update the relevant skill reference, limits and changelog. Keep raw collection
   separate from the skill's reconciled conclusions and peculiar-case ledger.
5. Run the appropriate gates, and report their results in the pull request.

Lookup, dependency and config-ownership changes require normal, gauntlet and scale
qualification. Bundle changes also require packaging tests, a build and the
installed-bundle smoke test. `npm run check` runs all gates. Docs-only changes need
`npm run validate` and verification of changed commands.

Dependency updates must requalify the pinned profile and retained oracles; a green
install is insufficient. The Material metadata reader uses a private Angular API.
Do not claim new version, production or runtime coverage from unchanged fixtures.

## Pull requests and releases

Keep changes focused and explain the concrete problem, resulting behavior,
verification and remaining limits. Include no node_modules, output, local AI links
or credentials. CI must pass before merging. Release assets come from the gated
workflow described in [releasing](docs/releasing.md); local builds do not publish.

Contributions are made under the repository's [MIT license](LICENSE).
