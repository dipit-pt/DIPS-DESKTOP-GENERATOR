import {
  ApplicationMenu,
  BrowserView,
  BrowserWindow,
  Utils,
  Updater,
} from "electrobun/main";
import { createUpdateController } from "../updater";
import type { DesktopRPC } from "../notifications";
import { APP_TITLE, APP_URL, APP_VERSION } from "../settings";

const parsed = new URL(APP_URL);
if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
  throw new Error("APP_URL must be an http(s) URL");
}

// Download in the background; install prepared updates on the next launch.
const updates = createUpdateController(Updater, Utils.showMessageBox, APP_TITLE, APP_VERSION);

// Keep all app-level actions in one native menu.
ApplicationMenu.setApplicationMenu([
  {
    label: APP_TITLE,
    submenu: [
      { label: `Version ${APP_VERSION}`, enabled: false },
      { type: "separator" },
      { label: "Check for Updates…", action: "check-for-updates" },
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

const mainWindow = new BrowserWindow({
  title: APP_TITLE,
  url: parsed.toString(),
  rpc,
  preload: "views://preload/index.js",
  // Authenticated file downloads and generated exports use object URLs.
  navigationRules: JSON.stringify(["^*", `${parsed.origin}/*`, `blob:${parsed.origin}/*`]),
  frame: { width: 1280, height: 850, x: 120, y: 80 },
});

function downloadDetails(event: unknown): { filename?: string; path?: string; error?: string } {
  const detail = (event as { data?: { detail?: unknown } }).data?.detail;
  if (detail && typeof detail === "object") return detail;
  if (typeof detail === "string") {
    try { return JSON.parse(detail); } catch { /* Older runtimes may send plain text. */ }
  }
  return {};
}

mainWindow.webview.on("download-completed", (event) => {
  const { filename, path } = downloadDetails(event);
  console.log("[download] Saved", path ?? filename);
  Utils.showNotification({
    title: "Download complete",
    body: path ?? filename ?? "Your file was saved to Downloads.",
  });
});

mainWindow.webview.on("download-failed", (event) => {
  const { filename, error } = downloadDetails(event);
  console.error("[download] Failed", filename, error);
  void Utils.showMessageBox({
    type: "error", title: APP_TITLE,
    message: "Could not download " + (filename || "the file") + ".",
    detail: error || "Please try again.", buttons: ["OK"],
  });
});

ApplicationMenu.on("application-menu-clicked", (event) => {
  const action = (event as { data?: { action?: string } }).data?.action;
  if (action === "check-for-updates") {
    void updates.check();
  }
});

// Start only after the window and application menu are initialized.
void updates.startup();
