// src/utils/dbClient.js
// Clean renderer-side wrapper for all database IPC calls.
// Keeps ipcRenderer.invoke calls in one place.

const { ipcRenderer } = window.require('electron');

export const dbClient = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  getAuthData:           () => ipcRenderer.invoke('auth:get-auth-data'),
  setInitialAuth:        (password, recoveryKey, securityQuestion, securityAnswer) => ipcRenderer.invoke('auth:set-initial-auth', { password, recoveryKey, securityQuestion, securityAnswer }),
  verifyPassword:        (password) => ipcRenderer.invoke('auth:verify-password', password),
  verifyRecoveryKey:     (key) => ipcRenderer.invoke('auth:verify-recovery-key', key),
  verifySecurityAnswer:  (answer) => ipcRenderer.invoke('auth:verify-security-answer', answer),
  resetPassword:         (newPassword) => ipcRenderer.invoke('auth:reset-password', newPassword),
  updateSecurityQuestion:(question, answer) => ipcRenderer.invoke('auth:update-security-question', { question, answer }),
  setSecurityEnabled:    (enabled) => ipcRenderer.invoke('auth:set-security-enabled', enabled),

  // ── Patient ──────────────────────────────────────────────────────────────
  savePatient:       (data)                 => ipcRenderer.invoke('db:save-patient', data),
  getPatientByMrNo:  (mrNo)                 => ipcRenderer.invoke('db:get-patient-by-mrno', mrNo),
  searchPatients:    (query, statusFilter)  => ipcRenderer.invoke('db:search-patients', { query, statusFilter }),
  getAllPatients:    (limit, offset, statusFilter) => ipcRenderer.invoke('db:get-all-patients', { limit, offset, statusFilter }),
  getNextMrNo:       ()                     => ipcRenderer.invoke('db:get-next-mrno'),
  softDeletePatient: (patientId)            => ipcRenderer.invoke('db:soft-delete-patient', patientId),
  restorePatient:    (patientId)            => ipcRenderer.invoke('db:restore-patient', patientId),
  permanentlyDeletePatient: (patientId)     => ipcRenderer.invoke('db:permanent-delete-patient', patientId),
  getTrashedPatients:()                     => ipcRenderer.invoke('db:get-trashed-patients'),
  restoreAllPatients:()                     => ipcRenderer.invoke('db:restore-all-patients'),
  emptyPatientTrash: ()                     => ipcRenderer.invoke('db:empty-patient-trash'),

  // ── Panels & Results ─────────────────────────────────────────────────────
  savePatientPanels: (patientId, panels)    => ipcRenderer.invoke('db:save-patient-panels', { patientId, panels }),
  getPatientPanels:  (patientId)            => ipcRenderer.invoke('db:get-patient-panels', patientId),
  saveTestResults:   (patientId, testData)  => ipcRenderer.invoke('db:save-test-results', { patientId, testData }),
  getTestResults:    (patientId)            => ipcRenderer.invoke('db:get-test-results', patientId),
  ping:              ()                     => ipcRenderer.invoke('db:ping'),

  // ── Transactions ─────────────────────────────────────────────────────────
  saveTransaction:   (data)                 => ipcRenderer.invoke('db:save-transaction', data),
  getTransaction:    (patientId)            => ipcRenderer.invoke('db:get-transaction', patientId),
  updateTransaction: (id, updates)          => ipcRenderer.invoke('db:update-transaction', { id, updates }),
  getTotalStats:     ()                     => ipcRenderer.invoke('db:get-total-stats'),

  // ── Test Prices ──────────────────────────────────────────────────────────
  setTestPrice:      (panelId, name, price) => ipcRenderer.invoke('db:set-test-price', { panelId, panelName: name, price }),
  getTestPrice:      (panelId)              => ipcRenderer.invoke('db:get-test-price', panelId),
  getAllTestPrices:   ()                     => ipcRenderer.invoke('db:get-all-test-prices'),

  // ── Expenses ─────────────────────────────────────────────────────────────
  saveExpense:       (date, cat, desc, amt) => ipcRenderer.invoke('db:save-expense', { date, category: cat, description: desc, amount: amt }),
  getExpensesByDate: (date)                 => ipcRenderer.invoke('db:get-expenses-by-date', date),
  getDailySummary:   (date)                 => ipcRenderer.invoke('db:get-daily-summary', date),
  getMonthlySummary: (year, month)          => ipcRenderer.invoke('db:get-monthly-summary', { year, month }),

  // ── Expense Manager (exp: namespace) ──────────────────────────────
  getExpenseCategories: ()                            => ipcRenderer.invoke('exp:get-categories'),
  getDailyReport:    (date)                           => ipcRenderer.invoke('exp:get-daily-report', date),
  getMonthlyReport:  (year, month)                    => ipcRenderer.invoke('exp:get-monthly-report', { year, month }),
  getExpensesByRange:(startDate, endDate)              => ipcRenderer.invoke('exp:get-expenses-range', { startDate, endDate }),
  saveExpenseEntry:  (date, category, description, amount) => ipcRenderer.invoke('exp:save-expense', { date, category, description, amount }),
  deleteExpense:     (id)                             => ipcRenderer.invoke('exp:delete-expense', id),
  exportText:        (content, defaultFilename)       => ipcRenderer.invoke('exp:export-text', { content, defaultFilename }),

  // ── Migration ────────────────────────────────────────────────────────────
  checkMigrationPending: ()                 => ipcRenderer.invoke('db:check-migration-pending'),
  completeMigration:     (customTests)      => ipcRenderer.invoke('db:complete-localStorage-migration', customTests),

  // ── Auto Updater ─────────────────────────────────────────────────────────
  getAppVersion:   () => ipcRenderer.invoke('app:version'),
  updaterCheck:    () => ipcRenderer.invoke('updater:check'),
  updaterDownload: () => ipcRenderer.invoke('updater:download'),
  updaterCancel:   () => ipcRenderer.invoke('updater:cancel'),
  updaterInstall:  () => ipcRenderer.invoke('updater:install'),
  onUpdaterEvent:  (channel, callback) => {
    const validChannels = ['updater:checking', 'updater:update-available', 'updater:update-not-available', 'updater:error', 'updater:download-progress', 'updater:update-downloaded'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  offUpdaterEvent: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
};
