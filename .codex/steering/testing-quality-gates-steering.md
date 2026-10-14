# Quality gates

Use `npm run check` for a complete local qualification. CI separates fast
validation/packaging, ordinary tests, rendering gauntlet and large Nx scale tests.
Release tags must pass the same jobs before a draft release is created.

Assert exact identity, spans and project contexts where qualified. Preserve
negative controls and unknowns. Do not claim runtime rendering or production
accuracy from generated fixtures. Archive changed test findings with their source
and package versions. Source hashes and language-server cleanup are part of the
lookup contract.

Build twice and compare bytes; inspect archive inventory and hashes. Install the
extracted bundle's production dependencies in a temporary directory, then perform
real Angular/TypeScript queries against isolated fixture copies. Missing/wrong
version/tampered inputs must fail clearly. Never use the source helper as a hidden
fallback during bundle tests.
