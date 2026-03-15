/* global process */
// electron/database.js  — all SQLite logic for Bukhari Lab
// Uses createRequire to import the CJS better-sqlite3 from an ESM module context.

import { createRequire } from 'module';
import { app } from 'electron';
import path from 'path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

let db = null;

// ─── Open / Initialize ───────────────────────────────────────────────────────

export function initialize() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'bukhari_lab.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  createTables();
  seedMeta();
  checkMigrationOnInit();

  console.log('[DB] Initialized at:', dbPath);
}

// ─── Table Creation ───────────────────────────────────────────────────────────

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS patients (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      mrNo                TEXT,
      trId                TEXT,
      trNo                TEXT,
      name                TEXT,
      fatherHusbandName   TEXT,
      age                 TEXT,
      gender              TEXT,
      contactNo           TEXT,
      address             TEXT,
      consultant          TEXT,
      sampleLocation      TEXT,
      registrationDate    TEXT,
      createdAt           TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS patient_panels (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      patientId   INTEGER NOT NULL,
      panelId     TEXT    NOT NULL,
      panelName   TEXT,
      price       REAL    DEFAULT 0,
      createdAt   TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (patientId) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      patientId       INTEGER NOT NULL,
      totalAmount     REAL    DEFAULT 0,
      discountType    TEXT    DEFAULT 'none',
      discountValue   REAL    DEFAULT 0,
      discountedTotal REAL    DEFAULT 0,
      amountPaid      REAL    DEFAULT 0,
      balanceDue      REAL    DEFAULT 0,
      paymentMethod   TEXT    DEFAULT 'cash',
      paymentStatus   TEXT    DEFAULT 'unpaid',
      createdAt       TEXT    DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (patientId) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS test_prices (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      panelId     TEXT UNIQUE NOT NULL,
      panelName   TEXT,
      defaultPrice REAL DEFAULT 0,
      updatedAt   TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL,
      category    TEXT,
      description TEXT,
      amount      REAL DEFAULT 0,
      createdAt   TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
}

// ─── Meta / Version ───────────────────────────────────────────────────────────

function seedMeta() {
  db.prepare(`INSERT OR IGNORE INTO app_meta (key, value) VALUES ('db_version', '1')`).run();
}

function checkMigrationOnInit() {
  const row = db.prepare(`SELECT value FROM app_meta WHERE key = 'localStorage_migrated'`).get();
  if (!row) {
    // First ever launch — mark migration as pending so the renderer can handle it
    db.prepare(`INSERT OR IGNORE INTO app_meta (key, value) VALUES ('localStorage_migration_pending', 'true')`).run();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wrap(fn) {
  try {
    const data = fn();
    return { success: true, data };
  } catch (err) {
    console.error('[DB Error]', err.message);
    return { success: false, error: err.message };
  }
}

// ─── PATIENT FUNCTIONS ────────────────────────────────────────────────────────

export function savePatient(patientData) {
  return wrap(() => {
    const stmt = db.prepare(`
      INSERT INTO patients
        (mrNo, trId, trNo, name, fatherHusbandName, age, gender,
         contactNo, address, consultant, sampleLocation, registrationDate)
      VALUES
        (@mrNo, @trId, @trNo, @name, @fatherHusbandName, @age, @gender,
         @contactNo, @address, @consultant, @sampleLocation, @registrationDate)
    `);
    const result = stmt.run(patientData);
    return result.lastInsertRowid;
  });
}

export function getPatientByMrNo(mrNo) {
  return wrap(() => {
    return db.prepare(`SELECT * FROM patients WHERE mrNo = ? ORDER BY createdAt DESC LIMIT 1`).get(mrNo);
  });
}

export function searchPatients(query) {
  return wrap(() => {
    const like = `%${query}%`;
    return db.prepare(`
      SELECT * FROM patients
      WHERE name LIKE ? OR mrNo LIKE ? OR contactNo LIKE ?
      ORDER BY createdAt DESC
      LIMIT 50
    `).all(like, like, like);
  });
}

export function getAllPatients(limit = 50, offset = 0) {
  return wrap(() => {
    return db.prepare(`SELECT * FROM patients ORDER BY createdAt DESC LIMIT ? OFFSET ?`).all(limit, offset);
  });
}

export function getNextMrNo() {
  return wrap(() => {
    const row = db.prepare(`
      SELECT MAX(CAST(mrNo AS INTEGER)) AS maxMr FROM patients WHERE mrNo GLOB '[0-9]*'
    `).get();
    const max = row && row.maxMr != null ? row.maxMr : 1000;
    return String(max + 1);
  });
}

// ─── PANEL FUNCTIONS ──────────────────────────────────────────────────────────

export function savePatientPanels(patientId, panelsArray) {
  return wrap(() => {
    const insert = db.prepare(`
      INSERT INTO patient_panels (patientId, panelId, panelName, price)
      VALUES (@patientId, @panelId, @panelName, @price)
    `);
    const insertMany = db.transaction((panels) => {
      for (const panel of panels) {
        insert.run({ patientId, panelId: panel.panelId, panelName: panel.panelName, price: panel.price ?? 0 });
      }
    });
    insertMany(panelsArray);
    return true;
  });
}

// ─── TRANSACTION FUNCTIONS ────────────────────────────────────────────────────

export function saveTransaction(transactionData) {
  return wrap(() => {
    const stmt = db.prepare(`
      INSERT INTO transactions
        (patientId, totalAmount, discountType, discountValue, discountedTotal,
         amountPaid, balanceDue, paymentMethod, paymentStatus)
      VALUES
        (@patientId, @totalAmount, @discountType, @discountValue, @discountedTotal,
         @amountPaid, @balanceDue, @paymentMethod, @paymentStatus)
    `);
    const result = stmt.run(transactionData);
    return result.lastInsertRowid;
  });
}

export function getTransactionByPatientId(patientId) {
  return wrap(() => {
    return db.prepare(`
      SELECT * FROM transactions WHERE patientId = ? ORDER BY createdAt DESC LIMIT 1
    `).get(patientId);
  });
}

// ─── TEST PRICE FUNCTIONS ─────────────────────────────────────────────────────

export function setTestPrice(panelId, panelName, price) {
  return wrap(() => {
    db.prepare(`
      INSERT OR REPLACE INTO test_prices (panelId, panelName, defaultPrice, updatedAt)
      VALUES (?, ?, ?, datetime('now','localtime'))
    `).run(panelId, panelName, price);
    return true;
  });
}

export function getTestPrice(panelId) {
  return wrap(() => {
    const row = db.prepare(`SELECT defaultPrice FROM test_prices WHERE panelId = ?`).get(panelId);
    return row ? row.defaultPrice : null;
  });
}

export function getAllTestPrices() {
  return wrap(() => {
    return db.prepare(`SELECT * FROM test_prices`).all();
  });
}

// ─── EXPENSE FUNCTIONS ────────────────────────────────────────────────────────

export function saveExpense(date, category, description, amount) {
  return wrap(() => {
    const result = db.prepare(`
      INSERT INTO expenses (date, category, description, amount)
      VALUES (?, ?, ?, ?)
    `).run(date, category, description, amount);
    return result.lastInsertRowid;
  });
}

export function getExpensesByDate(date) {
  return wrap(() => {
    return db.prepare(`SELECT * FROM expenses WHERE date = ? ORDER BY createdAt DESC`).all(date);
  });
}

export function getDailySummary(date) {
  return wrap(() => {
    const salesRow = db.prepare(`
      SELECT COALESCE(SUM(amountPaid), 0) AS totalSales
      FROM transactions
      WHERE DATE(createdAt) = ?
    `).get(date);

    const expRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS totalExpenses
      FROM expenses
      WHERE date = ?
    `).get(date);

    const totalSales    = salesRow.totalSales;
    const totalExpenses = expRow.totalExpenses;
    return {
      totalSales,
      totalExpenses,
      totalInHandCash: totalSales - totalExpenses,
    };
  });
}

export function getMonthlySummary(year, month) {
  return wrap(() => {
    // Pad month to 2 digits
    const m = String(month).padStart(2, '0');
    const prefix = `${year}-${m}`;

    const rows = db.prepare(`
      SELECT
        DATE(t.createdAt) AS date,
        COALESCE(SUM(t.amountPaid), 0) AS totalSales
      FROM transactions t
      WHERE strftime('%Y-%m', t.createdAt) = ?
      GROUP BY DATE(t.createdAt)
    `).all(`${year}-${m}`);

    const expRows = db.prepare(`
      SELECT date, COALESCE(SUM(amount), 0) AS totalExpenses
      FROM expenses
      WHERE strftime('%Y-%m', date) = ?
      GROUP BY date
    `).all(`${year}-${m}`);

    // Merge by date
    const expMap = {};
    for (const r of expRows) expMap[r.date] = r.totalExpenses;

    const days = rows.map((r) => ({
      date: r.date,
      totalSales: r.totalSales,
      totalExpenses: expMap[r.date] ?? 0,
    }));

    const monthTotalSales    = days.reduce((s, d) => s + d.totalSales, 0);
    const monthTotalExpenses = days.reduce((s, d) => s + d.totalExpenses, 0);

    return { days, monthTotalSales, monthTotalExpenses, prefix };
  });
}

// ─── MIGRATION HELPERS ────────────────────────────────────────────────────────

export function checkMigrationPending() {
  return wrap(() => {
    const row = db.prepare(`SELECT value FROM app_meta WHERE key = 'localStorage_migration_pending'`).get();
    return row && row.value === 'true';
  });
}

export function completeMigration(entries) {
  return wrap(() => {
    const tx = db.transaction((items) => {
      for (const item of items) {
        if (!item.panelId) continue;
        db.prepare(`
          INSERT OR REPLACE INTO test_prices (panelId, panelName, defaultPrice, updatedAt)
          VALUES (?, ?, ?, datetime('now','localtime'))
        `).run(item.panelId, item.panelName ?? '', item.price ?? 0);
      }
    });
    tx(entries || []);
    db.prepare(`INSERT OR REPLACE INTO app_meta (key, value) VALUES ('localStorage_migrated', 'true')`).run();
    db.prepare(`DELETE FROM app_meta WHERE key = 'localStorage_migration_pending'`).run();
    return true;
  });
}
