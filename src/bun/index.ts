import Electrobun, {
  ApplicationMenu,
  BrowserView,
  BrowserWindow,
  Utils,
  Updater,
} from "electrobun/main";
import { homedir } from "node:os";
import { basename, isAbsolute, join } from "node:path";
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
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "pasteAndMatchStyle" },
      { role: "delete" },
      { type: "separator" },
      { role: "selectAll" },
    ],
  },
  {
    label: "View",
    submenu: [
      { label: "Reload", action: "reload", accelerator: "r" },
      { label: "Back", action: "back" },
      { label: "Forward", action: "forward" },
      { type: "separator" },
      { label: "Open Downloads Folder", action: "downloads" },
      { label: "Open in Browser", action: "open-in-browser" },
    ],
  },
]);

const completedDownloads = new Map<string, string>();

// The website can open only downloads reported complete by the native webview.
const rpc = BrowserView.defineRPC<DesktopRPC>({
  handlers: {
    requests: {
      openDownload: ({ id, reveal }) => {
        const path = typeof id === "string" ? completedDownloads.get(id) : undefined;
        if (!path) throw new Error("This download is no longer available.");
        if (reveal) {
          Utils.showItemInFolder(path);
          return true;
        }
        return Utils.openPath(path);
      },
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
  // Permit normal web browsing, redirects, exports, and file-host downloads.
  // The native notification bridge is still exposed only on APP_URL's origin.
  navigationRules: JSON.stringify(["^*", "https://*", "http://*", "blob:*", "data:*", "about:blank"]),
  frame: { width: 1280, height: 850, x: 120, y: 80 },
});

// WKWebView reports target=_blank/window.open requests instead of opening them.
Electrobun.events.on("new-window-open", (event: unknown) => {
  const detail = (event as { data?: { detail?: unknown } }).data?.detail;
  let target: unknown = detail;
  if (typeof detail === "string") {
    try { target = JSON.parse(detail); } catch { target = { url: detail }; }
  }
  const url = (target as { url?: unknown } | null)?.url;
  if (typeof url !== "string") return;
  try {
    const destination = new URL(url);
    if (destination.origin === parsed.origin || destination.protocol === "blob:" || destination.protocol === "data:") {
      // Keep the webview's authenticated session and object-URL storage.
      mainWindow.webview.loadURL(url);
    } else if (["https:", "http:", "mailto:", "tel:"].includes(destination.protocol)) {
      Utils.openExternal(url);
    }
  } catch (error) {
    console.error("Could not open link:", error);
  }
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
  if (typeof path === "string" && isAbsolute(path)) {
    const id = crypto.randomUUID();
    completedDownloads.set(id, path);
    // Bound the session history without discarding downloads still displayed.
    if (completedDownloads.size > 100) {
      completedDownloads.delete(completedDownloads.keys().next().value!);
    }
    rpc.send.downloadCompleted({ id, filename: filename || basename(path) });
  }
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
  } else if (action === "reload") {
    mainWindow.webview.executeJavascript("location.reload()");
  } else if (action === "back") {
    mainWindow.webview.executeJavascript("history.back()");
  } else if (action === "forward") {
    mainWindow.webview.executeJavascript("history.forward()");
  } else if (action === "downloads") {
    Utils.openPath(join(homedir(), "Downloads"));
  } else if (action === "open-in-browser") {
    Utils.openExternal(parsed.toString());
  }
});

// Start only after the window and application menu are initialized.
void updates.startup();
