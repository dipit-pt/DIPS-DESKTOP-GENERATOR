# DIPS Desktop Generator

**One codebase. Every brand. Desktop builds on demand.**

[![Desktop builds](https://github.com/dipit-pt/DIPS-DESKTOP-GENERATOR/actions/workflows/build-desktop.yml/badge.svg)](https://github.com/dipit-pt/DIPS-DESKTOP-GENERATOR/actions/workflows/build-desktop.yml) · [Run a build](https://github.com/dipit-pt/DIPS-DESKTOP-GENERATOR/actions/workflows/build-desktop.yml)

Build lightweight Windows, macOS and Linux desktop wrappers for your web applications using **Electrobun**, **Hutch**, and **GitHub Actions**. No per-client branches, no hardcoded production URLs, and no manual source edits for each release.

## Quick start

1. Enable **Settings → Pages → Build and deployment → Source → GitHub Actions** once in this repository.
2. Open **Actions → DIPIT Desktop Apps → Run workflow**, selecting `main`.
3. Enter the application name (`name`), HTTPS website URL (`url`), and optional icon URL (`image`).
4. The workflow saves the app in `apps.json` and builds macOS ARM64, Windows x64, and Linux x64.
5. Download the app's platform artifact from the workflow run. The macOS artifact includes `release-ready/macos-arm64.zip`; updater bundles are published separately to Pages.

The hostname becomes the app ID: `tarefas.fozconstroi.com` → `com.fozconstroi.tarefas`. Apps using the same hostname share an identity.

## Automatic updates

Every push to `main` rebuilds all registered apps with version `1.2.<GitHub run number>`. The root `VERSION` file is not currently used by the workflow. A new version becomes available only after all builds, publishing, and Pages deployment succeed.

```text
Push to main → build every app/platform → collect update manifests and bundles
             → save gh-pages copy → deploy GitHub Pages → verify public downloads
```

Update files are served from:

```text
https://dipit-pt.github.io/DIPS-DESKTOP-GENERATOR/apps/<app-id>/
```

The workflow explicitly deploys with `actions/deploy-pages`. Merely pushing the `gh-pages` branch with `GITHUB_TOKEN` does not trigger a Pages build. Enable the GitHub Actions Pages source before running this workflow; the standard workflow token cannot enable a missing Pages site. Public verification checks each platform's version and bundle accessibility after deployment.

Apps check at startup and download new updates in the background. On the next launch, the app checks the feed to restore its prepared update state, then applies the update and relaunches. A fresh background download does not interrupt the current session. This startup path needs access to the update server.

**Check for Updates…** displays server/download errors and offers **Restart Now** or **Later** once the update is ready. Selecting Later leaves it prepared for the next launch.

### Recovering older installations

Version 1.2.41 hides update-server failures in notifications and checks prepared state before restoring it from disk. Even after the feed is restored, its quit/reopen path cannot reliably install the download. Install a fixed build manually once: quit the app, download the new macOS ZIP from the successful Actions run, extract it, and replace the copy in Applications. Future updates then use the corrected flow.

A `404` at `stable-macos-arm64-update.json` means the feed is not being served; a successful build alone does not prove publishing succeeded. Verify the deploy job and Pages configuration.

## Repository map

| Path                                  | Responsibility                                                        |
| ------------------------------------- | --------------------------------------------------------------------- |
| `src/bun/index.ts`                    | Creates the browser window and loads the configured URL               |
| `src/preload/index.ts`                | Exposes the native notification bridge only to the configured website |
| `src/notifications.ts`                | Shared notification RPC types                                         |
| `src/settings.ts`                     | Local-development defaults; overwritten in CI                         |
| `electrobun.config.ts`                | App identity, version, and build configuration                        |
| `hutch.config.ts`                     | Development and build commands                                        |
| `.github/workflows/build-desktop.yml` | Parameterized Windows/macOS/Linux build pipeline                      |

## Local development

Install the required Electrobun/Hutch toolchain, then run:

```bash
hutch electrobun dev --watch
```

For local testing, edit `src/settings.ts` or generate it yourself. The workflow replaces it for CI builds.

## Native editing

Generated apps include a native **Edit** menu for undo, redo, cut, copy, paste, paste and match style, and select all. On macOS these roles enable the standard Command shortcuts in the focused webview field. Windows/Linux keep their native webview editing behaviour; platform menu-role support varies. Clipboard contents are not exposed through the notification bridge.

## File downloads

The wrapper allows HTTP(S), `blob:`, and `data:` navigation for downloads, generated exports, and login redirects. The native webview handles saving files (macOS saves to Downloads). Completed downloads show a system notification and an in-app notification with **Open File**, **Show in Folder**, and **Dismiss** actions. The in-app actions use native-issued download IDs; the website cannot supply a filesystem path. The pinned Electrobun native notification API has no click callback, so opening a download is handled by the in-app notification. Failures show an error dialog. New-window links to the configured website reuse the authenticated webview; external HTTP(S), email, and telephone links open in their default application. The View menu provides reload, back/forward, Open Downloads Folder, and Open in Browser. Notification and completed-download RPC are exposed only on the configured origin.

Install a new wrapper build to receive native changes; updating the website cannot change an already installed wrapper. The website can also disable its own download button while fetching a file; a forbidden cursor during that request is not an OS permission indicator.

## Native notifications

Generated apps expose `window.multiDesktop.notify({ title, body })` to the configured website's top-level page. The website calls this when it receives a new notification; the launcher displays it through [Electrobun Utils.showNotification](https://framework.blackboard.sh/electrobun/apis/utils/#notifications).

```js
if (window.multiDesktop) {
  await window.multiDesktop.notify({
    title: "New notification",
    body: "A task was updated.",
  });
}
```

The bridge is restricted to the configured origin. The window keeps navigation on that origin; external login redirects must be reviewed before using this template. It exposes no arbitrary filesystem or command API; download actions are restricted to files reported complete by the native webview. Text is bounded at the native handler.

The website owns delivery/realtime and the user's device preference. This is not a background push subscription: the desktop app must stay running, including minimized. A successful call means the native request was accepted; OS permissions and Focus/Do Not Disturb can still suppress display. Existing installations need a new generated build; updating the website alone cannot add the bridge.

Linux also needs a desktop notification daemon and `notify-send` (`libnotify-bin` on Debian/Ubuntu). Builds pin Electrobun 2.0.2 and use Bun; a local macOS Cottontail run blocked during notification RPC, while the Bun request completed. macOS ARM64 build and isolated bridge checks passed locally; Windows/Linux runtime and actual OS display still require native-device verification.

## Release checklist

- [ ] Verify the destination URL uses HTTPS.
- [ ] Verify the hostname maps to the intended application identity.
- [ ] Confirm the workflow version and successful Pages deployment.
- [ ] Build for the desired operating systems.
- [ ] Test installation, authentication, navigation, and external links.
- [ ] Configure signing/notarization before distributing to end users.

## Notes

- Workflow artifacts contain **build outputs**, not signed production releases by default.
- Platform-specific builds run on their respective GitHub-hosted runners.
- Do not commit generated installers, temporary build files, or credentials.
- A single `main` branch is intended to serve all clients.

---

Maintained by **DIPIT**.
