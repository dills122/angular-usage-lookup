# Angular Usage Lookup — agent guidance

This is a skill-first lookup project. Read `README.md`, the relevant skill
reference, and `.codex/steering/` before changing behavior.

- Canonical portable source: `skill/angular-usage-lookup/`. Keep it self-contained.
- Reuse official Angular/TypeScript/Nx tooling. Do not grow a custom semantic
  analyzer or persistent service without a demonstrated need and explicit scope.
- Collection is read-only against scanned application sources/configs. Keep raw
  evidence, exact identity/config checks and unresolved coverage explicit.
- Investigate peculiar cases before reporting; never shrink an oracle to hide a
  miss. Distinguish semantic references, indirect relationships and runtime claims.
- Tests belong beside the skill. Repo build/release tools belong under `tools/`.
- Run `npm run validate`, packaging tests and the affected Angular suites. Changes
  affecting lookup/dependencies/config ownership require normal, gauntlet and scale
  qualification. Packaging changes require `npm run build && npm run test:bundle`.
- `docs/research/` is archived provenance, not current setup instructions. Update
  current release/development docs and record changed coverage in `CHANGELOG.md`.
- AI Central's project steering is real and tracked. Its shared skill/steering
  links are local and excluded via `.git/info/exclude`. Never edit shared targets
  as part of this project or put AI Central into the shipped bundle.
- Do not stage, commit, push, tag, create a remote or publish a release unless the
  user requests it. A locally generated bundle is not a published release.

No project-specific subagent presets are required. Preserve the existing lookup
skill's normal automatic discovery behavior.
