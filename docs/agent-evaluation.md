# Fresh-agent skill evaluation

This gate checks whether an agent can use the shipped skill to produce an
investigated migration inventory. Scripted collector and ZIP smoke tests alone
do not establish that behavior. This is a manual release qualification, not an
LLM run hidden inside CI.

## Paired blind discovery and transformations

Run `npm run test:blind` for deterministic fixture/grading qualification, then
`npm run build`. Prepare **both** variants with separate new input/private paths:

```sh
node tools/prepare-blind-trial.mjs \
  --input /private/tmp/lookup-baseline \
  --private /private/tmp/lookup-baseline-key --variant baseline
node tools/prepare-blind-trial.mjs \
  --input /private/tmp/lookup-transformed \
  --private /private/tmp/lookup-transformed-key --variant transformed
```

Each input contains an extracted ZIP, physical workspace dependencies and a
`request.md` with public target identities and the output contract. Install only
the isolated helper dependencies with `npm ci --omit=dev --ignore-scripts
--no-audit --no-fund --prefix INPUT/installed/angular-usage-lookup` before the
trial. Compile all eight Nx `check-*` targets, preserving logs privately. Remove
generated `.nx` cache before handing off; it is not an answer key, but keeping
inputs minimal avoids accidental cache/graph reads.
The shipped discovery helper now isolates and removes its own temporary caches.
The trial permits those internal OS temporary files while keeping application
inputs and installed helper files read-only.

Use one fresh agent with **no conversation history per input**, given only that
input's `request.md`. No prepared manifests, probes, candidate locations, expected
counts or parent-checkout access. Each agent discovers its configs and evidence.
Do not send corrective hints. Preserve its first submission and failed attempts.
These access limits are instruction-level unless the host enforces them too.

Private expectations come from source-authored markers and config roles before
any backend query. The pair preserves 36 active sites and 84 site/config pairs
across three targets, while changing symbols/selectors, aliases/barrels, project
paths, inline/external templates, line endings and UTF-16 offsets. Negative cases
include same-selector scopes, comments, strings and non-bindable descendants.
The two target-free library configs are still part of the coverage assessment.
Do not include these expectations in the agent request.

After each submission finishes:

```sh
node tools/score-blind-trial.mjs --input /private/tmp/lookup-baseline \
  --private /private/tmp/lookup-baseline-key \
  --output /private/tmp/lookup-baseline-key/score.json
```

The grader separates exact locations/contexts, linked native evidence and source
integrity. It independently resolves target declarations through TypeScript,
checks config/program membership and hashes, and validates native destinations
and spans. Success flags alone are insufficient. Unsupported or partial coverage
does not earn a full pass even if every expected positive site is present.
Review classification, scope gaps and installed ZIP integrity separately; this
is evidence validation, not cryptographic attestation of backend responses.

Compare stable logical IDs across private oracles, not renamed physical paths.
Never shrink expectations after a miss. Reproduce observed workflow defects in
regression tests, fix them, rebuild the ZIP and repeat with new inputs and fresh
agents. Keep first-attempt results alongside reruns. The fixture suite in CI
checks transformations and grading controls; it does not establish agent behavior.

## Repeat the trial

1. Run `npm run test:scale` and `npm run build` from the repository root. The scale
   generator freezes source-authored expectations before it invokes the collector.
2. Prepare an isolated input and a separate private grading directory:

   ```sh
   python3 tools/prepare-agent-trial.py --repo . \
     --trial /private/tmp/angular-skill-trial \
     --private /private/tmp/angular-skill-grading
   npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
     --prefix /private/tmp/angular-skill-trial/installed/angular-usage-lookup
   ```

   Both output directories must be new. The preparation copies the built ZIP,
   extracts it, physically copies installed workspace dependencies, and removes
   expected-result files and prepared lookup manifests from the application copy.
   It renames targets/selectors, shifts source ranges, and **adds** six test
   template occurrences and one dialog opener. All baseline cases remain. This
   prevents the historical counts in the bundled documentation being the answer.
   The grading oracle is transformed from the author's expectations, never from
   the collector's returned results.
3. Start a fresh agent with no conversation history. Give it the installed
   `SKILL.md`, the workspace, and only this request:

   > Find all usages of AuditCardComponent from libs/ui/src and
   > AuditPanelComponent from libs/dialogs/src for a migration. Include app,
   > library, test and story consumers. Investigate MatDialog paths and peculiar
   > observations. Save a classified Markdown and JSON report with raw evidence
   > under the trial output directory. Do not modify application sources/configs.
   > No replacement API has been supplied.

   Restrict it to those inputs and its output; forbid reading the grading
   directory, maintainer checkout, prior results, graph indexes or expected files.
   Do not provide expected counts, probe locations, planned fixes or hints about
   which cases it should recover. This is instruction-level isolation unless
   the chosen agent host also enforces filesystem isolation. Explicit invocation
   tests skill use; it does not test automatic skill discovery.
4. Compile the generated application with its installed Angular compiler through
   Nx. Keep that verification output with the private grading evidence, not in
   the agent inputs. Capture application hashes before and after the trial.
5. After the agent finishes, score its **class-query** raw evidence:

   ```sh
   python3 tools/score-agent-trial.py \
     --private /private/tmp/angular-skill-grading \
     --workspace /private/tmp/angular-skill-trial/workspace \
     --card /path/to/card-collection.json \
     --dialog /path/to/dialog-collection.json \
     --output /private/tmp/angular-skill-grading/score.json
   ```

   Repeat `--card` / `--dialog` for separately collected config batches. Exclude
   alias/member follow-up query reports from this class-reference comparison.
   Declaration records belong in raw evidence, but not final consumer counts.
   Preserve an initial failure if the skill later recovers it. For a reconciled
   comparison, normalize the final inventory back to its retained target reference
   ranges and contexts; a whole call span is different from its argument span.
   Review every additional alias/caller record separately instead of treating it
   as an oracle false positive or silently dropping it.
6. Review the final report against the rubric below. A raw oracle pass alone is
   insufficient. Preserve the exact request, ZIP checksum, raw evidence, final
   report, score and review outcomes. Fix only observed gaps and repeat with a
   fresh agent and a rebuilt ZIP after any skill change. Never delete expected
   cases to turn a failure into a pass.

## Report rubric

- Exact physical ranges and config contexts; investigate every miss or extra.
  Report precision/recall by target and pattern, not just an aggregate dominated
  by repeated templates. The 95% aspiration does not permit unexplained misses.
- Every discovered leaf config accounted for, including tests and stories;
  TypeScript-only coverage is never described as Angular template coverage.
- Source declarations excluded from consumer counts. Imports, registrations,
  template occurrences, call sites and caller relationships counted separately.
- MatDialog direct/renamed/lazy arguments, constant alias, literal registry key,
  generic wrapper's target-specific caller and service caller distinguished.
  Variable-key selection remains uncertain; unrelated dialog arguments excluded.
- Scoped same-name/selector controls rejected; plain story strings retained as
  collateral/candidates as justified. Conditional templates are static sites,
  not guaranteed live instances.
- Each peculiar item investigated with evidence, outcome and report updates.
  Unresolved runtime or coverage questions retain a gap and partial status.
- Migration guidance tied to observed inputs/bindings/flows; no invented API
  replacement or safe-to-delete claim.
- Original source/config hashes unchanged, helper files unchanged from ZIP,
  language-server processes stopped, no source-helper fallback or key access.

A single generated-workspace trial cannot establish production accuracy, model
consistency across repeated runs, runtime rendering, or real Storybook/Jest
integration. Preserve those limitations even when the trial scores perfectly.
