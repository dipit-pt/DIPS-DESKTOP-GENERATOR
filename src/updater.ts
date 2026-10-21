type UpdateInfo = {
  version: string;
  updateAvailable: boolean;
  updateReady: boolean;
  error: string;
};

type UpdateBackend = {
  getLocalInfo(): Promise<{ baseUrl: string }>;
  checkForUpdate(): Promise<UpdateInfo>;
  downloadUpdate(): Promise<void>;
  applyUpdate(): Promise<void>;
  updateInfo(): UpdateInfo;
};

type ShowMessage = (options: {
  type: "info" | "error";
  title: string;
  message: string;
  buttons: string[];
  cancelId?: number;
}) => Promise<{ response: number }>;

export function createUpdateController(
  updater: UpdateBackend,
  showMessage: ShowMessage,
  title: string,
  version: string,
) {
  let checking = false;

  async function check(manual = false, startup = false): Promise<void> {
    const explain = async (message: string, type: "info" | "error" = "info") => {
      if (manual) await showMessage({ type, title, message, buttons: ["OK"] });
      else console.log("[updater]", message);
    };
    if (checking) {
      await explain("An update check is already running.");
      return;
    }
    checking = true;
    try {
      const local = await updater.getLocalInfo();
      if (!local.baseUrl) {
        await explain("Updates are not configured in this installation.", "error");
        return;
      }
      // checkForUpdate restores prepared state from disk. updateInfo alone is
      // empty on launch, even when the previous session downloaded an update.
      const result = await updater.checkForUpdate();
      if (result.error) {
        await explain("Unable to check the update server: " + result.error, "error");
        return;
      }
      if (!result.updateAvailable) {
        await explain("You are up to date (version " + version + ").");
        return;
      }
      if (startup && result.updateReady) {
        await updater.applyUpdate();
        if (updater.updateInfo().error) {
          await explain(updater.updateInfo().error, "error");
        }
        return;
      }
      if (!result.updateReady) {
        if (manual) await explain("Update " + result.version + " found. Downloading it now.");
        await updater.downloadUpdate();
      }
      const prepared = updater.updateInfo();
      if (prepared.error || !prepared.updateReady) {
        await explain(prepared.error || "Update download did not complete. Try again.", "error");
        return;
      }
      if (manual) {
        const choice = await showMessage({
          type: "info", title,
          message: "Update " + prepared.version + " is ready. Restart the app to install it?",
          buttons: ["Restart Now", "Later"], cancelId: 1,
        });
        if (choice.response === 0) {
          await updater.applyUpdate();
          if (updater.updateInfo().error) await explain(updater.updateInfo().error, "error");
        }
      } else {
        await explain("Update downloaded. Quit and reopen the app to install it.");
      }
    } catch (error) {
      console.error("Update check failed:", error);
      await explain("Update check failed: " + String(error), "error");
    } finally {
      checking = false;
    }
  }

  return { check: () => check(true), startup: () => check(false, true) };
}
