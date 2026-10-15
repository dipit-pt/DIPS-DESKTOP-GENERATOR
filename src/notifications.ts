import type { RPCSchema } from "electrobun/view";

// Only this notification action crosses from the hosted app to the OS.
export type DesktopRPC = {
  bun: RPCSchema<{
    requests: {
      showNotification: {
        params: { title: string; body: string };
        response: null;
      };
    };
    messages: {};
  }>;
  webview: RPCSchema<{ requests: {}; messages: {} }>;
};
