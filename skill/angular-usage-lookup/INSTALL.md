# Install this skill bundle

Extract the release ZIP. Its top-level folder is `angular-usage-lookup` and contains
`SKILL.md`. Place that whole folder in your agent's skill directory, or point the
agent directly at `SKILL.md`. Preserve its relative layout.

The instructions can be read without installation. To use the local helper
scripts, use Node >=22.22.3 <23 (tested: 22.23.3) and run inside the extracted
folder. Node 24 is outside the declared engine range of the Angular 20 server:

```sh
npm ci --omit=dev
```

This installs pinned Angular language servers for 20.3, 21.2 and 22.2 and their
service/protocol dependencies in the skill folder. The **scanned workspace** must
already supply Angular core and TypeScript on these stable major/minor lines:

| Angular core | TypeScript | Bundled server |
| --- | --- | --- |
| 20.3.x | 5.9.x | 20.3.0 |
| 21.2.x | 5.9.x | 21.2.25 |
| 22.2.x | 6.0.x | 22.2.2 |

Patch variants are admitted; prereleases and other minor lines are rejected.
Exact regression baselines are 20.3.33/5.9.3, 21.2.25/5.9.3 and 22.2.2/6.0.3;
the pilot combination 20.3.31/5.9.3 is also tested. Compatibility is not a claim
that every patch has passed the entire suite. Reports retain actual versions.
Workspace server/service packages take precedence. A missing server uses the
matching bundled server; a missing service uses that bundled server's service.
An installed incompatible workspace package fails the Angular row explicitly.
TypeScript-only rows neither resolve nor require these Angular language tools.
The language service must match core's stable major/minor line.
The optional compiler candidate backend requires workspace compiler/compiler-cli
21.2.25. The Material catalog has its own stricter
installed-version profile. Do not install or upgrade packages in a scanned
application as a side effect of lookup.

The ZIP includes `package-lock.json` and `BUNDLE-MANIFEST.json` (file hashes and
version). Verify the downloaded ZIP against the separate release `.sha256` file
before extracting. Dependencies are downloaded from npm; they are not vendored.
Tests, research and AI Central are intentionally development-only.
When installing from source, keep the checkout outside the scanned workspace and
run `npm run build` at repository root; install the resulting ZIP. Never copy the
raw skill folder into an Nx workspace: `tests/fixtures/` contains independent
`project.json` files whose names can collide with real projects. The ZIP includes
only runtime assets, dependency manifests and installation notes. The package's
test commands require a repository checkout; follow `SKILL.md` for runtime use.

The skill is MIT licensed; keep the included `LICENSE` with redistributed copies.
Dependencies retain their own licenses. `private: true` in package.json prevents
npm publication and does not restrict the MIT license. Source, issues and release
assets belong to [dills122/angular-usage-lookup](https://github.com/dills122/angular-usage-lookup).

Current support and limitations are in `references/acceptance-cases.md` and
`references/local-collection.md`. Collection remains partial until the skill
reconciles scope, candidates and peculiar items.
