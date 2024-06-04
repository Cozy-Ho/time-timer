import { app, BrowserWindow, ipcMain, session } from "electron";
import * as path from "path";
import "regenerator-runtime";
import MenuBuilder from "./menu";
import { Log, resolveHtmlPath, Updater } from "./utils";
// import * as debug from "electron-debug";
import { ipcMainEvents } from "./events";
import * as url from "url";

let mainWindow: BrowserWindow | undefined;

/**
 * 미리 정의 된 이벤트들을 등록합니다.
 */
ipcMainEvents.map(events => {
  console.log("event register");
  ipcMain.on(events.eventName, events.handler);
});

/**
 * 로그인 창 윈도우를 생성합니다.
 * mainWindow를 부모로 가집니다.
 */
ipcMain.on("open-login", (event, args: string) => {
  Log.debug("# open-login args : ", args);
  const authBrowserWindow = new BrowserWindow({
    width: 500,
    height: 800,
    modal: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    parent: mainWindow
  });

  authBrowserWindow.loadURL(args);
  authBrowserWindow.show();

  authBrowserWindow.on("blur", () => {
    authBrowserWindow.close();
    event.reply("login-done", null);
  });

  authBrowserWindow.webContents.on("will-redirect", (_event, _url) => {
    Log.debug("# _url : ", _url);
    const urlObj = url.parse(_url, true);
    if (urlObj.query && urlObj.query.code) {
      event.reply("login-done", urlObj.query.code);
      authBrowserWindow.close();
    }
  });
});

if (process.env.NODE_ENV === "production") {
  import("source-map-support").then(sourceMapSupport => {
    sourceMapSupport.install();
  });
}

// rkdwn: 개발용
const isDevelopment = process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true";

const installExtensions = async () => {
  const installer = await import("electron-devtools-installer");
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions: string[] = ["REACT_DEVELOPER_TOOLS"];

  return installer.default(extensions, forceDownload).catch(e => {
    // console.log("# : import installer error ", e);
  });
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
    // await installElectronDebug();
    // debug.default();
  }

  const RESOURCES_PATH = path.join(__dirname, "./assets");

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 900,
    height: 700,
    icon: getAssetPath("logo.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadURL(resolveHtmlPath("index.html"));

  mainWindow.on("ready-to-show", () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
    // FIXME: Open Dev tools when packaged.
    // mainWindow.webContents.openDevTools();
  });

  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler(handler => {
    // handler.preventDefault();
    // shell.openExternal(handler.url);
    if (handler.disposition === "new-window") {
      return { action: "allow" };
    }
    return { action: "deny" };
  });

  // mainWindow.webContents.on("new-window", (handler, url) => {
  //   handler.preventDefault();
  //   shell.openExternal(url);
  // });
};

/**
 * Add event listeners...
 */

app.on("window-all-closed", () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("ready", () => {
  // clear cache
  session.defaultSession.clearStorageData();
});

app
  .whenReady()
  .then(() => {
    createWindow();

    // Remove this if your app does not use auto updates
    // new Updater();

    app.on("activate", () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(Log.error);
