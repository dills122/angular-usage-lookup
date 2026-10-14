# Install this skill bundle

Extract the release ZIP. Its top-level folder is `angular-usage-lookup` and contains
`SKILL.md`. Place that whole folder in your agent's skill directory, or point the
agent directly at `SKILL.md`. Preserve its relative layout.

The instructions can be read without installation. To use the local helper
scripts, use Node 22.23.3+ in the 22.x line, or Node 24.15+, and run
inside the extracted folder:

```sh
npm ci --omit=dev
```

This installs the pinned Angular Language Server and protocol dependencies in the
skill folder. The **scanned workspace** must already supply the qualified Angular
dependencies for an exact qualified profile: Angular 20.3.33 / TypeScript 5.9.3,
Angular 21.2.25 / TypeScript 5.9.3, or Angular 22.2.2 / TypeScript 6.0.3.
For Angular 20 or 22, the workspace must also already supply language-server
20.3.0 or 22.2.2 respectively and language-service matching Angular core exactly.
The helper-installed server/service provide the Angular 21 default.
The optional compiler candidate backend requires workspace compiler/compiler-cli
21.2.25. The Material catalog has its own stricter
installed-version profile. Do not install or upgrade packages in a scanned
application as a side effect of lookup.

The ZIP includes `package-lock.json` and `BUNDLE-MANIFEST.json` (file hashes and
version). Verify the downloaded ZIP against the separate release `.sha256` file
before extracting. Dependencies are downloaded from npm; they are not vendored.
Tests, research and AI Central are intentionally development-only. The package's
test commands require a repository checkout; follow `SKILL.md` for runtime use.

The skill is MIT licensed; keep the included `LICENSE` with redistributed copies.
Dependencies retain their own licenses. `private: true` in package.json prevents
npm publication and does not restrict the MIT license. Source, issues and release
assets belong to [dills122/angular-usage-lookup](https://github.com/dills122/angular-usage-lookup).

Current support and limitations are in `references/acceptance-cases.md` and
`references/local-collection.md`. Collection remains partial until the skill
reconciles scope, candidates and peculiar items.
