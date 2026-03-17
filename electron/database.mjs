/* global process */
// electron/database.js  — all SQLite logic for Bukhari Lab
// Uses createRequire to import the CJS better-sqlite3 from an ESM module context.

import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

let db = null;

// ─── Open / Initialize ───────────────────────────────────────────────────────

export function initialize() {
  const { app } = require('electron');
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'bukhari_lab.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  createTables();
  seedMeta();
  runMigrations();
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

    CREATE TABLE IF NOT EXISTS test_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patientId INTEGER NOT NULL,
      parameterId TEXT NOT NULL,
      value TEXT,
      createdAt TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (patientId) REFERENCES patients(id)
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

function runMigrations() {
  let version = parseInt(db.prepare(`SELECT value FROM app_meta WHERE key='db_version'`).get()?.value || '1');

  if (version < 2) {
    try {
      db.prepare(`ALTER TABLE transactions ADD COLUMN updatedAt TEXT;`).run();
    } catch (err) {
      if (!err.message.includes('duplicate column name')) throw err;
    }
    db.prepare(`UPDATE app_meta SET value = '2' WHERE key = 'db_version'`).run();
    console.log('[DB] Migrated to db_version 2 (added updatedAt to transactions)');
    version = 2;
  }

  if (version < 3) {
    try {
      db.prepare(`ALTER TABLE patients ADD COLUMN deletedAt TEXT DEFAULT NULL`).run();
    } catch (err) {
      if (!err.message.includes('duplicate column name')) throw err;
    }
    db.prepare(`UPDATE app_meta SET value='3' WHERE key='db_version'`).run();
    console.log('[DB] Migrated to db_version 3 (added deletedAt to patients)');
    version = 3;
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

export function searchPatients(query, statusFilter = 'ALL') {
  return wrap(() => {
    const like = `%${query}%`;
    let statusClause = '';
    const params = [like, like, like];

    if (statusFilter !== 'ALL') {
      statusClause = `AND (t.paymentStatus = ?)`;
      params.push(statusFilter.toUpperCase());
    }

    const rows = db.prepare(`
      SELECT p.*,
        (SELECT GROUP_CONCAT(panelName, ', ') FROM patient_panels WHERE patientId = p.id) as panelNames,
        t.discountedTotal as netTotal,
        t.paymentStatus
      FROM patients p
      LEFT JOIN (
        SELECT * FROM transactions t1 
        WHERE id = (SELECT MAX(id) FROM transactions WHERE patientId = t1.patientId)
      ) t ON p.id = t.patientId
      WHERE (p.name LIKE ? OR p.mrNo LIKE ? OR p.contactNo LIKE ?)
        AND p.deletedAt IS NULL
        ${statusClause}
      ORDER BY p.createdAt DESC
      LIMIT 50
    `).all(...params);
    return { rows, totalCount: rows.length };
  });
}

export function getAllPatients(limit = 50, offset = 0, statusFilter = 'ALL') {
  return wrap(() => {
    let statusClause = '';
    const params = [];

    if (statusFilter !== 'ALL') {
      statusClause = `WHERE (t.paymentStatus = ?)`;
      params.push(statusFilter.toUpperCase());
    }

    const totalParams = [];
    if (statusFilter !== 'ALL') {
      totalParams.push(statusFilter.toUpperCase());
    }

    const totalRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM patients p
      LEFT JOIN (
        SELECT * FROM transactions t1 
        WHERE id = (SELECT MAX(id) FROM transactions WHERE patientId = t1.patientId)
      ) t ON p.id = t.patientId
      WHERE p.deletedAt IS NULL
      ${statusFilter !== 'ALL' ? `AND t.paymentStatus = ?` : ''}
    `).get(...totalParams);

    const rows = db.prepare(`
      SELECT p.*,
        (SELECT GROUP_CONCAT(panelName, ', ') FROM patient_panels WHERE patientId = p.id) as panelNames,
        t.discountedTotal as netTotal,
        t.paymentStatus
      FROM patients p
      LEFT JOIN (
        SELECT * FROM transactions t1 
        WHERE id = (SELECT MAX(id) FROM transactions WHERE patientId = t1.patientId)
      ) t ON p.id = t.patientId
      WHERE p.deletedAt IS NULL
      ${statusClause ? `AND t.paymentStatus = ?` : ''}
      ORDER BY p.createdAt DESC
      LIMIT ? OFFSET ?
    `).all(...(statusClause ? [statusFilter.toUpperCase(), limit, offset] : [limit, offset]));
    
    return { rows, totalCount: totalRow.count };
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

export function softDeletePatient(patientId) {
  return wrap(() => {
    db.prepare(`UPDATE patients SET deletedAt = datetime('now','localtime') WHERE id = ?`).run(patientId);
    return true;
  });
}

export function restorePatient(patientId) {
  return wrap(() => {
    db.prepare(`UPDATE patients SET deletedAt = NULL WHERE id = ?`).run(patientId);
    return true;
  });
}

export function permanentlyDeletePatient(patientId) {
  return wrap(() => {
    const deleteTx = db.transaction((id) => {
      db.prepare(`DELETE FROM test_results WHERE patientId = ?`).run(id);
      db.prepare(`DELETE FROM patient_panels WHERE patientId = ?`).run(id);
      db.prepare(`DELETE FROM transactions WHERE patientId = ?`).run(id);
      db.prepare(`DELETE FROM patients WHERE id = ?`).run(id);
    });
    deleteTx(patientId);
    return true;
  });
}

export function restoreAllPatients() {
  return wrap(() => {
    db.prepare(`UPDATE patients SET deletedAt = NULL WHERE deletedAt IS NOT NULL`).run();
    return true;
  });
}

export function emptyPatientTrash() {
  return wrap(() => {
    const trashedIds = db.prepare(`SELECT id FROM patients WHERE deletedAt IS NOT NULL`).all().map(p => p.id);
    if (trashedIds.length === 0) return true;

    const deleteTx = db.transaction((ids) => {
      const resultsStmt = db.prepare(`DELETE FROM test_results WHERE patientId = ?`);
      const panelsStmt = db.prepare(`DELETE FROM patient_panels WHERE patientId = ?`);
      const transStmt = db.prepare(`DELETE FROM transactions WHERE patientId = ?`);
      const patientsStmt = db.prepare(`DELETE FROM patients WHERE id = ?`);

      for (const id of ids) {
        resultsStmt.run(id);
        panelsStmt.run(id);
        transStmt.run(id);
        patientsStmt.run(id);
      }
    });

    deleteTx(trashedIds);
    return true;
  });
}

export function getTrashedPatients() {
  return wrap(() => {
    return db.prepare(`
      SELECT p.*,
        (SELECT GROUP_CONCAT(panelName, ', ') FROM patient_panels WHERE patientId = p.id) as panelNames,
        (SELECT discountedTotal FROM transactions WHERE patientId = p.id ORDER BY id DESC LIMIT 1) as netTotal,
        (SELECT paymentStatus FROM transactions WHERE patientId = p.id ORDER BY id DESC LIMIT 1) as paymentStatus
      FROM patients p
      WHERE p.deletedAt IS NOT NULL
      ORDER BY p.deletedAt DESC
    `).all();
  });
}

// ─── PANEL FUNCTIONS ──────────────────────────────────────────────────────────

export function getPatientPanels(patientId) {
  return wrap(() => {
    return db.prepare(`SELECT * FROM patient_panels WHERE patientId = ?`).all(patientId);
  });
}

export function saveTestResults(patientId, testData) {
  return wrap(() => {
    if (!testData || typeof testData !== 'object') return 0;
    
    const entries = [];
    for (const [parameterId, value] of Object.entries(testData)) {
      if (value !== null && value !== undefined && value !== '') {
        entries.push({ patientId, parameterId, value: String(value) });
      }
    }
    
    if (entries.length === 0) return 0;
    
    const stmt = db.prepare(`
      INSERT INTO test_results (patientId, parameterId, value)
      VALUES (?, ?, ?)
    `);
    
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        stmt.run(item.patientId, item.parameterId, item.value);
      }
    });
    
    insertMany(entries);
    return entries.length;
  });
}

export function getTestResults(patientId) {
  return wrap(() => {
    const rows = db.prepare(`SELECT parameterId, value FROM test_results WHERE patientId = ?`).all(patientId);
    const testData = {};
    rows.forEach(r => { 
      testData[r.parameterId] = r.value; 
    });
    return testData;
  });
}

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

export function updateTransaction(transactionId, updates) {
  return wrap(() => {
    const stmt = db.prepare(`
      UPDATE transactions SET 
        amountPaid = @amountPaid, 
        balanceDue = @balanceDue, 
        paymentStatus = @paymentStatus,
        updatedAt = datetime('now','localtime')
      WHERE id = @id
    `);
    stmt.run({
      id: transactionId,
      amountPaid: updates.amountPaid,
      balanceDue: updates.balanceDue,
      paymentStatus: updates.paymentStatus
    });
    return true;
  });
}

export function getTotalStats() {
  return wrap(() => {
    const row = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM patients) as totalPatients,
        (SELECT SUM(amountPaid) FROM transactions) as totalRevenue,
        (SELECT SUM(balanceDue) FROM transactions WHERE balanceDue > 0) as totalOutstanding
    `).get();
    
    return {
      totalPatients: row.totalPatients || 0,
      totalRevenue: row.totalRevenue || 0,
      totalOutstanding: row.totalOutstanding || 0
    };
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
