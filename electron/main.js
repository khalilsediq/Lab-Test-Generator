/* global process */
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import * as db from "./database.js";

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
  // Initialize database before the window opens
  db.initialize();

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

// ── Database IPC Handlers ────────────────────────────────────────────────────

// Patient
ipcMain.handle("db:save-patient",         (_, args)                    => db.savePatient(args));
ipcMain.handle("db:get-patient-by-mrno",  (_, mrNo)                    => db.getPatientByMrNo(mrNo));
ipcMain.handle("db:search-patients",      (_, query)                   => db.searchPatients(query));
ipcMain.handle("db:get-all-patients",     (_, { limit, offset } = {})  => db.getAllPatients(limit, offset));
ipcMain.handle("db:get-next-mrno",        ()                           => db.getNextMrNo());

// Panels
ipcMain.handle("db:save-patient-panels",  (_, { patientId, panels })   => db.savePatientPanels(patientId, panels));

// Transactions
ipcMain.handle("db:save-transaction",     (_, args)                    => db.saveTransaction(args));
ipcMain.handle("db:get-transaction",      (_, patientId)               => db.getTransactionByPatientId(patientId));

// Test Prices
ipcMain.handle("db:set-test-price",       (_, { panelId, panelName, price }) => db.setTestPrice(panelId, panelName, price));
ipcMain.handle("db:get-test-price",       (_, panelId)                 => db.getTestPrice(panelId));
ipcMain.handle("db:get-all-test-prices",  ()                           => db.getAllTestPrices());

// Expenses
ipcMain.handle("db:save-expense",         (_, { date, category, description, amount }) => db.saveExpense(date, category, description, amount));
ipcMain.handle("db:get-expenses-by-date", (_, date)                    => db.getExpensesByDate(date));
ipcMain.handle("db:get-daily-summary",    (_, date)                    => db.getDailySummary(date));
ipcMain.handle("db:get-monthly-summary",  (_, { year, month })         => db.getMonthlySummary(year, month));

// Migration
ipcMain.handle("db:check-migration-pending",          ()               => db.checkMigrationPending());
ipcMain.handle("db:complete-localStorage-migration",  (_, entries)     => db.completeMigration(entries));
