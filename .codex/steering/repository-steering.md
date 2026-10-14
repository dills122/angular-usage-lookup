# Repository scope

Maintain an evidence-bearing Angular usage lookup skill plus small integrations
of official tools. The portable skill lives in `skill/angular-usage-lookup/`;
tests remain colocated to preserve module resolution and version qualification.
`tools/` and `.github/` own validation, packaging and delivery. `docs/research/`
preserves the extraction baseline; current guidance lives directly under `docs/`.

The release ZIP contains only allowlisted skill assets, dependency manifests,
installation notes and a generated hash manifest. Tests, research, node_modules,
local configuration and AI Central are development-only. Keep the installed
bundle usable without access to this repository or Research Depot.

For AI Central's generic JavaScript template, the code scope is `tools/*.mjs` and
`skill/angular-usage-lookup/scripts/`; test fixtures intentionally retain their
qualified legacy/edge syntax. Concrete checks are `npm run validate` (native JS
syntax, JSON, docs and metadata), the Angular compiler exercised by tests, and
`npm run check` for the complete gate. A formatter/type-aware style linter is not
part of this extraction; adding one must not rewrite frozen fixture oracles.
This scoped exception preserves the existing qualification while using native
syntax/compiler checks and behavioral tests. Runtime is `.nvmrc`; npm is 10.9.9.
