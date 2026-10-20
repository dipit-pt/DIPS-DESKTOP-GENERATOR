import Electrobun, {
  ApplicationMenu,
  BrowserView,
  BrowserWindow,
  Utils,
  Updater,
} from "electrobun/main";
import type { DesktopRPC } from "../notifications";
import { APP_TITLE, APP_URL, APP_VERSION } from "../settings";

const parsed = new URL(APP_URL);
if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
  throw new Error("APP_URL must be an http(s) URL");
}

// Updates are downloaded in the background, never installed while someone is working.
// The native updater applies a prepared update using its post-exit helper.
// A packaged stable build and an HTTPS release host are required for updates.
let checkingForUpdate = false;
async function checkForUpdates(manual = false): Promise<void> {
  if (checkingForUpdate) return;
  checkingForUpdate = true;
  try {
    const local = await Updater.getLocalInfo();
    if (!local.baseUrl) {
      if (manual) Utils.showNotification({ title: APP_TITLE, body: "Automatic updates are not configured for this build." });
      return;
    }
    const result = await Updater.checkForUpdate();
    if (!result.updateAvailable) {
      if (manual) Utils.showNotification({ title: APP_TITLE, body: "You already have the latest published version." });
      return;
    }
    await Updater.downloadUpdate();
    if (Updater.updateInfo()?.updateReady) {
      Utils.showNotification({
        title: `${APP_TITLE} update ready`,
        body: "An approved update is ready. Close and reopen the app to install it.",
      });
    }
  } catch (error) {
    console.error("Update check failed:", error);
    if (manual) Utils.showNotification({ title: APP_TITLE, body: "Could not check for updates. Try again later." });
  } finally {
    checkingForUpdate = false;
  }
}

async function resumePreparedUpdate(): Promise<void> {
  try {
    const local = await Updater.getLocalInfo();
    if (!local.baseUrl) return;
    if (Updater.updateInfo().updateReady) {
      await Updater.applyUpdate();
      return;
    }
    await checkForUpdates(false);
  } catch (error) {
    console.error("Could not resume updater:", error);
  }
}

// Keep all app-level actions in one native menu.
ApplicationMenu.setApplicationMenu([
  {
    label: APP_TITLE,
    submenu: [
      { label: `Version ${APP_VERSION}`, enabled: false },
      { type: "separator" },
      { label: "Check for Updates", action: "check-for-updates" },
      { type: "separator" },
      { role: "quit", accelerator: "q" },
    ],
  },
]);

// The bridge has no filesystem, token or arbitrary command access.
const rpc = BrowserView.defineRPC<DesktopRPC>({
  handlers: {
    requests: {
      showNotification: ({ title, body }) => {
        if (typeof title !== "string" || typeof body !== "string")
          throw new Error("Invalid notification");
        Utils.showNotification({
          title: title.slice(0, 200),
          body: body.slice(0, 2000),
        });
        return null;
      },
    },
    messages: {},
  },
});

new BrowserWindow({
  title: APP_TITLE,
  url: parsed.toString(),
  rpc,
  preload: "views://preload/index.js",
  navigationRules: JSON.stringify(["^*", `${parsed.origin}/*`]),
  frame: { width: 1280, height: 850, x: 120, y: 80 },
});

Electrobun.events.on("application-menu-clicked", (event) => {
  const action = (event as { data?: { action?: string } }).data?.action;
  if (action === "check-for-updates") void checkForUpdates(true);
});

// Start only after the window and application menu are initialized.
void resumePreparedUpdate();
