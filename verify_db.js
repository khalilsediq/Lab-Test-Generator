// verify_db.js - standalone verification script (CommonJS)
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(
  os.homedir(),
  'AppData', 'Roaming', 'lab-test-generator', 'bukhari_lab.db'
);

console.log('DB Path:', dbPath);
const db = new Database(dbPath, { readonly: true });

// Test 2 — check all 6 tables exist
const tables = db.prepare(
  `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
).all().map(r => r.name);

console.log('\n=== TEST 2: Tables ===');
const required = ['app_meta', 'expenses', 'patient_panels', 'patients', 'test_prices', 'transactions'];
let test2Pass = true;
for (const t of required) {
  const found = tables.includes(t);
  console.log(`  ${found ? 'PASS' : 'FAIL'} ${t}`);
  if (!found) test2Pass = false;
}
console.log(`Test 2 Overall: ${test2Pass ? 'PASS' : 'FAIL'}`);

// Test 4 — app_meta has db_version = '1'
console.log('\n=== TEST 4: app_meta ===');
const rows = db.prepare(`SELECT key, value FROM app_meta`).all();
for (const r of rows) {
  console.log(`  key=${r.key}, value=${r.value}`);
}
const versionRow = rows.find(r => r.key === 'db_version');
const test4Pass = versionRow && versionRow.value === '1';
console.log(`Test 4 Overall: ${test4Pass ? 'PASS' : 'FAIL'}`);

db.close();
