# Standalone repository extraction — 2026-10-13

User-authorized target: `/Users/dsteele/repos/angular-usage-lookup`, including
the actual skill, testing suite, relevant evidence, AI Central bootstrap, CI and
build/release packaging. User clarified **with** AI Central.

## Plan and acceptance

- [ ] Prepare a standalone repository while preserving the proven skill layout.
- [ ] Carry research/results with working links and historical provenance.
- [ ] Build a versioned, reproducible skill ZIP with a manifest and SHA-256 checksums;
  exclude tests, dependency installations, caches, research and local AI context.
- [ ] Add CI for validation, ordinary tests, gauntlet, scale and installed-bundle
  smoke tests; gate tag releases on the same checks and create draft assets only.
- [ ] Create the requested local Git repository and bootstrap AI Central using its
  maintained installer, preview first, project-owned files preserved.
- [ ] Validate extraction and bundle integrity; run all suites at the new path.
- [ ] Update Research Depot with the standalone-repo pointer and final evidence.

Keep collection/catalog algorithms unchanged. No remote, commit, push or public
release is requested. Build tooling can use existing Node/npm and Python's standard
library; do not introduce a custom analysis service or broad packaging framework.
The private package retains no assumed open-source license. CI configuration is
prepared locally; hosted execution requires a remote repository later.
