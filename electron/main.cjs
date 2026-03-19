const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// Use dynamic import for the ESM database module
let db;
async function loadDB() {
  db = await import("./database.mjs");
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "../src/assets/images/Logo.png"),
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

app.whenReady().then(async () => {
  // Initialize database before the window opens
  await loadDB();
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

// Auth
ipcMain.handle("auth:get-auth-data",          () => db.getAuthData());
ipcMain.handle("auth:set-initial-auth",       (_, args) => db.setInitialAuth(args.password, args.recoveryKey, args.securityQuestion, args.securityAnswer));
ipcMain.handle("auth:verify-password",        (_, password) => db.verifyPassword(password));
ipcMain.handle("auth:verify-recovery-key",    (_, key) => db.verifyRecoveryKey(key));
ipcMain.handle("auth:verify-security-answer", (_, answer) => db.verifySecurityAnswer(answer));
ipcMain.handle("auth:reset-password",         (_, newPassword) => db.resetPassword(newPassword));
ipcMain.handle("auth:update-security-question", (_, args) => db.updateSecurityQuestion(args.question, args.answer));
ipcMain.handle("auth:set-security-enabled",   (_, enabled) => db.setSecurityEnabled(enabled));

// Patient
ipcMain.handle("db:save-patient",         (_, args)                    => db.savePatient(args));
ipcMain.handle("db:get-patient-by-mrno",  (_, mrNo)                    => db.getPatientByMrNo(mrNo));
ipcMain.handle("db:search-patients",      (_, { query, statusFilter }) => db.searchPatients(query, statusFilter));
ipcMain.handle('db:get-all-patients',     (event, args)                => db.getAllPatients(args.limit, args.offset, args.statusFilter));
ipcMain.handle("db:get-next-mrno",        ()                           => db.getNextMrNo());
ipcMain.handle("db:soft-delete-patient",  (_, patientId)               => db.softDeletePatient(patientId));
ipcMain.handle("db:restore-patient",      (_, patientId)               => db.restorePatient(patientId));
ipcMain.handle("db:permanent-delete-patient", (_, patientId)           => db.permanentlyDeletePatient(patientId));
ipcMain.handle("db:get-trashed-patients", ()                           => db.getTrashedPatients());
ipcMain.handle("db:restore-all-patients", () => {
  console.log("IPC: db:restore-all-patients called");
  return db.restoreAllPatients();
});
ipcMain.handle("db:empty-patient-trash", () => {
  console.log("IPC: db:empty-patient-trash called");
  return db.emptyPatientTrash();
});

// Panels & Results
ipcMain.handle("db:save-patient-panels",  (_, { patientId, panels })   => db.savePatientPanels(patientId, panels));
ipcMain.handle("db:get-patient-panels",   (_, patientId)               => db.getPatientPanels(patientId));
ipcMain.handle("db:save-test-results",    (_, { patientId, testData }) => db.saveTestResults(patientId, testData));
ipcMain.handle("db:get-test-results",     (_, patientId)               => db.getTestResults(patientId));
ipcMain.handle("db:ping",                 ()                           => {
  console.log("IPC: db:ping called");
  return "pong";
});

// Transactions
ipcMain.handle("db:save-transaction",     (_, args)                    => db.saveTransaction(args));
ipcMain.handle("db:get-transaction",      (_, patientId)               => db.getTransactionByPatientId(patientId));
ipcMain.handle("db:update-transaction",   (_, { id, updates })         => db.updateTransaction(id, updates));
ipcMain.handle('db:get-total-stats', () => {
  return db.getTotalStats();
});

// Test Prices
ipcMain.handle("db:set-test-price",       (_, { panelId, panelName, price }) => db.setTestPrice(panelId, panelName, price));
ipcMain.handle("db:get-test-price",       (_, panelId)                 => db.getTestPrice(panelId));
ipcMain.handle("db:get-all-test-prices",  ()                           => db.getAllTestPrices());

// Expenses
ipcMain.handle("db:save-expense",         (_, { date, category, description, amount }) => db.saveExpense(date, category, description, amount));
ipcMain.handle("db:get-expenses-by-date", (_, date)                    => db.getExpensesByDate(date));
ipcMain.handle("db:get-daily-summary",    (_, date)                    => db.getDailySummary(date));
ipcMain.handle("db:get-monthly-summary",  (_, { year, month })         => db.getMonthlySummary(year, month));

// Expenses — exp: namespace (Expense Manager Dashboard)
ipcMain.handle("exp:get-categories",      ()                           => db.getExpenseCategories());
ipcMain.handle("exp:get-daily-report",    (_, date)                    => db.getDailyReport(date));
ipcMain.handle("exp:get-monthly-report",  (_, { year, month })         => db.getMonthlyReport(year, month));
ipcMain.handle("exp:get-expenses-range",  (_, { startDate, endDate })  => db.getExpensesByDateRange(startDate, endDate));
ipcMain.handle("exp:save-expense",        (_, { date, category, description, amount }) => db.saveExpense(date, category, description, amount));
ipcMain.handle("exp:delete-expense",      (_, id)                      => db.deleteExpense(id));
ipcMain.handle("exp:export-text",         async (_, { content, defaultFilename }) => {
  try {
    const result = await dialog.showSaveDialog({
      defaultPath: path.join(app.getPath('downloads'), defaultFilename),
      filters: [{ name: 'Text Files', extensions: ['txt'] }],
    });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content, 'utf8');
      return { success: true };
    }
    return { success: false, canceled: true };
  } catch (err) {
    console.error('exp:export-text error:', err);
    return { success: false, error: err.message };
  }
});

// Migration
ipcMain.handle("db:check-migration-pending",          ()               => db.checkMigrationPending());
ipcMain.handle("db:complete-localStorage-migration",  (_, entries)     => db.completeMigration(entries));
