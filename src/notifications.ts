import type { RPCSchema } from "electrobun/view";

// Download actions use native-issued IDs, never file paths from the website.
export type DesktopRPC = {
  bun: RPCSchema<{
    requests: {
      showNotification: {
        params: { title: string; body: string };
        response: null;
      };
      openDownload: {
        params: { id: string; reveal?: boolean };
        response: boolean;
      };
    };
    messages: {};
  }>;
  webview: RPCSchema<{
    requests: {};
    messages: { downloadCompleted: { id: string; filename: string } };
  }>;
};
