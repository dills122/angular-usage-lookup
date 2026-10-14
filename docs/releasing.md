# Build and release

The versioned deliverable is `dist/angular-usage-lookup-VERSION.zip`, with a
`.zip.sha256` checksum and `.manifest.json` file inventory. The ZIP extracts to one
`angular-usage-lookup/` folder. It includes instructions, runtime scripts,
references, UI metadata, installation notes, the MIT license, package.json and the full lockfile.
The lockfile retains dev-dependency metadata so it matches the source package;
install the bundle with `npm ci --omit=dev`.

Python's standard ZIP library uses sorted, uncompressed entries, fixed timestamps
and permissions. Identical payloads produce identical bytes across operating
systems; ZIPs contain no wall-clock time or local repository path. Tests, research,
node_modules, caches and AI Central are outside the allowlist.

## Local candidate

1. Update root and skill `package.json` versions together; update the skill
   lockfile with `npm install --package-lock-only --prefix skill/angular-usage-lookup`.
2. Record changes, qualification versions and limitations in `CHANGELOG.md`.
3. Run `npm run setup` and `npm run check`.
4. Review `dist/` and the bundle smoke evidence in `test-output/`.

No tag, commit or publication is part of a local build. Both packages are MIT
licensed and retain `private: true` because the deliverable is a skill ZIP, not an
npm library. Package metadata follows the official [npm package manifest
format](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/).

## GitHub draft release

When the owner authorizes a release, push a version-matched
`vVERSION` tag. The release workflow verifies the tag/package match and runs the
same reusable quality jobs as CI. Only after all pass does a contents-write job
download the **tested artifact**, check its checksum and create a **draft** GitHub
release with the three assets. It never runs `npm publish` or automatically
publishes the draft. The GitHub-provided token needs no separate stored secret.

Manual dispatch is supported only when selecting a tag, not a branch. Existing
releases are not overwritten: `gh release create` fails if one already exists.
Inspect failed jobs before retrying; do not bypass qualification by rebuilding a
different artifact in the publishing job. Review notes and license/visibility
before manually publishing a draft. Repository metadata targets
`dills122/angular-usage-lookup`; update both package manifests if the owner changes.

Workflow actions are pinned to official release commit SHAs, checked on
2026-10-13, and Dependabot can propose updates. Validation relied on official
[Actions artifacts documentation](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)
and [GitHub CLI release creation](https://cli.github.com/manual/gh_release_create).
CI has read-only permissions; only the draft creation job has contents-write.
Fork PRs do not get a release job. There is no `pull_request_target` trigger.

## Repository protections

The [GitHub settings record](github-settings.md) describes active protections.
Only `dills122` can create `v*` release tags. Every existing tag is protected from
updates and deletion, including by the owner; use a new version for corrections.
Tag creation permission does not bypass immutability. The release workflow uses
an existing tag and has no ruleset bypass. It must still pass the full quality
workflow before creating a draft.
