// src/utils/dbClient.js
// Clean renderer-side wrapper for all database IPC calls.
// Keeps ipcRenderer.invoke calls in one place.

const { ipcRenderer } = window.require('electron');

export const dbClient = {
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

  // ── Migration ────────────────────────────────────────────────────────────
  checkMigrationPending: ()                 => ipcRenderer.invoke('db:check-migration-pending'),
  completeMigration:     (customTests)      => ipcRenderer.invoke('db:complete-localStorage-migration', customTests),
};
