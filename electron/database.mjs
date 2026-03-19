/* global process */
// electron/database.js  — all SQLite logic for Bukhari Lab
// Uses createRequire to import the CJS better-sqlite3 from an ESM module context.

import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

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

    CREATE TABLE IF NOT EXISTS app_settings (
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

  const mrSeedCheck = db.prepare(`SELECT value FROM app_settings WHERE key = 'last_mr_number'`).get();
  if (!mrSeedCheck) {
    const rowAll = db.prepare(`SELECT MAX(CAST(mrNo AS INTEGER)) AS maxMr FROM patients`).get();
    const max = rowAll && rowAll.maxMr != null ? rowAll.maxMr : 1000;
    db.prepare(`INSERT INTO app_settings (key, value) VALUES ('last_mr_number', ?)`).run(max.toString());
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
    return db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO patients
          (mrNo, trId, trNo, name, fatherHusbandName, age, gender,
           contactNo, address, consultant, sampleLocation, registrationDate)
        VALUES
          (@mrNo, @trId, @trNo, @name, @fatherHusbandName, @age, @gender,
           @contactNo, @address, @consultant, @sampleLocation, @registrationDate)
      `);
      const result = stmt.run(patientData);
      
      db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('last_mr_number', @mrNo)`).run({ mrNo: patientData.mrNo });
      
      return result.lastInsertRowid;
    })();
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
    const row = db.prepare(`SELECT value FROM app_settings WHERE key = 'last_mr_number'`).get();
    if (row && row.value) {
      return (parseInt(row.value) + 1).toString();
    }
    return '1001';
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
        (SELECT COUNT(*) FROM patients WHERE deletedAt IS NULL) as totalPatients,
        
        COALESCE((
          SELECT SUM(t.amountPaid) 
          FROM transactions t
          INNER JOIN patients p ON t.patientId = p.id
          WHERE p.deletedAt IS NULL
        ), 0) as totalRevenue,
        
        COALESCE((
          SELECT SUM(t.balanceDue) 
          FROM transactions t
          INNER JOIN patients p ON t.patientId = p.id
          WHERE p.deletedAt IS NULL 
          AND t.balanceDue > 0
        ), 0) as totalOutstanding
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

export function getExpenseCategories() {
  return wrap(() => {
    const rows = db.prepare(`SELECT DISTINCT category FROM expenses WHERE category IS NOT NULL AND category != ''`).all();
    const dbCategories = rows.map(r => r.category);
    const defaults = ['Chemicals & Reagents', 'Equipment', 'Utilities', 'Staff', 'Rent', 'Maintenance', 'Other'];
    const merged = [...new Set([...defaults, ...dbCategories])];
    return merged;
  });
}

export function getDailyReport(dateStr) {
  return wrap(() => {
    const revenueRow = db.prepare(`
      SELECT COALESCE(SUM(t.amountPaid), 0) AS totalRevenue,
             COUNT(DISTINCT t.patientId) AS patientCount
      FROM transactions t
      INNER JOIN patients p ON t.patientId = p.id
      WHERE DATE(t.createdAt) = ? AND p.deletedAt IS NULL
    `).get(dateStr);

    const expenseRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS totalExpenses,
             COUNT(*) AS expenseCount
      FROM expenses
      WHERE date = ?
    `).get(dateStr);

    const expenseBreakdown = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE date = ?
      GROUP BY category
      ORDER BY total DESC
    `).all(dateStr);

    const revenueBreakdown = db.prepare(`
      SELECT p.name AS patientName, p.mrNo,
             t.amountPaid, t.paymentStatus,
             (SELECT GROUP_CONCAT(pp.panelName, ', ') FROM patient_panels pp WHERE pp.patientId = p.id) AS panels
      FROM transactions t
      INNER JOIN patients p ON t.patientId = p.id
      WHERE DATE(t.createdAt) = ? AND p.deletedAt IS NULL
      ORDER BY t.createdAt DESC
    `).all(dateStr);

    const totalRevenue   = revenueRow.totalRevenue   || 0;
    const totalExpenses  = expenseRow.totalExpenses  || 0;
    const patientCount   = revenueRow.patientCount   || 0;
    const expenseCount   = expenseRow.expenseCount   || 0;

    return {
      date: dateStr,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      expenseBreakdown,
      revenueBreakdown,
      expenseCount,
      patientCount,
    };
  });
}

export function getMonthlyReport(year, month) {
  return wrap(() => {
    const m = String(month).padStart(2, '0');
    const prefix = `${year}-${m}`;

    // Revenue rows per day
    const revenueRows = db.prepare(`
      SELECT DATE(t.createdAt) AS date,
             COALESCE(SUM(t.amountPaid), 0) AS revenue,
             COUNT(DISTINCT t.patientId) AS patientCount
      FROM transactions t
      INNER JOIN patients p ON t.patientId = p.id
      WHERE strftime('%Y-%m', t.createdAt) = ? AND p.deletedAt IS NULL
      GROUP BY DATE(t.createdAt)
    `).all(prefix);

    // Expense rows per day
    const expenseRows = db.prepare(`
      SELECT date, COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      WHERE strftime('%Y-%m', date) = ?
      GROUP BY date
    `).all(prefix);

    // Top expense categories for the whole month
    const topExpenseCategories = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE strftime('%Y-%m', date) = ?
      GROUP BY category
      ORDER BY total DESC
    `).all(prefix);

    // Merge daily data
    const revenueMap = {};
    let totalPatients = 0;
    for (const r of revenueRows) {
      revenueMap[r.date] = { revenue: r.revenue, patientCount: r.patientCount };
      totalPatients += r.patientCount;
    }
    const expenseMap = {};
    for (const r of expenseRows) expenseMap[r.date] = r.expenses;

    // Union of all days with any data
    const allDates = [...new Set([...Object.keys(revenueMap), ...Object.keys(expenseMap)])];
    allDates.sort((a, b) => b.localeCompare(a)); // DESC

    const dailyData = allDates.map(date => {
      const revenue   = revenueMap[date]?.revenue   || 0;
      const expenses  = expenseMap[date]             || 0;
      return { date, revenue, expenses, netProfit: revenue - expenses };
    });

    const totalRevenue  = dailyData.reduce((s, d) => s + d.revenue,  0);
    const totalExpenses = dailyData.reduce((s, d) => s + d.expenses, 0);

    return {
      year, month,
      totalRevenue, totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      dailyData, topExpenseCategories, totalPatients,
    };
  });
}

export function getExpensesByDateRange(startDate, endDate) {
  return wrap(() => {
    return db.prepare(`
      SELECT * FROM expenses
      WHERE date BETWEEN ? AND ?
      ORDER BY date DESC, createdAt DESC
    `).all(startDate, endDate);
  });
}

export function deleteExpense(id) {
  return wrap(() => {
    db.prepare(`DELETE FROM expenses WHERE id = ?`).run(id);
    return true;
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

// ─── AUTH FUNCTIONS ──────────────────────────────────────────────────────────

export function hasPasswordSet() {
  return wrap(() => {
    const row = db.prepare(`SELECT value FROM app_settings WHERE key = 'password_hash'`).get();
    return row && row.value !== null;
  });
}

export function getAuthData() {
  return wrap(() => {
    const rows = db.prepare(`SELECT key, value FROM app_settings WHERE key IN ('password_hash', 'recovery_key_hash', 'security_question', 'security_answer_hash', 'security_enabled')`).all();
    const map = {};
    for (const r of rows) map[r.key] = r.value;
    return {
      isSecurityEnabled: map.security_enabled !== 'false',
      hasPassword: !!map.password_hash,
      hasRecoveryKey: !!map.recovery_key_hash,
      hasSecurityQuestion: !!map.security_question,
      securityQuestion: map.security_question || null
    };
  });
}

export function setSecurityEnabled(enabled) {
  return wrap(() => {
    db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('security_enabled', ?)`).run(enabled ? 'true' : 'false');
    return true;
  });
}

export function setInitialAuth(password, recoveryKey, securityQuestion, securityAnswer) {
  return wrap(() => {
    const passwordHash = bcrypt.hashSync(password, 12);
    const recoveryKeyHash = bcrypt.hashSync(recoveryKey, 10);
    let securityAnswerHash = null;
    if (securityQuestion && securityAnswer) {
      securityAnswerHash = bcrypt.hashSync(securityAnswer.toLowerCase().trim(), 10);
    }
    
    const tx = db.transaction(() => {
      const stmt = db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`);
      stmt.run('password_hash', passwordHash);
      stmt.run('recovery_key_hash', recoveryKeyHash);
      if (securityQuestion) {
        stmt.run('security_question', securityQuestion);
        stmt.run('security_answer_hash', securityAnswerHash);
      }
    });
    tx();
    return true;
  });
}

export function verifyPassword(inputPassword) {
  return wrap(() => {
    const row = db.prepare(`SELECT value FROM app_settings WHERE key = 'password_hash'`).get();
    if (!row || !row.value) return false;
    return bcrypt.compareSync(inputPassword, row.value);
  });
}

export function verifyRecoveryKey(inputKey) {
  return wrap(() => {
    const row = db.prepare(`SELECT value FROM app_settings WHERE key = 'recovery_key_hash'`).get();
    if (!row || !row.value) return false;
    return bcrypt.compareSync(inputKey.trim(), row.value);
  });
}

export function verifySecurityAnswer(inputAnswer) {
  return wrap(() => {
    const row = db.prepare(`SELECT value FROM app_settings WHERE key = 'security_answer_hash'`).get();
    if (!row || !row.value) return false;
    return bcrypt.compareSync(inputAnswer.toLowerCase().trim(), row.value);
  });
}

export function resetPassword(newPassword) {
  return wrap(() => {
    const hash = bcrypt.hashSync(newPassword, 12);
    db.prepare(`UPDATE app_settings SET value = ? WHERE key = 'password_hash'`).run(hash);
    return true;
  });
}

export function updateSecurityQuestion(question, answer) {
  return wrap(() => {
    const hash = bcrypt.hashSync(answer.toLowerCase().trim(), 10);
    const tx = db.transaction(() => {
      const stmt = db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`);
      stmt.run('security_question', question);
      stmt.run('security_answer_hash', hash);
    });
    tx();
    return true;
  });
}

