import { Electroview } from "electrobun/view";
import type { DesktopRPC } from "../notifications";
import { APP_URL } from "../settings";

// Expose one narrow capability, only to the configured app origin.
if (window.top === window && location.origin === new URL(APP_URL).origin) {
  const rpc = Electroview.defineRPC<DesktopRPC>({
    maxRequestTime: 10000,
    handlers: { requests: {}, messages: {} },
  });
  new Electroview({ rpc });
  Object.defineProperty(window, "multiDesktop", {
    value: {
      notify: (message: { title: string; body: string }) =>
        rpc.request.showNotification(message),
    },
  });
}
