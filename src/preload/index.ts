import { Electroview } from "electrobun/view";
import type { DesktopRPC } from "../notifications";
import { APP_URL } from "../settings";

// Expose one narrow capability, only to the configured app origin.
if (window.top === window && location.origin === new URL(APP_URL).origin) {
  // Keep authenticated target=_blank links in the existing native webview.
  // Doing this before WKWebView creates a popup also prevents duplicate
  // attachment downloads from the navigation and new-window callbacks.
  document.addEventListener("click", (event) => {
    const anchor = event.composedPath().find((node) => node instanceof HTMLAnchorElement);
    if (!(anchor instanceof HTMLAnchorElement) || anchor.target.toLowerCase() !== "_blank") return;
    try {
      const url = new URL(anchor.href, location.href);
      if (url.origin === location.origin || url.protocol === "blob:" || url.protocol === "data:") {
        anchor.target = "_self";
      }
    } catch { /* Leave invalid links to the browser. */ }
  }, true);

  const rpc = Electroview.defineRPC<DesktopRPC>({
    maxRequestTime: 10000,
    handlers: {
      requests: {},
      messages: {
        downloadCompleted: ({ id, filename }) => showDownload(id, filename),
      },
    },
  });
  new Electroview({ rpc });

  let downloadPanel: HTMLElement | undefined;
  let downloadList: HTMLElement;
  function showDownload(id: string, filename: string) {
    if (!downloadPanel?.isConnected) {
      downloadPanel = document.createElement("div");
      downloadPanel.setAttribute("popover", "manual");
      downloadPanel.style.cssText = "position:fixed;inset:auto 16px 16px auto;margin:0;border:0;padding:0;background:transparent;color:inherit;overflow:visible;z-index:2147483647;max-width:calc(100vw - 32px)";
      const shadow = downloadPanel.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = `
        :host { font: 14px system-ui,sans-serif; }
        section { display:grid;gap:10px;width:350px;max-width:calc(100vw - 32px); }
        article { background:#202124;color:#fff;border:1px solid #555;border-radius:12px;padding:16px;box-shadow:0 6px 24px #0005; }
        strong { display:block;margin-bottom:6px; }
        p { margin:0 0 12px;overflow-wrap:anywhere; }
        nav { display:flex;gap:8px;flex-wrap:wrap; }
        button { font:inherit;cursor:pointer;border:1px solid #888;border-radius:6px;padding:7px 10px;background:#333;color:#fff; }
        button:first-child { background:#6750a4;border-color:#a58bdf; }
        button:focus-visible { outline:2px solid #bca7ff;outline-offset:2px; }
      `;
      downloadList = document.createElement("section");
      downloadList.setAttribute("aria-label", "Completed downloads");
      shadow.append(style, downloadList);
      document.documentElement.append(downloadPanel);
      if (typeof downloadPanel.showPopover === "function") downloadPanel.showPopover();
      else downloadPanel.removeAttribute("popover");
    }

    const item = document.createElement("article");
    item.setAttribute("role", "status");
    const title = document.createElement("strong");
    title.textContent = "Download complete";
    const name = document.createElement("p");
    name.textContent = filename;
    const actions = document.createElement("nav");
    for (const [label, reveal] of [["Open File", false], ["Show in Folder", true]] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.onclick = async () => {
        try {
          if (!await rpc.request.openDownload({ id, reveal })) throw new Error("No application could open this file.");
          item.remove();
          if (!downloadList.childElementCount) downloadPanel?.remove();
        } catch (error) {
          title.textContent = "Could not open download";
          name.textContent = String(error);
        }
      };
      actions.append(button);
    }
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.textContent = "Dismiss";
    dismiss.onclick = () => {
      item.remove();
      if (!downloadList.childElementCount) downloadPanel?.remove();
    };
    actions.append(dismiss);
    item.append(title, name, actions);
    downloadList.prepend(item);
    while (downloadList.childElementCount > 3) downloadList.lastElementChild?.remove();
  }
  Object.defineProperty(window, "multiDesktop", {
    value: {
      notify: (message: { title: string; body: string }) =>
        rpc.request.showNotification(message),
    },
  });
}
