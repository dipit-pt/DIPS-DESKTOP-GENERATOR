import {
  ApplicationMenu,
  BrowserView,
  BrowserWindow,
  Utils,
} from "electrobun/main";
import type { DesktopRPC } from "../notifications";
import { APP_TITLE, APP_URL } from "../settings";

const parsed = new URL(APP_URL);
if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
  throw new Error("APP_URL must be an http(s) URL");
}

// Native edit roles supply clipboard actions and the standard keyboard shortcuts.
ApplicationMenu.setApplicationMenu([
  {
    label: APP_TITLE,
    submenu: [{ role: "quit", accelerator: "q" }],
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
      { role: "selectAll" },
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
