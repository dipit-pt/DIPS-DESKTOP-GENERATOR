import { expect, test } from "bun:test";
import { createUpdateController } from "../src/updater";

function fixture(options: { ready?: boolean; error?: string; downloadError?: string; later?: boolean } = {}) {
  const calls: string[] = [];
  const messages: string[] = [];
  let state = { version: "1.2.44", updateAvailable: true, updateReady: false, error: "" };
  const backend = {
    getLocalInfo: async () => ({ baseUrl: "https://updates.example.com" }),
    checkForUpdate: async () => {
      calls.push("check");
      state = { ...state, updateReady: !!options.ready, error: options.error ?? "" };
      return state;
    },
    updateInfo: () => state,
    downloadUpdate: async () => {
      calls.push("download");
      state = { ...state, updateReady: !options.downloadError, error: options.downloadError ?? "" };
    },
    applyUpdate: async () => { calls.push("apply"); },
  };
  const controller = createUpdateController(backend, async (message) => {
    messages.push(message.message);
    return { response: options.later ? 1 : 0 };
  }, "Test App", "1.2.41");
  return { backend, controller, calls, messages };
}

test("relaunch restores downloaded state before applying the prepared update", async () => {
  const f = fixture({ ready: true });
  expect(f.backend.updateInfo().updateReady).toBe(false);
  await f.controller.startup();
  expect(f.calls).toEqual(["check", "apply"]);
});

test("startup downloads a new update without interrupting the session", async () => {
  const f = fixture();
  await f.controller.startup();
  expect(f.calls).toEqual(["check", "download"]);
  expect(f.messages).toEqual([]);
});

test("manual restart installs a freshly downloaded update", async () => {
  const f = fixture();
  await f.controller.check();
  expect(f.calls).toEqual(["check", "download", "apply"]);
});

test("Later leaves a prepared update for next launch", async () => {
  const f = fixture({ ready: true, later: true });
  await f.controller.check();
  expect(f.calls).toEqual(["check"]);
  expect(f.messages.at(-1)).toContain("Restart");
});

test("HTTP errors are displayed instead of claiming the installed app is current", async () => {
  const f = fixture({ error: "Failed to check for updates: HTTP 404" });
  await f.controller.check();
  expect(f.calls).toEqual(["check"]);
  expect(f.messages).toEqual(["Unable to check the update server: Failed to check for updates: HTTP 404"]);
});

test("download failures preserve the actual error", async () => {
  const f = fixture({ downloadError: "Update artifact request failed with HTTP 404" });
  await f.controller.check();
  expect(f.calls).toEqual(["check", "download"]);
  expect(f.messages.at(-1)).toContain("HTTP 404");
});
