# Material consumer qualification

Run `npm run test:material` from the repository or portable skill directory.
All generated workspaces, raw reports, candidate evidence and the running summary
are under the skill's ignored `test-output/material/` directory.

`cases.json` freezes the pinned package's 182 public runtime-exported component
and directive identities and every selector alternative. The initial selector
inventory was transcribed from installed metadata before lookup execution;
consumer HTML and typed binding dependencies are maintained here. The catalog
test checks inventory drift, while TypeScript's public export APIs independently
resolve actual target declarations. Expected locations are calculated from
fixture source before collecting any references, never from backend results.

Each concrete class is imported into two standalone consumers. Every selector
occurs in a plain inline template, `@if`, `@for`, `@defer` and an external
template. Matching comments and plain strings are negative controls. The two
abstract selectorless exports have explicit TypeScript-only cases. The normal
generic regression additionally tests different declarations with the same
selectors, ambiguous foreign inputs, missing definitions and invalid owners.

`ngc` compiles every case with strict templates. Exact reference-span comparisons
detect both omissions and unexpected consumer references. Missing templates are
retained as `rawMissing`; explicit candidate definitions must verify each exact
location before it is listed as `recovered`. Native definition origins remain in
separate reports and never replace raw reference ranges. An unrecovered expected
occurrence fails the suite. Both passes check unchanged source/config contents,
raw reference preservation, query identity and terminated server processes.

This qualifies static lookup of these consumers on the pinned profile. The
skeletal cases do not exercise browser rendering, dependency-injection setup,
interactive overlays, every component input/output or every valid composition.
Material services, interfaces, harnesses and constructor-typed aliases remain
catalog entries rather than extra component classes; dynamic opener flow is
covered separately by the stress, gauntlet and scale suites.

When native definitions remain absent or mixed, the suite keeps that report and
submits the same authored anchors through the explicit Angular compiler backend.
The summary records `compilerRecovered` separately within `recovered`;
`rawMissing` remains unchanged. A confirmed compiler association is not a native
reference, API binding, indirect host application or runtime instance.
