# Desktop release process (experimental branch)

## Build without releasing

Run **DIPIT · Build (test only)** with app name, target URL, selected operating systems, and optionally an HTTPS square icon URL and a stable update base URL. The run produces CI artifacts and a build manifest, retained for 30 days. It does **not** publish a release or modify any update feeds.

Install and exercise those packages on real Windows/macOS/Linux devices before promoting. Keep the build run ID.

## Promote a tested build

Run **DIPIT · Publish approved build** and supply the successful build run ID. The workflow checks successful completion, downloads the archived outputs and manifest, packages installers and SHA-256 checksums, and creates a GitHub Release. It does not rebuild the binaries.

Configure GitHub's **production** Environment with required reviewers to add a real approval step. A manual dispatch by itself is not access control.

## Automatic updates: hosting is still required

The app has a native **Updates > Check for Updates** menu on Windows/macOS, and a background check. If a production `release.baseUrl` was embedded, the app can download approved update metadata and payloads. Prepared updates are applied the next time the app launches. Linux does not currently provide the native application menu.

**Current limitation:** this branch's publish workflow creates a *private repository* GitHub Release but does NOT publish Electrobun update metadata to a public per-app HTTPS host. Auto-update is therefore not production-ready yet. Do not set the Update URL to a location that is not independently controlled and populated only by manual approvals.

Before production rollout, implement a verified publish-to-host stage that uploads *all* Electrobun `artifacts/` update bundles and patches to a per-app prefix and replaces the stable update JSON **last**, only after human approval. Restrict the hosting credentials to the production environment. Configure a unique, immutable application identity, a monotonic app version per release, code signing and rollback procedure. These matter especially because all applications currently share the repository's `VERSION` file.

## Testing checklist

- Test custom logo on macOS, Windows and Linux in real installers.
- Confirm notification and native update menu on Windows/macOS.
- Confirm a test build **does not** create a GitHub Release.
- Confirm a successful test build can be manually promoted.
- Confirm an unsuccessful run cannot be promoted.
- Confirm a previous public update endpoint remains unchanged after unapproved builds.
- Validate staged update persistence and application of an approved version on a second launch.
- Validate signing/notarization before external distribution.
