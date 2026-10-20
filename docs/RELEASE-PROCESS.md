# Releases and updates via GitHub

The source repository stays private. Only approved Electrobun update files are pushed to the `gh-pages` branch, which GitHub Pages must serve publicly.

## Once-only GitHub setup

1. Repository **Settings → Pages**: select **Deploy from a branch**, branch `gh-pages`, folder `/(root)`. The branch is created on the first approved release.
2. If GitHub Pages cannot be published publicly from this private repo under the organization's plan or policies, use a separate public updates repository or a static host. Do **not** embed a GitHub token in client apps.
3. Repository **Settings → Environments → production**: create a protected environment with required reviewers (and limit eligible deployment branches as appropriate).
4. Repository **Settings → Actions → General**: allow GitHub Actions to write repository contents (the publication job pushes `gh-pages`).
5. Test the public URL `https://dipit-pt.github.io/DIPS-DESKTOP-GENERATOR/apps/<app-id>/stable-<platform>-update.json` after first release. It must return JSON without authentication.

## Build and approve

1. Run **DIPIT · Build (test only)**; supply app name, URL, **App Version**, selected platforms and optionally the HTTPS icon URL. **There is no Update URL field**.
2. Download CI artifacts, install, and test on real target devices. This action neither creates a release nor changes the update feed.
3. Note the build **run ID**. Test artifacts expire after 30 days.
4. Run **DIPIT · Publish approved build** with that ID and approve the production environment request. It promotes the exact build, creates a GitHub Release and pushes its **stable** Electrobun update payloads and metadata to the app-specific Pages path. The JSON is delivered with the bundle from the same tested build.
5. Installed applications only discover these approved update files. The native **Updates → Check for Updates** menu is for manually checking; the app also checks on startup and applies a prepared update on a subsequent launch.

Versioning: Each app version must advance before a new approved update. Never publish a different build with the same version for the same app. The workflow does not currently enforce monotonic versions against the public feed, so validate them before approval.

**Current limitation:** the `gh-pages` branch stores binary update archives in Git; this is suitable only for modest payload sizes. GitHub enforces a 100 MiB per-file limit and Pages has usage limits. Do not use this method for larger update bundles or significant download volume; migrate that public distribution endpoint to object storage.

## Testing before merging

- A GitHub Actions test run has **not yet** validated these workflow changes. Check GitHub's YAML and platform-specific Electrobun configuration in CI.
- Ensure generated `stable-<target>-update.json` and tarball files are present and reachable on Pages, with correct names. Electrobun requires a flat directory per app.
- Check Windows/macOS native menu and update lifecycle on installed, signed packages. Unsigned builds can be rejected by platform protections.
- Test initial install, subsequent approved version, update downloaded but not installed until next launch, and broken/failed build isolation.
- Do not merge until testing and approval. Pages must be set up by a repository administrator.

## Controlled macOS updater smoke test

1. Build and install **A+ Tarefas 1.2.0** from this refactor branch. This is the updater-capable base. A previously installed 1.0.0 may not know the configured feed; replace it once manually.
2. Verify the installed app opens and its menu shows version 1.2.0. Leave it installed.
3. Make a visible harmless change on this branch, then build **1.2.1** for macOS ARM64 only. Download and check this candidate manually on a second Mac or test user if available.
4. **Only after the candidate is verified**, launch *Publish approved build* using that build's run ID. The workflow downloads the exact tested artifact, creates a GitHub Release, and publishes its stable update metadata to GitHub Pages.
5. Check GitHub Pages serves `apps/com.fozconstroi.tarefas/stable-macos-arm64-update.json` plus the referenced .tar.zst file without authentication.
6. Open the installed 1.2.0 and choose **Check for Updates**. Wait for the update-ready notification, quit and reopen the app, and verify 1.2.1 is running.

**Warning:** `stable` is a real update channel; approving a release affects *all installed applications with this exact app identifier and update base URL*, not only your test Mac. If customers already use this new updater URL, use a different test hostname/app ID or separate test update channel before publication.
