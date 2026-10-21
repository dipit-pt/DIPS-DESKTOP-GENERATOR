import { dlopen, FFIType, ptr } from "bun:ffi";
import {
  ApplicationMenu,
  BrowserView,
  BrowserWindow,
  Utils,
  Updater,
} from "electrobun/main";
import { createUpdateController } from "../updater";
import type { DesktopRPC } from "../notifications";
import { APP_ID, APP_TITLE, APP_URL, APP_VERSION } from "../settings";

// Windows associates windows/taskbar entries with the process AppUserModelID.
// Set this before creating the first native window. Windows toast attribution
// still depends on an installed Start Menu shortcut with the same ID.
if (process.platform === "win32") {
  try {
    const shell = dlopen("shell32.dll", {
      SetCurrentProcessExplicitAppUserModelID: {
        args: [FFIType.ptr],
        returns: FFIType.i32,
      },
    });
    const id = Buffer.from(APP_ID + String.fromCharCode(0), "utf16le");
    const result = shell.symbols.SetCurrentProcessExplicitAppUserModelID(ptr(id));
    if (result !== 0) console.warn("Unable to set Windows AppUserModelID:", result);
    shell.close();
  } catch (error) {
    console.warn("Windows AppUserModelID initialization failed:", error);
  }
}

const parsed = new URL(APP_URL);
if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
  throw new Error("APP_URL must be an http(s) URL");
}

// Download in the background; install prepared updates on the next launch.
const updates = createUpdateController(Updater, Utils.showMessageBox, APP_TITLE, APP_VERSION);

// Keep all app-level actions in one native menu.
ApplicationMenu.setApplicationMenu([
  {
    label: "Settings",
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

new BrowserWindow({
  title: APP_TITLE,
  url: parsed.toString(),
  rpc,
  preload: "views://preload/index.js",
  navigationRules: JSON.stringify(["^*", `${parsed.origin}/*`]),
  frame: { width: 1280, height: 850, x: 120, y: 80 },
});

ApplicationMenu.on("application-menu-clicked", (event) => {
  const action = (event as { data?: { action?: string } }).data?.action;
  if (action === "check-for-updates") {
    void updates.check();
  }
});

// Start only after the window and application menu are initialized.
void updates.startup();
