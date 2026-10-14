# v0.1.0 fresh-agent ZIP trial

**Passed on 2026-10-13** (finished 2026-10-14 UTC). A fresh-context agent used the
actual release ZIP to produce a classified component and MatDialog inventory in
a generated Nx workspace with 54 libraries, three apps and 63 leaf configs.
The final report recovered every authored reference location and configuration
association, investigated every peculiar item, and retained genuine unknowns.
This supports an initial **Angular 21 pilot release**. It is not a production
accuracy estimate.

## What was tested

- Source: `ab5d95943c29970d19a99e74150e00bcbeacd417`.
- ZIP SHA-256: `2a1c328cb7a81b20ed90d9b5cfc6cd5ca11ecff33e9b49a59227488434a983b8`.
- Angular/core/compiler/language-service/server 21.2.25; TypeScript 5.9.3;
  Material/CDK 21.2.14; Nx 23.3.0; Node 22.23.3.
- Fresh Codex subagent, no inherited conversation. The exact model build was not
  captured. It received the installed ZIP, raw application, installed dependency
  packages, and its own output directory. No answer keys, preselected probes,
  prepared manifests, expected counts or prior reports were supplied.
- Physical dependency copies had no symlinks into the maintainer checkout.
  Access isolation was enforced by instructions, not an OS sandbox.
- The raw fixture was transformed: target names/selectors changed, source ranges
  shifted, six test-template usages and one direct dialog call added. Every
  original case remained. The independent oracle came from the fixture author's
  expectations, with those transformations applied before the agent ran.
  The published skill still contains historical qualification examples; this
  trial is an additive variant, not an entirely unrelated production codebase.

All 63 Angular compilation targets passed through Nx before grading. The helper's
production-only install succeeded from the extracted ZIP. Installed skill files
still matched the ZIP byte for byte after the trial.

## Independent grading

| Target | Authored physical reference spans | Reference/config pairs | Final matched |
| --- | ---: | ---: | --- |
| AuditCardComponent | 495 | 8,021 | All, with no missing or extra core references |
| AuditPanelComponent | 115 | 2,206 | All, after follow-up reconciliation |

These raw-evidence counts include one declaration per target. The final report
correctly excluded declarations from consumer totals. For programmatic calls it
preserved the original argument ranges in addition to the wider call-site range;
the grading normalized those retained ranges, rather than confusing a call span
with a class-reference span. All four additional confirmed alias/caller/export
records were reviewed separately and supported by their source/TypeScript chains.

The final user-facing inventory contains:

- **494 confirmed card occurrences**: 485 template sites and nine code dependencies.
- **118 confirmed dialog occurrences**: 56 actual Material open call sites, two
  wrapper/service entry sites, and 60 import/registry/type dependencies. Wrapper
  entries can reach already-counted openers; these are not runtime instance counts.
- Three plain story render strings and one variable-key registry opener retained
  as candidates. The generic `openAny` body is a shared flow edge, not another
  definite target occurrence.
- 49 unrelated same-name/selector card scopes, two OtherDialog calls and one
  unrelated same-named dialog rejected with evidence.
- All 63 configs accounted for. Card queries qualified all 63; dialog TS queries
  qualified 61. The two programs without the target and the absence of a real
  dialog template probe remain visible; TS coverage is not labeled template coverage.

Nine peculiar items were investigated: **three recovered misses, two explained,
one already accounted for and three unresolved**. None remained pending.
The unresolved groups are story runtime scope, variable registry selection, and
positive dialog/template qualification. Accordingly the lookup report remains
`partial`; a correctly bounded partial inventory passes this behavioral trial.

## The gap the skill recovered

The first dialog class-reference query found the lazy opening location but omitted
**58 of its configuration associations**. The agent discovered this independently,
then queried the local binding and verified its exact declaration identity in each
containing program. Its final record has all 59 applicable contexts. It also
followed the constant alias, literal registry key, generic wrapper's target-valued
caller, service caller and alias re-export, retaining native evidence.

The shipped instructions already required this work. No runtime-helper or skill
instruction fix was necessary after the trial. The project gap was the lack of a
repeatable behavioral release check: preparation/grading tools, five regression
checks and a manual release gate have now been added outside the shipped bundle.
The candidate ZIP hash is unchanged.

## Evidence and limits

[Machine-readable grading metrics](agent-evaluation-metrics.json) retain hashes,
per-pattern oracle matches, extra-record review locations and cleanup results.
The full local run is retained under `test-output/agent-trial-a/`, including the
agent report, inventory, per-config raw evidence, private oracle, initial failure,
reconciled scoring and compiler output. That generated directory is ignored by
Git. Use the [evaluation procedure](agent-evaluation.md) to reproduce the trial.

All **769 source/config files** were unchanged; all **63 Angular collection
processes** exited. The agent checked its evidence links and report consistency.
Repository validation and all ten packaging/grading regressions passed.

This was one explicitly invoked skill run against source/typecheck fixtures.
Automatic skill discovery, other models/hosts, repeated-run reliability, real
Jest/Storybook/browser execution, built-package identity, federation, production
accuracy and arbitrary runtime selection remain unqualified. The result does not
establish a universal 95% score. No tag or release was created by this validation.
