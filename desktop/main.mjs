import { app, BrowserWindow, ipcMain, screen, shell } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homeWindowState, meetingWindowBounds } from "./window-state.mjs";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const developmentUrl = String(process.env.VITE_DEV_SERVER_URL || "").trim();
const productionUrl = String(process.env.VOICE_PARTITION_APP_URL || "https://unithon.ssu-on.com").trim();
const applicationUrl = developmentUrl || productionUrl;

let mainWindow = null;
let savedHomeBounds = null;

function setMeetingMode(active) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (active) {
    savedHomeBounds ||= mainWindow.getBounds();
    const display = screen.getDisplayMatching(mainWindow.getBounds());
    const bounds = meetingWindowBounds(display.workArea);
    mainWindow.setMinimumSize(380, 640);
    mainWindow.setMaximumSize(display.workArea.width, display.workArea.height);
    mainWindow.setBounds(bounds, true);
    mainWindow.setAlwaysOnTop(true, "floating");
    if (process.platform === "darwin") mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    return;
  }

  mainWindow.setAlwaysOnTop(false);
  if (process.platform === "darwin") mainWindow.setVisibleOnAllWorkspaces(false);
  const display = screen.getDisplayMatching(savedHomeBounds || mainWindow.getBounds());
  mainWindow.setMaximumSize(display.workArea.width, display.workArea.height);
  mainWindow.setMinimumSize(homeWindowState.minWidth, homeWindowState.minHeight);
  if (savedHomeBounds) mainWindow.setBounds(savedHomeBounds, true);
  else mainWindow.setSize(homeWindowState.width, homeWindowState.height, true);
  savedHomeBounds = null;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: homeWindowState.width,
    height: homeWindowState.height,
    minWidth: homeWindowState.minWidth,
    minHeight: homeWindowState.minHeight,
    show: false,
    webPreferences: {
      preload: join(currentDirectory, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => undefined);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(applicationUrl)) return;
    event.preventDefault();
    shell.openExternal(url).catch(() => undefined);
  });
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.loadURL(applicationUrl);
}

ipcMain.handle("voice-partition:set-meeting-mode", (_event, active) => {
  setMeetingMode(Boolean(active));
  return { active: Boolean(active) };
});

app.whenReady().then(() => {
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
