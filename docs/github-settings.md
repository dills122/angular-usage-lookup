# GitHub repository settings

Configured and read back on 2026-10-13 for
[dills122/angular-usage-lookup](https://github.com/dills122/angular-usage-lookup).
This document records the setup; GitHub's live settings are authoritative.

## Main

[Protect main](https://github.com/dills122/angular-usage-lookup/rules/25042100)
is active for `refs/heads/main`, with no bypass actors:

- Require a pull request and resolve review conversations.
- Require `quality / All quality gates passed` from the GitHub Actions app
  (integration ID 15368), with the branch up to date before merging.
- Block force pushes and deletion, and require linear history.
- Allow squash merging only. Automatically delete merged source branches.

The aggregate check waits for bundle validation, ordinary tests, rendering
gauntlet and scale, and fails if any dependency fails. Its exact context was
verified against the first hosted check runs before enabling protection.

Required approving reviews are **zero** because `dills122` is the sole current
maintainer and cannot approve their own PR. PRs, CI and conversation resolution
still apply to the owner. Add a review requirement when there is another reviewer.
Auto-merge is available but must be enabled separately for each PR; setup did not
enable it on any pull request.

## Tags

Two separate active rulesets keep tag creation distinct from mutation:

- [Immutable tags](https://github.com/dills122/angular-usage-lookup/rules/25042104)
  matches **all tags**, blocks updates/deletions and has no bypass actors.
- [Release tag creation](https://github.com/dills122/angular-usage-lookup/rules/25042105)
  matches `refs/tags/v*` and permits creation only by `dills122` (user ID 15662762).

The owner can create a release tag but cannot move or delete it under these
rules. Correct releases by choosing a new version. Tag names must also match
package versions to pass the release workflow; the rulesets alone do not prove
that a tag is a qualified release.

## Metadata and workflow permissions

The repository has a description, README homepage and topics for Angular,
Material, Nx, TypeScript, agent skills, Codex, migrations and developer tools.
Issues remain enabled. The unused wiki is disabled; maintained docs are in Git.
GitHub Actions defaults remain read-only, and workflow tokens cannot approve PRs.
Existing secret scanning and push protection remain enabled.

## Initial hosted failure

The initial [CI run](https://github.com/dills122/angular-usage-lookup/actions/runs/38494291869)
exposed an adapter error on Linux: TypeScript's `System` supplies a boolean
`useCaseSensitiveFileNames`, whereas `LanguageServiceHost` expects a function.
The false value on the original Mac host masked the mistake. An explicit
function adapter fixes the contract; regressions exercise both host modes with
the real TypeScript language service and exact source locations.

The `.nvmrc` selects Node 22.23.3. Shipping the Angular 20 server narrows the
shared supported engine range to >=22.22.3 <23; Node 24 is outside that server’s
declared engines. The bundle gate uses an engine-strict production install.
Current hosted check runs provide Linux/runtime verification for each revision.

GitHub behavior follows its [ruleset reference](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
and [rules REST API](https://docs.github.com/en/rest/repos/rules).
