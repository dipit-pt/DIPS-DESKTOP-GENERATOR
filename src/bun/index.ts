import { BrowserWindow } from "electrobun/main";
import { APP_TITLE, APP_URL } from "../settings";

const parsed = new URL(APP_URL);
if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
  throw new Error("APP_URL must be an http(s) URL");
}

new BrowserWindow({
  title: APP_TITLE,
  url: parsed.toString(),
  frame: { width: 1280, height: 850, x: 120, y: 80 },
});
