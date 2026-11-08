const { app, BrowserWindow, session, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

// Auto-grant webcam & microphone access at the Chromium engine level (Zero permission popups)
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("enable-usermedia-screen-capturing");

const STUDIO_PORT = 3100;
const STUDIO_URL = `http://127.0.0.1:${STUDIO_PORT}/`;
const DEFAULT_UPDATE_FEED_URL = "https://xlexhibitproduction.com/studio-updates/";
let mainWindow = null;
let updatePollInterval = null;

function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(`${STUDIO_URL}state`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(900, () => {
      req.destroy();
      resolve(false);
    });
  });
}

let embeddedServerMod = null;

async function ensureBackendServer() {
  try {
    process.env.XL_STUDIO_DATA_DIR = app.getPath("userData");
  } catch (e) {}

  const alreadyUp = await checkServerReady();
  if (alreadyUp) return;

  try {
    embeddedServerMod = require(path.join(__dirname, "server.js"));
  } catch (e) {
    console.error("Failed to start embedded studio server:", e);
  }

  for (let i = 0; i < 30; i++) {
    if (await checkServerReady()) return;
    await new Promise((r) => setTimeout(r, 200));
  }
}

function configurePermissions() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler(() => {
    return true;
  });
}

function getConfiguredUpdateFeedUrl() {
  if (process.env.XL_UPDATE_URL) return process.env.XL_UPDATE_URL;
  try {
    const cfgPath = path.join(app.getPath("userData"), "workspace", "update_config.json");
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      if (parsed && typeof parsed.feedUrl === "string" && parsed.feedUrl.startsWith("http")) {
        return parsed.feedUrl;
      }
    }
  } catch (e) {}
  return DEFAULT_UPDATE_FEED_URL;
}

function broadcastUpdateState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const payload = JSON.stringify(global.xlUpdaterState || {});
    mainWindow.webContents
      .executeJavaScript(`if (typeof window.onStudioUpdateEvent === "function") { window.onStudioUpdateEvent(${payload}); }`)
      .catch(() => {});
  } catch (e) {}
}

function setupAutoUpdater() {
  const currentVersion = app.getVersion ? app.getVersion() : "1.0.0";
  const feedUrl = getConfiguredUpdateFeedUrl();

  global.xlUpdaterState = {
    status: "idle",
    currentVersion,
    latestVersion: currentVersion,
    percent: 0,
    transferredBytes: 0,
    totalBytes: 0,
    bytesPerSecond: 0,
    releaseDate: null,
    feedUrl,
    lastCheckedAt: null,
    message: `v${currentVersion}`
  };

  let autoUpdater = null;
  try {
    autoUpdater = require("electron-updater").autoUpdater;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowDowngrade = false;
    try {
      autoUpdater.setFeedURL({ provider: "generic", url: feedUrl });
    } catch (e) {}

    autoUpdater.on("checking-for-update", () => {
      Object.assign(global.xlUpdaterState, {
        status: "checking",
        lastCheckedAt: new Date().toISOString(),
        message: "Checking for updates..."
      });
      broadcastUpdateState();
    });

    autoUpdater.on("update-available", (info) => {
      const nextVer = (info && info.version) || "new";
      Object.assign(global.xlUpdaterState, {
        status: "available",
        latestVersion: nextVer,
        releaseDate: (info && info.releaseDate) || null,
        percent: 0,
        lastCheckedAt: new Date().toISOString(),
        message: `Downloading v${nextVer}...`
      });
      broadcastUpdateState();
    });

    autoUpdater.on("update-not-available", (info) => {
      Object.assign(global.xlUpdaterState, {
        status: "up-to-date",
        latestVersion: (info && info.version) || currentVersion,
        percent: 0,
        lastCheckedAt: new Date().toISOString(),
        message: `v${currentVersion} Up to Date`
      });
      broadcastUpdateState();
    });

    autoUpdater.on("download-progress", (prog) => {
      const pct = Math.max(0, Math.min(100, Math.round((prog && prog.percent) || 0)));
      Object.assign(global.xlUpdaterState, {
        status: "downloading",
        percent: pct,
        transferredBytes: (prog && prog.transferred) || 0,
        totalBytes: (prog && prog.total) || 0,
        bytesPerSecond: (prog && prog.bytesPerSecond) || 0,
        message: `Downloading v${global.xlUpdaterState.latestVersion} (${pct}%)`
      });
      broadcastUpdateState();
    });

    autoUpdater.on("update-downloaded", (info) => {
      const nextVer = (info && info.version) || global.xlUpdaterState.latestVersion;
      Object.assign(global.xlUpdaterState, {
        status: "downloaded",
        latestVersion: nextVer,
        percent: 100,
        lastCheckedAt: new Date().toISOString(),
        message: `Install Update v${nextVer}`
      });
      broadcastUpdateState();
    });

    autoUpdater.on("error", (err) => {
      const errMsg = String((err && err.message) || err || "");
      // If the update feed has no newer package published yet or is unreachable, keep status clean
      if (global.xlUpdaterState.status !== "downloaded") {
        Object.assign(global.xlUpdaterState, {
          status: "up-to-date",
          lastCheckedAt: new Date().toISOString(),
          lastError: errMsg,
          message: `v${currentVersion} Up to Date`
        });
      }
      broadcastUpdateState();
    });
  } catch (e) {}

  global.xlUpdaterController = {
    getState: () => global.xlUpdaterState,
    setFeedUrl: (newUrl) => {
      if (!newUrl || typeof newUrl !== "string" || !newUrl.startsWith("http")) return global.xlUpdaterState;
      global.xlUpdaterState.feedUrl = newUrl;
      try {
        const cfgDir = path.join(app.getPath("userData"), "workspace");
        if (!fs.existsSync(cfgDir)) fs.mkdirSync(cfgDir, { recursive: true });
        fs.writeFileSync(path.join(cfgDir, "update_config.json"), JSON.stringify({ feedUrl: newUrl }, null, 2), "utf8");
        if (autoUpdater) autoUpdater.setFeedURL({ provider: "generic", url: newUrl });
      } catch (e) {}
      broadcastUpdateState();
      return global.xlUpdaterState;
    },
    checkForUpdates: async () => {
      if (global.xlUpdaterState.status === "downloading" || global.xlUpdaterState.status === "downloaded") {
        return global.xlUpdaterState;
      }
      Object.assign(global.xlUpdaterState, {
        status: "checking",
        lastCheckedAt: new Date().toISOString(),
        message: "Checking for updates..."
      });
      broadcastUpdateState();

      if (autoUpdater && app.isPackaged) {
        try {
          await autoUpdater.checkForUpdates();
        } catch (e) {
          if (global.xlUpdaterState.status === "checking") {
            Object.assign(global.xlUpdaterState, {
              status: "up-to-date",
              lastCheckedAt: new Date().toISOString(),
              message: `v${currentVersion} Up to Date`
            });
            broadcastUpdateState();
          }
        }
      } else {
        Object.assign(global.xlUpdaterState, {
          status: "up-to-date",
          lastCheckedAt: new Date().toISOString(),
          message: `v${currentVersion} Up to Date`
        });
        broadcastUpdateState();
      }
      return global.xlUpdaterState;
    },
    quitAndInstall: () => {
      if (autoUpdater && global.xlUpdaterState.status === "downloaded") {
        if (embeddedServerMod && typeof embeddedServerMod.shutdownStudioServer === "function") {
          try { embeddedServerMod.shutdownStudioServer(); } catch (e) {}
        }
        setImmediate(() => {
          try {
            autoUpdater.quitAndInstall(false, true);
          } catch (e) {}
        });
        return true;
      }
      return false;
    },
    launchUninstaller: () => {
      try {
        const { spawn } = require("child_process");
        const os = require("os");
        const srcUninst = path.join(__dirname, "assets", "Uninstall XL Creator Studio.exe");
        const tmpUninst = path.join(os.tmpdir(), "Uninstall XL Creator Studio.exe");
        if (fs.existsSync(srcUninst)) {
          fs.copyFileSync(srcUninst, tmpUninst);
          const child = spawn(tmpUninst, [], { detached: true, stdio: "ignore", windowsHide: false });
          child.unref();
          setTimeout(() => {
            if (embeddedServerMod && typeof embeddedServerMod.shutdownStudioServer === "function") {
              try { embeddedServerMod.shutdownStudioServer(); } catch (e) {}
            }
            app.quit();
          }, 250);
          return true;
        }
      } catch (e) {}
      return false;
    }
  };

  // Initial background check 4s after launch + periodic check every 4 hours
  setTimeout(() => {
    if (global.xlUpdaterController) {
      global.xlUpdaterController.checkForUpdates().catch(() => {});
    }
  }, 4000);

  if (updatePollInterval) clearInterval(updatePollInterval);
  updatePollInterval = setInterval(() => {
    if (global.xlUpdaterController) {
      global.xlUpdaterController.checkForUpdates().catch(() => {});
    }
  }, 4 * 60 * 60 * 1000);
}

async function createWindow() {
  await ensureBackendServer();
  configurePermissions();

  mainWindow = new BrowserWindow({
    title: "XL Creator Studio",
    width: 1520,
    height: 940,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: "#07080c",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "assets", "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(STUDIO_URL);

  // Automatically connect camera & studio audio on startup without requiring a click or popup
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents
      .executeJavaScript(
        `if (typeof connectCameraAndMic === "function") { connectCameraAndMic().catch(() => {}); }`
      )
      .catch(() => {});
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  setupAutoUpdater();
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on("before-quit", () => {
    if (updatePollInterval) {
      clearInterval(updatePollInterval);
      updatePollInterval = null;
    }
    if (embeddedServerMod && typeof embeddedServerMod.shutdownStudioServer === "function") {
      try { embeddedServerMod.shutdownStudioServer(); } catch (e) {}
    }
  });

  app.on("window-all-closed", () => {
    if (updatePollInterval) {
      clearInterval(updatePollInterval);
      updatePollInterval = null;
    }
    if (embeddedServerMod && typeof embeddedServerMod.shutdownStudioServer === "function") {
      try { embeddedServerMod.shutdownStudioServer(); } catch (e) {}
    }
    app.quit();
  });
}
