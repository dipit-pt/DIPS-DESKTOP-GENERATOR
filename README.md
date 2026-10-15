# DIPS Desktop Generator

**One codebase. Every brand. Desktop builds on demand.**

[![Desktop builds](https://github.com/dipit-pt/DIPS-DESKTOP-GENERATOR/actions/workflows/build-desktop.yml/badge.svg)](https://github.com/dipit-pt/DIPS-DESKTOP-GENERATOR/actions/workflows/build-desktop.yml) · [Browse releases](https://github.com/dipit-pt/DIPS-DESKTOP-GENERATOR/releases) · [Run a build](https://github.com/dipit-pt/DIPS-DESKTOP-GENERATOR/actions/workflows/build-desktop.yml)

Build lightweight Windows, macOS and Linux desktop wrappers for your web applications using **Electrobun**, **Hutch**, and **GitHub Actions**. No per-client branches, no hardcoded production URLs, and no manual source edits for each release.

## Quick start

1. Open **Actions → Build desktop apps → Run workflow**.
2. Select the **main** branch.
3. Enter only the **app name**, **website URL**, and **platform**. The identifier and version are generated automatically.
4. Start the workflow. When both build and publish jobs succeed, find the named app under **Releases** on the right-hand side of the repository.
5. Open the release and download the ZIP for your platform from **Assets**.

| Input    | Example                            | Purpose                                             |
| -------- | ---------------------------------- | --------------------------------------------------- |
| App name | `FozConstroi Tarefas`              | Desktop window title and app name                   |
| App URL  | `https://tarefas.fozconstroi.com/` | Website loaded by the desktop window                |
| Platform | `both`                             | Windows, macOS, Linux, both (Windows/macOS), or all |

> **Automatic identity:** The hostname is reversed to form the app ID: `tarefas.fozconstroi.com` → `com.fozconstroi.tarefas`. Paths and ports are ignored. Version is `1.0.<workflow run number>` and increments with every workflow run (across all apps). Builds using the same hostname share an app ID; use distinct subdomains for separate installable apps. The URL and name are embedded at build time.

## Build gallery: GitHub Releases

Every successful manual build publishes a **named GitHub Release** with the application name, version, website URL, build number, and downloadable platform archives. This makes the repository's **Releases** sidebar your build catalog.

**Example:** `FozConstroi Tarefas · v1.0.0 · Build #12`

Release tags include the app identifier and workflow run ID to avoid collisions across builds. Downloads remain accessible from [Releases](https://github.com/dipit-pt/DIPS-DESKTOP-GENERATOR/releases).

> Releases are created only after a successful build. If the repository's Actions token cannot publish releases, set **Settings → Actions → General → Workflow permissions** to **Read and write permissions** (subject to organization policy).

## How it works

```text
GitHub Actions inputs
         |
         +--> Derive reversed-domain ID + automatic version
         |
         +--> Generate src/settings.ts (build only)
         |
         +--> Electrobun config reads APP_NAME / APP_ID / APP_VERSION
         |
         +--> Hutch + Electrobun package the desktop app
         |
         +--> Upload CI artifacts
         |
         +--> Publish a named GitHub Release with download links
```

The workflow generates `src/settings.ts` in the runner workspace. The generated file is **not committed**. Each workflow run starts from the same source branch.

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

The bridge is restricted to the configured origin. The window keeps navigation on that origin; external login redirects must be reviewed before using this template. It exposes no filesystem or command API. Text is bounded at the native handler.

The website owns delivery/realtime and the user's device preference. This is not a background push subscription: the desktop app must stay running, including minimized. A successful call means the native request was accepted; OS permissions and Focus/Do Not Disturb can still suppress display. Existing installations need a new generated build; updating the website alone cannot add the bridge.

Linux also needs a desktop notification daemon and `notify-send` (`libnotify-bin` on Debian/Ubuntu). Builds pin Electrobun 2.0.2 and use Bun; a local macOS Cottontail run blocked during notification RPC, while the Bun request completed. macOS ARM64 build and isolated bridge checks passed locally; Windows/Linux runtime and actual OS display still require native-device verification.

## Release checklist

- [ ] Verify the destination URL uses HTTPS.
- [ ] Verify the hostname maps to the intended application identity.
- [ ] Confirm the automatically assigned version.
- [ ] Build for the desired operating systems.
- [ ] Test installation, authentication, navigation, and external links.
- [ ] Configure signing/notarization before distributing to end users.

## Notes

- GitHub Releases contain **build outputs**, not signed production releases by default.
- Platform-specific builds run on their respective GitHub-hosted runners.
- Do not commit generated installers, temporary build files, or credentials.
- A single `main` branch is intended to serve all clients.

---

Maintained by **DIPIT**.
