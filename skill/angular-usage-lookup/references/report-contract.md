# Usage report contract

Return concise Markdown; add JSON when requested or feeding a migration pipeline. This is the skill's proposed contract, not an Angular/Nx format. Use `null` with a gap/reason for unknown data. Do not invent example results.

## Collection-stage JSON

The executable helper emits `stage: semantic-reference-collection`, with `references`, `coverage`, raw backend `evidence`, versions and file hashes. `collectionStatus: succeeded` means the manifest's probes, query ownership/config checks and queries passed. Angular coverage retains `queryConfigEvidence` for a consumer uniquely owned by an enabled program; a loaded-config log alone does not qualify the query. Its overall `status` is always `partial`: it has not performed candidate reconciliation or migration classification. The skill maintains and investigates the peculiar-review ledger; the helper does not automatically create it.

Each reference retains `isDeclaration`, a generic `kind: semantic-reference`, merged project/config contexts and evidence IDs. A confirmed semantic reference is not yet a rendered component instance. The skill converts these into the occurrence records below, adds owners and categories from source, excludes the declaration from consumer counts, records scope/discovery/checkout state and reconciles additional candidates. Do not present the collection output as the finished report contract or infer a successful zero-use inventory from it.

## Run and target

- `schemaVersion`: `angular-usage-lookup/v1`.
- `run`: timestamp, workspace root, commit if present, dirty/untracked scope, resolved dependency/backend versions, queries and evidence artifact IDs. Include relevant file hashes for a machine-consumable migration handoff to detect stale locations.
- `target`: declaration path/range, symbol, package/project, selectors/pipe name, requested member/public alias. Preserve source-to-declaration mappings.
- `scope`: roots, projects, leaf configs, categories and exclusions with reasons; default ignores, inaccessible roots, generated files and external consumers. This workspace inventory does not cover other repositories.
- `status`: `complete-for-declared-static-scope`, `partial` or `blocked`. Use blocked when target identity/access prevents a useful inventory; ambiguous candidates can still be returned.

## Backend-specific evidence

Coverage rows identify `backend` and `capabilities`. An `angular` row includes template evidence. A `typescript` row covers TS references only and adds a `templates-not-analyzed` gap. Its evidence retains native TypeScript file/offset/span records for the declaration and each verified probe, plus definition-hop chains. Normalized ranges use the common UTF-16 contract. Do not relabel a successful TS-only row as template coverage.

Caller/wrapper/registry investigations remain separate skill evidence. A class registration is not every indirect opening site. Preserve the entire argument/alias/call chain and distinguish target-specific invocations from generic wrapper bodies.

## Occurrence records

Each needs an `id`, repository-relative `file`, source `range`, `kind`, `classification`, `contexts` and `evidence`. Render clickable absolute links when supported by the host.

Normalized coordinates: one-based lines/columns, end-exclusive ranges, columns in UTF-16 code units. Retain original provider ranges and encoding. LSP normally uses zero-based UTF-16 positions unless negotiated otherwise. Byte offsets are not JS string offsets. If precise mapping is unavailable, return a line/snippet and mark the range unknown; never fabricate an edit span.

Suggested kinds: `template-instance`, `template-api`, `host-directive-composition`, `import-export`, `registration`, `route`, `dynamic-construction`, `query-injection`, `type-reference`, `inheritance`, `registry`, `other-code`, `style-selector`, `test-selector`, `story-template`, `documentation`, `other-collateral`.

| Classification | Evidence needed |
| --- | --- |
| `confirmed` | Angular/TS result resolving to the target, or fully shown source-resolution chain for that dependency kind |
| `candidate` | Relevant syntax/text/flow with unresolved identity or runtime selection |
| `collateral` | Verified non-instantiating mention such as CSS, DOM test selector or documentation |

Manual template confirmation requires the full selector and standalone/NgModule scope-resolution chain. Otherwise retain a candidate. Proving one usage manually does not prove workspace coverage.

`contexts` retains every project/config and owning component. Dynamic/indirect use needs the class-to-variable-to-call chain, including conditional/unresolved links. Capture observed binding spellings and ownership. Shared templates can resolve differently for different owners.

Count occurrences, files, rendered instances and imports separately. Deduplicate on canonical file + range + target + kind, merging proven contexts. Preserve distinct binding ownership and uses on the same line. Link API records to parent instances to avoid counting both as two component instances. Keep source declaration records out of consumer totals.

## Coverage and reconciliation

One ledger row per declared leaf configuration:

| Project / config | Discovery source | Backend / load evidence | Known-reference probe | Candidate sweep | Errors / gaps | Result |
| --- | --- | --- | --- | --- | --- | --- |

Fill from observations. Record timeouts, truncation/pagination, unassociated templates, missing imports, parse failures, ownership ambiguity, unsaved-buffer differences and unsupported syntax. Finish pagination before treating a response as complete.

Separate `gaps`, `exclusions` and `rejectedCandidates`, with reasons/paths. Do not turn failures into intentional exclusions or narrow scope retroactively to match successful queries.

Provide counts by kind/classification, affected projects/files and observed API patterns. End with migration implications and the peculiar-review summary/remaining checks. Replacements need separate target API evidence; a confirmed reference does not prove a migration is behaviorally safe. Static references alone do not prove runtime absence for deletion decisions.

## Peculiar review ledger

`peculiar` is an internal review flag for anything the skill cannot fully explain: an apparent missing reference, unexpected extra hit, ambiguous identity/owner, uncertain metadata/family relationship, incomplete flow or failed coverage check. Flag observations, not hypothetical problems. Keep the queue in the run's working notes or report artifact so it survives handoff; avoid creating duplicate occurrence records.

Use a Markdown ledger or, for JSON, a `peculiarReviews` array. Each item retains:

- `id`, `question`, `target` and `contexts`: identify the issue and all affected paths/locations/projects/configs. A scope-wide issue may have no single occurrence; record the missing location as unknown.
- `originalEvidence`: query/artifact IDs, source observations and the expected-versus-observed mismatch; preserve failures and empty responses.
- `checks`: what was inspected or queried, its context and result, and supporting evidence IDs. Distinguish completed checks from proposed or blocked checks.
- `reviewStatus`: `pending` during collection, `investigated` after the dedicated pass. No item may be silently left pending in the final report; if investigation is blocked, record the reason and use `unresolved`.
- `outcome` and `reason`: one of the conclusions below, supported by the checks. Investigation completion is not the same as uncertainty resolution.
- `reportLinks`: affected occurrence, coverage, gap, collateral or rejected-candidate IDs. `nextCheck` identifies a discriminating follow-up for an unresolved item and why it could not be completed now.

| Outcome | Required treatment |
| --- | --- |
| `recovered-miss` | Verified evidence demonstrates something omitted from the initial inventory or mapping. State whether it was a usage, context, classification or catalog omission; update the corresponding record. Do not call a catalog correction a new rendered instance or infer a backend bug merely from an empty result. |
| `already-accounted-for` | Link the existing record and explain why this is another view of the same evidence. Merge any missing contexts without adding another occurrence. |
| `explained` | Evidence resolves the question as a false positive, collateral mention, metadata distinction or expected behavior. Link the appropriate rejection/collateral/mapping explanation. Absence of results alone is insufficient. |
| `unresolved` | Preserve the candidate or coverage/identity gap, completed checks, remaining uncertainty and next check. In-scope uncertainty that affects the answer keeps the run partial. |

Before reporting, account for every queued ID, reconcile all resulting report changes, and review other locations implicated by a recovered miss. End with counts by outcome, links to the investigated items, and an explicit list of unresolved items/next checks. If none arose, say no peculiar items were identified in the declared scope; do not imply universal coverage. Resolved items can be summarized briefly, but keep their evidence trail.
