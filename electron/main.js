/* global process */
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const isDev = process.argv.includes("--dev");

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── Native PDF Generation IPC Handler ───────────────────────────────────────
ipcMain.handle("print-to-pdf", async (event, { filename, pageSize, margins }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  try {
    const defaultPath = path.join(app.getPath("documents"), filename);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "Save PDF",
      defaultPath: defaultPath,
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
    });

    if (canceled || !filePath) return { success: false };

    // Trigger Native Chromium PDF generation
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true, // Crucial for 100% matching Print Layout @page CSS
    });

    fs.writeFileSync(filePath, pdfData);
    return { success: true, filePath };
  } catch (error) {
    console.error("Native PDF Error:", error);
    return { success: false, error: error.message };
  }
});
