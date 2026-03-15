// src/utils/dbClient.js
// Clean renderer-side wrapper for all database IPC calls.
// Keeps ipcRenderer.invoke calls in one place.

const { ipcRenderer } = window.require('electron');

export const dbClient = {
  // ── Patient ──────────────────────────────────────────────────────────────
  savePatient:       (data)                 => ipcRenderer.invoke('db:save-patient', data),
  getPatientByMrNo:  (mrNo)                 => ipcRenderer.invoke('db:get-patient-by-mrno', mrNo),
  searchPatients:    (query)                => ipcRenderer.invoke('db:search-patients', query),
  getAllPatients:     (limit, offset)        => ipcRenderer.invoke('db:get-all-patients', { limit, offset }),
  getNextMrNo:       ()                     => ipcRenderer.invoke('db:get-next-mrno'),

  // ── Panels ───────────────────────────────────────────────────────────────
  savePatientPanels: (patientId, panels)    => ipcRenderer.invoke('db:save-patient-panels', { patientId, panels }),

  // ── Transactions ─────────────────────────────────────────────────────────
  saveTransaction:   (data)                 => ipcRenderer.invoke('db:save-transaction', data),
  getTransaction:    (patientId)            => ipcRenderer.invoke('db:get-transaction', patientId),

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
