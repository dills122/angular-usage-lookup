# Trustworthy Angular usage lookup

- Status: validating
- Created: 2026-10-13
- Updated: 2026-10-13
- Decision owner: repository owner
- Decision question: Can a portable agent skill produce an evidence-bearing inventory of Angular component, directive, pipe, and API usages by orchestrating maintained tools, without owning a new analysis engine?
- Research budget: one bounded pass over official Angular, TypeScript, Nx, and relevant tool-maintainer documentation/source, up to 16 retained source entries, plus skill validation. No target application has been supplied.
- Earlier planning budget: two additional primary-source entries for protocol/config libraries; that phase preceded the authorized implementation below.
- Authorized implementation: the initial Angular 21/two-project pilot, a six-library/two-app fixture with legacy scopes and Material dialogs, then a generated Material lookup/family catalog using the installed tooling.
- Latest experiment budget: the owner's rendering gauntlet, with source-authored expectations, bounded follow-up investigations and the matching official router dev dependency. See [gauntlet plan](gauntlet-plan.md); earlier catalog and scale experiments remain recorded separately.
- Stopping rule: validate the fixtures, investigate every peculiar discrepancy, retain results and a real-workspace gate. Do not expand into a custom analysis engine, persistent service or migration executor.

## Problem and intended user

The owner wants to start with a symbol such as `SuperCoolComponent` or a selector and find its usages across an Angular workspace or Angular Nx monorepo, to support migrations and update guidance. They explicitly request a skill and prefer trustworthy existing tools, libraries, CLIs, and MCP integrations. Tool additions with substantial value should be discussed. These are user requirements, not observed application facts.

## Proposed outcome and scope

Deliver a repository-owned skill under this idea, with a practical lookup workflow, evidence requirements, an occurrence/coverage report contract, and tool-specific guidance. Keep reusable source here rather than editing shared AI Central skill links. Research, skill authoring and the isolated pilot implementation/dependencies are authorized. Application migrations, changes to supplied workspaces, commits, publication and a new analysis service remain outside this task.

Interpret “all usages” as statically identifiable usages within a declared set of projects/configurations, with unresolved dynamic cases and inaccessible scope reported explicitly. Do not promise a complete runtime reachability analysis.

## Current position and next action

The initial [angular-usage-lookup skill](../../skill/angular-usage-lookup/SKILL.md) is authored, with backend routing, an occurrence/coverage report contract and acceptance cases. Angular Language Service is the preferred engine; Nx CLI provides project discovery. Official upstream reference tests support feasibility, while Angular/Nx MCP catalogs do not establish a generic reference-lookup backend. [S2–S4, S8–S10; see sources.]

The first qualification target is Angular 21, the newest LTS on 2026-10-13; Angular 22 is active. [S0, S1] The authorized pilot now passes on Angular 21.2.25: 11 exact reference spans in one project and 10 across two Nx consumers, including three template instances in each. The initial nine-test pilot passed. [S18] The subsequent [six-library/two-app test](stress-results.md) adds legacy structural templates and real Material dialog APIs: 26 card spans (16 template occurrences) and 18 dialog spans in their declared configs; that extension passed 14 tests. [S19, S20] With the Material catalog checks, the combined suite subsequently passed 20 tests. [S23]

The [skill and local helpers](../../skill/angular-usage-lookup/references/local-collection.md) reuse official Angular semantics, Microsoft protocol libraries, the public TypeScript service and Nx discovery. TS-only dialog rows explicitly retain a template-coverage gap. Fixture candidates were reconciled manually through the skill. Collection output remains partial until scope/candidates are reconciled; explicit manifests and backend-appropriate identity probes are required; the skill adds verified alias probes where necessary.

The requested [Material catalog](material-catalog-results.md) now generates 37 family groups from 74 typed entrypoints and 712 public export mappings. It preserves selector/binding identities, base/module/host relationships and reviewed dialog/bottom-sheet/snack-bar opener rules. A separate helper uses Angular's private migration metadata reader with exact-version guards; it supplies lookup context, not application usage proof. [S21–S23]

At the owner's request, the skill now queues unexplained observations as `peculiar` and investigates every item before reporting. Its ledger preserves the original evidence, checks, outcome and report corrections; unresolved in-scope items remain candidates/gaps and keep coverage partial. A [walkthrough of existing stress evidence](stress-results.md#peculiar-review-walkthrough--2026-10-13) exercises a recovered miss, a duplicate context, a different declaration and runtime selection. This is a skill workflow change; the collector does not automate the queue.

The owner selected a generated larger-workspace shakedown. Its [54-library/three-app qualification](scale-results.md) exercises 63 leaf configs, exact reference/config oracles, API shapes and failure boundaries. Independent reviews exposed wrong-config and ambiguous-binding confirmations; both received bounded corrections and regressions. The skill now documents config-specific consumer queries, explicit member/pipe anchoring and per-program alias follow-ups. The normal suite passes 29 tests. Synthetic qualification supports a supervised trial, not a universal 95% accuracy/helpfulness claim.

The subsequent [rendering gauntlet](gauntlet-results.md) covers lazy routes/NgModules, 48 nested views, recursive/unused templates, portals, signal/model bindings and Material component/template openers. Its 109 reconciled locations include 47 template occurrences. It recovers seven renamed lazy-binding references and rejects one non-bindable descendant reported by Angular Language Service. The skill records these investigations explicitly; runtime registry/route choices remain unresolved. [S25, S26]

Next: perform a catalog-guided lookup in one supplied Angular 21 workspace, sample locations independently and measure investigation effort, including package, actual test/story and inherited API boundaries. No production workspace, editor baseline or human-helpfulness evaluation was supplied. See [rendering limits](gauntlet-results.md), [expanded fixture limits](stress-results.md), [catalog limits](material-catalog-results.md), the [initial pilot](pilot-results.md) and the updated [plan](plan.md).

See [research and options](research.md), [build plan](plan.md), [sources](sources.md), [validation gates](validation.md), and [decision log](decisions.md).

Related project: Angular design-system component migrator (a separate Research Depot idea). This skill supplies discovery evidence; it does not perform migrations.

## Skill package and example request

The portable source is [skill/angular-usage-lookup/SKILL.md](../../skill/angular-usage-lookup/SKILL.md). Repository-local discovery links in `.agents/skills/angular-usage-lookup` and `.codex/skills/angular-usage-lookup` point to it using relative paths; they do not modify the shared AI Central skill targets. Copy the `angular-usage-lookup` source directory, excluding ignored dependencies/cache/output folders, into another host's skill location to reuse it, or explicitly provide the SKILL.md path. Restore helper dependencies using its lockfile when setup is authorized.

Example request:

> Use angular-usage-lookup to find usages of SuperCoolComponent in this Angular workspace. Resolve its declaration first. Include templates, routes, dynamic creation, tests and stories; separate imports and collateral references. Return a usage inventory and per-project coverage gaps without changing application code.
