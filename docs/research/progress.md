# Implementation progress

## Authorized pilot — 2026-10-13

The owner requested implementation and validation of the Angular 21 example, followed by two Nx projects, using existing tools and a skill-first package. Local fixture/tooling dependencies and glue code are within this authorization. No commit, publication or application migration is requested.

## Work sequence and acceptance

- [x] Write fixture and expected reference locations before the collector.
- [x] Prove one Angular 21 project: inline template, external template, TS references, and unrelated same-name/selector negatives.
- [x] Extend to two independently configured Nx projects using local Nx discovery; compare exact result sets and preserve per-project evidence.
- [x] Exercise missing/invalid configuration and process cleanup; failures must not look like clean zero-use results.
- [x] Update skill commands, limitations, validation record, brief and index; review code and run final checks.

Prefer official Angular language-server/service plus Microsoft's JSON-RPC/LSP packages. Keep custom code limited to configuration, lifecycle and evidence collection. The full acceptance matrix is broader than this pilot; report only demonstrated cases.

## Log

- Started from the existing skill and proposed plan. Node v22.23.3, npm 10.9.9 observed. Repository files were already untracked; preserve existing work and do not stage/commit.
- Next: resolve exact compatible package versions, construct a known-use fixture, and demonstrate a failing collector contract test.
- Installed exact Angular language-server/service/core/compiler 21.2.25, TypeScript 5.9.3, Nx 23.3.0, vscode-jsonrpc 9.0.3 and protocol 3.18.4 in the skill package. Lockfile retained; 162 packages installed locally.
- RED: integration test failed because collection helper did not exist. First implementation failed on the new protocol package export suffix; corrected imports to the installed `/node` export.
- Angular server `--help` requires probe locations even before help runs; reran with resolved package locations. No custom compiler internals used.
- Angular-only definition lookup at a TS import returned null. Replaced that readiness anchor with a real template token; class declaration remains the reference-query target.
- GREEN: single-project test passed with all 11 expected raw references (one declaration, three template instances, seven other TS references), no unrelated target/comment/string matches, verified inline/external probes, and unchanged source/config hashes. Angular `ngc --noEmit` also passed for the fixture.
- Next: extend to independently configured Nx consumers; verify discovery using the actual local Nx CLI.

- GREEN: Nx fixture returns all 10 expected spans with correct alpha/beta contexts; discovery uses the real local Nx CLI and TS config readers.
- RED/GREEN: added discovery and initialization cleanup tests before implementing those parts; corrected cleanup evidence and tested output symlink protection. Strengthened exact-range assertions to include ends.
- Final code suite: 9/9 passed, including ngc and Nx typecheck targets, failed-config/wrong-probe/timeout behavior and actual child PID exit checks. Source/config hashes unchanged during lookup.
- Dependency review: Nx downgrade recommendation exposed different advisories; final Nx 23.3.0 plus scoped Undici 7.29.1 override has zero reported npm audit vulnerabilities. All changes are in the isolated tooling package.
- Skill instructions, results, brief, plan, validation, research, sources, decisions and index updated. Next: final metadata/link checks and handoff summary.

- Final artifact checks passed: skill validator, 51 retained package/research files checked for local links/JSON/whitespace, both skill discovery links, installed dependency tree, generated-file ignores and whitespace diff check. All authorized pilot work is complete; production-workspace/API qualification remains follow-on work.

## Harder monorepo qualification — authorized 2026-10-13

Request: six libraries/shared code, mixed NgModules/standalone, legacy structural syntax and Material dialog opening from code. Continue on Angular 21; this tests older coding patterns, not old Angular releases.

- [x] Define an eight-project fixture (two apps, six libraries), expected semantic references and dialog-flow expectations before running collection.
- [x] Compile every config with official ngc/Nx and discover the complete project list.
- [x] Compare SuperCoolComponent reference locations and config contexts across the graph; preserve initial failures.
- [x] Query a real Material dialog component; distinguish direct references, statically traceable aliases/wrappers and unresolved runtime selection. Add only existing-tool glue for demonstrated gaps.
- [x] Run regression checks, reconcile candidates, update skill limits/results/current brief/index.

Stopping rule: qualify this bounded fixture and document misses/limits; no custom dataflow engine, browser application or old-version support matrix. Expected locations are the oracle; never derive them from collector output. A dialog-only target must not require an artificial template usage just to pass.

- All eight configs compiled and Nx discovered the six libraries/two apps. Initial Angular card lookup passed unchanged: 26 exact spans, 16 template occurrences, all expected contexts.
- RED: all six TS-only dialog rows failed Angular definition probes. Added a small public TypeScript service adapter; two lazy-import probes then stopped at a barrel alias. Followed TS definition alias hops with bounded/cycle-checked navigation.
- A class query omitted a local lazy-binding use. Added reference queries at verified probes, including that binding in each relevant program; exact 18-span dialog oracle now passes without dropping expected locations.
- Follow-up method query in admin missed a storefront caller because it was outside that program. Retained the expected caller and queried the correct storefront config.
- Full suite: 14/14 passed, including original regressions, all eight compiler targets, wrong-class/absent-target failures and follow-up alias/property/method queries. npm audit: zero known vulnerabilities after Material additions.
- Candidate sweep and code review classify five directly evidenced opening sites, four indirect paths and one variable-registry candidate; wrapper bodies remain conditional. Reports and skill guidance updated; final metadata/link checks next.

- Final checks passed: skill validator, Markdown links/JSON/whitespace across 110 retained files, both skill links, dependency tree and cache ignores. Four helper modules total 403 lines; the additional TypeScript adapter is 65 lines. Requested harder fixture work is complete. Remaining production/package/runtime limitations are recorded in stress-results.md.

## Material catalog experiment — requested 2026-10-13

Decision: can installed Material declarations supply a useful, versioned family/lookup catalog without maintaining a selector parser or component inventory? Budget: one bounded generator and integration-test pass against the already installed Material 21.2.14 / Angular compiler 21.2.25 / TypeScript 5.9.3; no service or new dependency. Stop after the package-wide export inventory and difficult representative metadata cases agree, or document a blocking metadata gap.

Plan and success criteria, before implementation:
- Enumerate every typed public Material entrypoint from package exports; group testing entrypoints with their family, and account explicitly for non-type exports and internal names.
- Reuse TypeScript export/symbol resolution, Angular's DtsMetadataReader from its private migrations API, and Angular CssSelector. Pin/reject unqualified versions because the metadata reader is private.
- Produce deterministic JSON entities, one-to-many lookup indexes, evidence paths/hashes, and generated family membership. Preserve direct inheritance, host directives and NgModule relationships. Keep declared bindings distinct from inherited and host-exposed APIs.
- Test real button aliases/inherited inputs, dialog selector alternatives/host directives, table structural aliases, shared option re-exports, testing harnesses, and programmatic opener rules. Require all relationships to resolve and output to reproduce byte-for-byte; no inferred application usages.
- Keep a small reviewed opener-rule file (dialog, bottom sheet, snack bar) separate from extracted facts, validating each method/argument against installed typings. Arbitrary wrappers/registries still require the skill's reference workflow.
- Update skill routing/results, run the existing regression suite, and record catalog limits. A package API inventory does not prove complete semantic usage coverage or all conceptual relationships.

- RED: six catalog checks were planned; the initial five tests failed because the generator did not exist. Implemented a single helper around TypeScript and Angular readers with no new dependency.
- GREEN: real button/dialog/table/shared-option metadata, every typed entrypoint, graph/source integrity, version rejection and reproducibility passed. Added a sixth test for missing/corrupt declarations plus a real overlapping selector assertion.
- The negative test's first expectation was too specific: TypeScript reported the missing root before our entrypoint check. Kept TypeScript's earlier failure and asserted that evidence. The copied package then lacked some peer declarations and failed on an unknown symbol; linked all Material peers and first proved the unmodified relocated package identical before corrupting it. Missing metadata now reaches the intended fail-closed check.
- Catalog-only suite: 6/6 passed. CLI output exactly matches test output. Observed: 74 typed entrypoints, 37 groups, 712 public mappings, 262 Material selector keys (333 with supporting declarations), 1,212 declaration edges. Full regression and final artifact checks pending.

- Full suite passed 20/20 in about 31.5 seconds. Review tightened the profile to pin common/forms/platform-browser as well, since supporting metadata can reach those packages. Catalog tests passed 6/6 again; CLI byte equivalence and the runbook's dialog-family extraction passed. Final evidence now hashes 132 source/package files.
- Skill validator, local Markdown links, JSON/whitespace, both discovery links and git whitespace check passed across 115 retained files. No new dependency, service, commit or publication. Catalog generation and skill routing are complete; next qualification is a supplied workspace with Material package/directive/member identity.

## Peculiar investigation pass — requested 2026-10-13

- Added skill instructions to queue unexplained observations with stable IDs and evidence, then investigate every queued item after collection/sweep and before final reporting. Newly exposed questions join the pass; blocked/static-limit cases retain a reason and next check.
- Added a report ledger with four evidence-backed outcomes, linkage to corrected occurrences/contexts/gaps, deduplication and a final summary. Kept this separate from occurrence classification and the unchanged collection-stage JSON.
- Connected Material mapping ambiguities and acceptance criteria to the workflow. Re-read existing fixture source and retained dialog output for a four-case author walkthrough: an earlier recovered miss, merged project contexts, a different class identity and unresolved runtime selection. No fresh backend execution or independent evaluation is claimed.
- Updated brief/index and decision history. This change is instructions/documentation only; validate skill metadata, links/anchors and whitespace, without rerunning the unchanged application suite.
- Final checks passed: skill validator, JSON/whitespace, local links and heading anchors across 115 retained files, both discovery links and git whitespace check. Requested skill workflow update is complete.

## 2026-10-13 — generated 54-library/three-app qualification

- User selected the generated stress workspace. Added a source-authored fixture/oracle with 54 Angular libraries, three apps, 561 TS files, 27 HTML files and 63 leaf configs. Nx discovery and every Angular typecheck pass.
- Final guard run: card 489/489 exact spans and 8,015/8,015 config pairs; dialog 114/114 spans and 2,184/2,184 pairs, with two explicit no-dialog dependency exclusions. No extra/missing spans or context mismatches. Scale test 1/1 passed in 206.74 seconds; normal suite 29/29 passed in 55.55 seconds.
- Accepted/fixed independent review findings for wrong default-project routing and ambiguous shared-binding identity. Added config-specific consumer qualification, all-definition identity checks and regressions. Explicit member anchors qualify pipe transform and input/output queries; per-program lazy-binding follow-ups recover missing downstream contexts.
- Kept the skill and installed Angular/TypeScript/Nx tooling. No new dependency, service or custom semantic engine. Source hashes and child cleanup checks pass. Peak memory is unmeasured because OS profiling was denied in the sandbox.
- Updated the [results and 12-item peculiar ledger](scale-results.md), [portable large-workspace runbook](../../skill/angular-usage-lookup/references/large-workspaces.md), acceptance matrix, brief, decisions and idea index. Skill metadata validates; 155 retained files pass JSON, links/anchors and whitespace checks. Discovery links resolve to the portable skill.
- Review instances 1 and 2 are preserved as pre-fix findings. [Final review, instance 3](identity-review.md): Ready for a supervised real-workspace trial of tested paths; no new actionable findings. It independently verified final raw location/config sets, all generated/frozen hashes and the collision regression. All three review instances are complete.
- Next external gate: a supervised supplied-workspace sample, including actual package/test/story boundaries, memory scaling and independently reviewed human usefulness. The generated run does not establish universal production accuracy.

## 2026-10-13 — rendering gauntlet

- Added a separately runnable, source-authored Angular 21 matrix for legacy/modern control flow, 48 nested views, recursive/unused fragments, projection, lazy routes/NgModules, component/template/DOM portals, dynamic component factories/outlets, signals/model bindings and Material component/template overloads. Only new dependency: matching official router in the isolated test harness.
- First collection found all 46 original template cases, but missed seven renamed lazy-alias locations. Distinct local symbols correctly failed direct-class qualification. Official TS property definitions plus source binding checks and separate local reference queries recover all seven; exact-class guards remain unchanged.
- A new non-bindable negative exposed an upstream reference overmatch. Angular AST and emitted disabled-binding instructions establish that the child is inactive; a positive host control remains active. Preserve raw evidence and reject only the child during skill reconciliation. Expanded final matrix includes 47 template occurrences and 109 reconciled locations, with no unexplained missing/extras.
- Corrected fixture/oracle authoring errors separately: two invalid draft template snippets, two omitted export-alias expectations and an opener count that omitted the generic wrapper. Failure artifacts and the first-pass source/oracle remain in ignored output.
- Seven member queries match 16 exact locations; seven TS follow-ups match 18; 11 opener signatures reject one local lookalike; 12 source-reviewed relationships explain default lazy routes and indirect template/component display. All eight peculiar items investigated; registry-key and conditional-route runtime choices remain unresolved.
- Final runs: gauntlet 1/1 in 20.63 s; existing regressions 29/29 in 55.91 s; scale 1/1 in 213.64 s, preserving exact 489/114 spans and 8,015/2,184 config pairs across 54 libraries/three apps. All 18 gauntlet inputs remain unchanged and Angular children exit.
- Updated portable rendering guidance, acceptance cases, results/summary, brief, plan, sources, decisions and idea index. Skill metadata, 162 retained files' JSON/links/anchors/whitespace and discovery links validate. This extension is author-directed static/compiler qualification, not a new independent-review verdict, browser run or production 95% claim. No production helper, catalog algorithm, application source, commit or publication changed.
