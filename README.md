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

## Application chrome and desktop menu

The native window title uses the generated app's `APP_TITLE` (for example, **A+ Tarefas**). The hosted web application controls its own header and toolbar. To avoid showing the same name in both locations, the native application menu is labeled **Settings** and contains the desktop-specific **Version**, **Check for Updates…**, and **Quit** actions. This is a menu, not a new web settings page. If the website also renders its own title/header, adjust that website separately.

## Native editing

Generated apps include a native **Edit** menu for undo, redo, cut, copy, paste, paste and match style, and select all. On macOS these roles enable the standard Command shortcuts in the focused webview field. Windows/Linux keep their native webview editing behaviour; platform menu-role support varies. Clipboard contents are not exposed through the notification bridge.

## Native notifications

Generated apps expose `window.multiDesktop.notify({ title, body })` to the configured website's top-level page. The website calls this when it receives a new notification; the launcher displays it through [Electrobun Utils.showNotification](https://framework.blackboard.sh/electrobun/apis/utils/#notifications). The website supplies the **notification title** (such as the task name) and **body**, while the operating system decides the **sender name and icon**. The native wrapper does not add a `MULTI —` prefix.

```js
if (window.multiDesktop) {
  await window.multiDesktop.notify({
    title: "Notificação de teste",
    body: "A task was updated.",
  });
}
```

### Notification identity on Windows

The wrapper sets the current Windows process AppUserModelID to the generated app ID before window creation. This is an experimental step toward matching the taskbar/runtime identity; it does **not** install a matching Start Menu shortcut or guarantee notification sender branding. Verify on Windows before treating it as a fix.\n\n**Known limitation:** A Windows toast can show **Bun** as the sender and a generic icon, even when the generated window and installer use the app name and icon. The `APP_NAME`, `APP_ID`, and `APP_ICON_URL` build inputs do not, by themselves, guarantee that Windows toast notifications use that identity. This requires Windows-specific notification registration / app identity integration and verification on a real installed build (including the Windows AppUserModelID and shortcut/notification activation behavior as applicable). Do not report branded Windows notifications as working until verified.

**Desired example for A+ Tarefas:**

- Windows sender name: `A+ Tarefas`
- Windows sender icon: the generated A+ Tarefas application icon
- Notification title: `Notificação de teste` (or the actual task title), **not** `MULTI — Notificação de teste`
- Notification body: provided by the hosted website

The wrapper currently forwards the received title unchanged. If a toast title contains `MULTI —`, fix the website's notification payload at its source instead of hardcoding one client's prefix into this shared generator.

**Windows verification:** generate an app with `name=A+ Tarefas` and an HTTPS icon image; install and launch it normally, send a test notification through `window.multiDesktop.notify`, then inspect the notification popup and Windows Notification Center. Check sender name, icon, title/body, click behavior, and whether the result persists after reinstall/restart. Repeat with a second brand to catch hardcoded names.

The bridge is restricted to the configured origin. The window keeps navigation on that origin; external login redirects must be reviewed before using this template. It exposes no filesystem or command API. Text is bounded at the native handler.

The website owns delivery/realtime and the user's device preference. This is not a background push subscription: the desktop app must stay running, including minimized. A successful call means the native request was accepted; OS permissions and Focus/Do Not Disturb can still suppress display. Existing installations need a new generated build; updating the website alone cannot add the bridge.

Linux also needs a desktop notification daemon and `notify-send` (`libnotify-bin` on Debian/Ubuntu). Builds pin Electrobun 2.0.2 and use Bun; a local macOS Cottontail run blocked during notification RPC, while the Bun request completed. macOS ARM64 build and isolated bridge checks passed locally; Windows/Linux runtime and actual OS display still require native-device verification.

## Release checklist

- [ ] Verify the destination URL uses HTTPS.
- [ ] Verify the hostname maps to the intended application identity.
- [ ] Confirm the workflow version and successful Pages deployment.
- [ ] Build for the desired operating systems.
- [ ] Test installation, authentication, navigation, and external links.
- [ ] Check native title-bar versus hosted website header duplication.
- [ ] Test OS notifications on each target platform; on Windows verify sender name/icon and unprefixed task title.
- [ ] Configure signing/notarization before distributing to end users.

## Notes

- Workflow artifacts contain **build outputs**, not signed production releases by default.
- Platform-specific builds run on their respective GitHub-hosted runners.
- Do not commit generated installers, temporary build files, or credentials.
- A single `main` branch is intended to serve all clients.

---

Maintained by **DIPIT**.
