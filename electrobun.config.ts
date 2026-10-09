import type { ElectrobunConfig } from "electrobun";

export default {
  app: {
    name: "Electrobun URL Launcher",
    identifier: "com.dipit.electrobun",
    version: "1.0.0",
  },
  build: {
    mainProcess: "cottontail",
    cottontail: { entrypoint: "src/bun/index.ts" },
  },
} satisfies ElectrobunConfig;
