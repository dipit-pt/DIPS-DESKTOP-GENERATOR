# DIPS Desktop Generator

**One codebase. Multiple branded desktop apps.**

Build lightweight Windows and macOS desktop wrappers for your web applications using **Electrobun**, **Hutch**, and **GitHub Actions**. No per-client branches, no hardcoded production URLs, and no manual source edits for each release.

## Quick start

1. Open **Actions → Build desktop apps → Run workflow**.
2. Select the **main** branch.
3. Enter the app name, HTTPS URL, unique app identifier, version, and platform.
4. Start the workflow and download the resulting artifacts from the run.

| Input | Example | Purpose |
| --- | --- | --- |
| App name | `FozConstroi Tarefas` | Desktop window title and app name |
| App URL | `https://tarefas.fozconstroi.com/` | Website loaded by the desktop window |
| App ID | `com.dipit.fozconstroi.tarefas` | Unique installation identity |
| Version | `1.0.0` | Application version |
| Platform | `both` | Windows, macOS, or both |

> **Important:** Use a distinct app ID for each product. The URL and name are embedded at build time, not read from the user's machine.

## How it works

```text
GitHub Actions inputs
         |
         +--> Generate src/settings.ts (build only)
         |
         +--> Electrobun config reads APP_NAME / APP_ID / APP_VERSION
         |
         +--> Hutch + Electrobun package the desktop app
         |
         +--> Download Windows / macOS artifacts
```

The workflow generates `src/settings.ts` in the runner workspace. The generated file is **not committed**. Each workflow run starts from the same source branch.

## Repository map

| Path | Responsibility |
| --- | --- |
| `src/bun/index.ts` | Creates the browser window and loads the configured URL |
| `src/settings.ts` | Local-development defaults; overwritten in CI |
| `electrobun.config.ts` | App identity, version, and build configuration |
| `hutch.config.ts` | Development and build commands |
| `.github/workflows/build-desktop.yml` | Parameterized Windows/macOS build pipeline |

## Local development

Install the required Electrobun/Hutch toolchain, then run:

```bash
hutch electrobun dev --watch
```

For local testing, edit `src/settings.ts` or generate it yourself. The workflow replaces it for CI builds.

## Release checklist

- [ ] Verify the destination URL uses HTTPS.
- [ ] Use a stable, unique application ID.
- [ ] Set the intended version.
- [ ] Build for the desired operating systems.
- [ ] Test installation, authentication, navigation, and external links.
- [ ] Configure signing/notarization before distributing to end users.

## Notes

- GitHub Actions artifacts are **build outputs**, not a signed production release by default.
- Platform-specific builds run on their respective GitHub-hosted runners.
- Do not commit generated installers, temporary build files, or credentials.
- A single `main` branch is intended to serve all clients.

---

Maintained by **DIPIT**.
