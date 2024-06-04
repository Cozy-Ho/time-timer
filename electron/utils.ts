import { URL } from "url";
import path from "path";
import ProgressBar from "electron-progressbar";
import { autoUpdater } from "electron-updater";
import { app, dialog } from "electron";
import log from "electron-log";
import config from "./config";

const getDataPath = () => {
  const isDev = Boolean(process.env.NODE_ENV === "development");
  if (isDev) {
    return path.join(__dirname, "./");
  }
  return path.join(app.getPath("userData"), "data");
};

let resolveHtmlPath: (htmlFileName: string) => string;

if (process.env.NODE_ENV === "development") {
  const port = config.port;
  resolveHtmlPath = (htmlFileName: string) => {
    const url = new URL(`http://localhost:${port}`);
    // url.pathname = htmlFileName;
    return url.href;
  };
} else {
  resolveHtmlPath = (htmlFileName: string) => {
    return `file://${path.join(__dirname, htmlFileName)}`;
  };
}

/**
 * Logger setting
 */
log.transports.file.resolvePathFn = () => path.join(getDataPath(), "logs/main.log");

log.transports.console.format = "{h}:{i}:{s}:{ms} {text}";
log.transports.file.level = "info";
const Log = log.scope("main");

class Updater {
  private progressBar: ProgressBar = new ProgressBar({});
  constructor() {
    autoUpdater.logger = log;

    autoUpdater.forceDevUpdateConfig = true;

    autoUpdater.on("update-available", () => {
      dialog
        .showMessageBox({
          type: "info",
          title: "update available",
          message: "A new version of Project is available. Do you want to update now?",
          buttons: ["update", "later"]
        })
        .then(result => {
          const buttonIndex = result.response;
          if (buttonIndex === 0) autoUpdater.downloadUpdate();
        });
    });

    autoUpdater.once("download-progress", progressObj => {
      this.progressBar = new ProgressBar({
        text: "Downloading...",
        detail: "Downloading..."
      });

      this.progressBar
        .on("completed", () => {
          Log.info(`auto-update completed...`);
          this.progressBar.detail = "Task completed. Exiting...";
        })
        .on("aborted", () => {
          Log.info(`auto-update aborted...`);
        });
    });

    autoUpdater.on("update-downloaded", () => {
      this.progressBar.setCompleted();
      dialog
        .showMessageBox({
          type: "info",
          title: "Update ready",
          message: "Install & restart now?",
          buttons: ["Restart", "Later"]
        })
        .then(result => {
          const buttonIndex = result.response;

          if (buttonIndex === 0) autoUpdater.quitAndInstall(false, true);
        });
    });

    autoUpdater.on("error", err => {
      log.error("auto-updater error! >>>", err);
    });

    autoUpdater.checkForUpdatesAndNotify();
  }
}

export { Updater, Log, resolveHtmlPath, getDataPath };
