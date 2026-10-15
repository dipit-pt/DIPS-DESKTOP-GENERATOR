import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: process.env.APP_NAME ?? "Desktop App",
    identifier: process.env.APP_ID ?? "com.dipit.desktop",
    version: process.env.APP_VERSION ?? "1.0.0",
  },
  build: {
    mainProcess: "bun",
    bun: { entrypoint: "src/bun/index.ts" },
    views: { preload: { entrypoint: "src/preload/index.ts" } },
  },
} satisfies ElectrobunConfig;
