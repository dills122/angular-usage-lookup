# AI Central integration

This repository uses AI Central's maintained installer in shared-link mode.
`AGENTS.md` and the repository/testing steering files are real, project-owned
files. Reusable skills and steering link to a local AI Central checkout and are
excluded by exact path in `.git/info/exclude`; they are never shipped.

Initial bootstrap on 2026-10-13 used the clean sibling checkout
`/Users/dsteele/repos/ai-central` at
`e08d63e874f39264ed36f31812476f0816b9e49e` without pulling or modifying it.
Detection selected profiles `base,javascript-typescript`, bundles `core,node`,
ten reusable skills plus compatibility links and one shared language-steering
link. The existing project-owned instructions were preserved. Shared language
templates are reference guidance; this repository's concrete commands and
fixture-preservation boundaries are defined in its own steering and README.

From a Git-initialized checkout, preview and apply:

```sh
sh tools/bootstrap-ai-central.sh --dry-run
sh tools/bootstrap-ai-central.sh
```

The helper locates `AI_CENTRAL_HOME`, a sibling `ai-central`, then
`$HOME/.ai-central`. It delegates profile/bundle selection to normal detection;
it does not install the full catalog or pull/reset the source. Existing real
files and links are preserved. To use a different existing checkout:

```sh
AI_CENTRAL_HOME=/path/to/ai-central sh tools/bootstrap-ai-central.sh --dry-run
AI_CENTRAL_HOME=/path/to/ai-central sh tools/bootstrap-ai-central.sh
```

Prerequisites: Git, POSIX shell, Python 3 and the maintained
[AI Central checkout](https://github.com/dills122/ai-central).
Inspect local links with `git status --short --ignored`. To audit the source,
run its `scripts/check.sh`. A clean checkout needs its own bootstrap because
machine-specific links are intentionally not committed.

The canonical lookup skill remains `skill/angular-usage-lookup/`, independent
of AI Central. Agents can use its `SKILL.md` directly; bootstrap does not replace
or copy it into shared AI Central sources.
