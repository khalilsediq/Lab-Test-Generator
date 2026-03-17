You are a senior software engineer.

Goals:
- Write clean maintainable code
- Run tests after changes
- Fix errors automatically
- Refactor when needed

Stack:(Understand it yourself)

# Bukhari Lab Test Generator - Agent Briefing

This file provides a concise overview of the Lab Test Generator project for future AI coding agents.

## 1. Project Description

**Lab Test Generator** is a desktop-class Electron application designed for medical laboratories. It allows technicians to:

- Register patient details with extensive demographics and barcode generation.
- Select from a variety of laboratory test panels (Hematology, Biochemistry, etc.).
- Input test results with automatic abnormal value detection (based on age/gender-specific reference ranges).
- Compose multi-test reports (stacking multiple panels into one document).
- Preview and generate high-quality, print-ready PDF reports with repeated headers/footers.
- Create and manage custom test panels stored locally.

## 2. Technology Stack

- **Runtime:** Electron (v40.6.0)
- **Frontend Framework:** React 19 + Vite (Type: module)
- **Styling:** Tailwind CSS v4 (using `@tailwindcss/postcss`)
- **Database:** `better-sqlite3` (v11.8.1) — Stored at `app.getPath('userData')/bukhari_lab.db`
- **PDF/Canvas:** `html2canvas` (v1.4.1), `jspdf` (v4.2.0), `html2pdf.js` (legacy, mostly bypassed).
- **Barcodes:** `react-barcode` (CODE128).
- **Communication:** Standard Electron main/renderer IPC, wrapped client-side via `dbClient`.

## 3. Folder Structure & Purposes

- `/electron`: Main process context.
  - `main.cjs`: Electron entry point and IPC registration.
  - `database.mjs`: Pure SQLite logic for the main process.
- `/src`: Primary React source code.
  - `/src/components`: UI components. Key files:
    - `ReportTemplate.jsx`: The core A4 print layout.
    - `TestFields.jsx`: Dynamic form generator for test parameters.
    - `BillingPanel.jsx`: Persistent right-side billing pane managing panel pricing, discounts, and the final patient registration save transaction.
    - `ReportPreview.jsx`: Modal that handles PDF generation and print triggering.
    - `CustomTestModal.jsx`: Interface for creating user-defined tests.
  - `/src/data`: Static JSON templates (`testTemplates.json`) for predefined laboratory tests.
  - `/src/utils`: Utility functions.
    - `generatePDF.js`: Handles canvas slicing for multi-page PDF generation.
    - `dbClient.js`: IPC wrapper for all renderer-to-main database calls.
  - `/src/assets`: Images and static resources (Lab Logo, etc.).
- `/public`: Static assets served by Vite.
- `/dist`: Production build output (Vite).

## 4. Feature Status

### ✅ Implemented

- Core patient registration with barcode (Patient No, T/R ID).
- Dynamic test field generation and abnormal value highlighting.
- Multi-test composition (stacking panels).
- Custom panel creation and persistence.
- PDF generation with multi-page support and page numbering.
- Print-optimized CSS (fixed headers/footers on every page).
- **Billing & Patient Registration Sequence:** Fully integrated a right-column `BillingPanel.jsx` in the New Report view. Dynamically computes subtotals from active tools/`testPrices`, applies percentage/fixed discounts, tracks Amount Paid/Balance Due, and performs a 3-step atomic SQLite save via `dbClient` (Patient -> Selected Panels -> Transaction).
- **Auto MR Number Generation:** Sequential MR Numbers are auto-fetched on application mount and automatically incremented after every successful patient registration, eliminating manual data entry.
- **Database Persistence**: Fully implemented using `better-sqlite3`. Replaced `localStorage`-heavy methods. Local data is securely stored at the `userData` roaming path to survive updates. Includes built-in `localStorage` migration hook.
- **Top Navigation & Settings:** Introduced a top Tab Bar replacing the static header. Includes a dedicated Settings page with a sub-navigation layout.
- **Test Price Management:** Prices are centralized in `App.jsx` state (`testPrices`) and fetched once from SQLite on mount via `dbClient.getAllTestPrices()`. A `handleUpdatePrice` handler performs optimistic UI updates and persists to SQLite. `TestPriceManager` (in Settings) reads from this global state via props — no independent DB fetching. Prices can also be set inline in any test panel header within the patient report, and set during custom test creation.
- **Custom Panel Price on Creation:** `CustomTestModal.jsx` includes a "Panel Price (Rs.)" input. When the panel is saved, the price is passed to `handleSaveCustomTest(panel, price)` and immediately saved to the SQLite database via `handleUpdatePrice`.
- **Inline Price Editing in Test Fields:** Each panel header in `TestFields.jsx` has a small `Rs.` input that on blur/Enter calls `onUpdatePrice` to save the price globally and to the database — no page reload needed.
- **Custom Gender Reference Ranges:** `CustomTestModal.jsx` allows adding arbitrary custom gender entries (e.g., Child, Infant, Elderly) per parameter, stored as a `custom_ranges: [{gender, min, max}]` array in the parameter's `reference_range`. `TestFields.jsx`'s `isAbnormal()` and `formatRange()` functions check `custom_ranges` first before falling back to standard male/female keys. The `EditRow` component also dynamically supports editing these custom ranges in real-time, enabling full abnormal detection and customization for any defined custom gender.
- **UI Stability & Defensive Logic:** Implemented comprehensive null checks and reactive state synchronization to prevent UI freezes/crashes when deleting custom test panels. Specifically hardened `App.jsx` with a `selectedTest` synchronization effect to prevent application-wide crashes when the test panel list is entirely empty (Trash emptied), ensuring graceful recovery and selection management. Native Chromium dialogs (`window.confirm`/`prompt`/`alert`) have been banned and replaced by a pure React `ConfirmModal` and inline toast system to prevent renderer thread locking during reconciliation. Heavy array mutations (`customTests`, `trashedPanels`) are strictly wrapped in React 19's `startTransition()` to yield priority to user input.
- **Historical Report Preview:** Implemented a dedicated `previewPayload` state and global `window.showPreviewReport` handler in `App.jsx`. This allows technicians to preview and re-print historical patient reports directly from the "Patients" tab without overwriting or losing their current active report draft.
- **Gender Label Synchronization & Branding:** Custom gender labels defined in `custom_ranges` within any test template are dynamically harvested in `App.jsx` and injected into the `PatientForm.jsx` gender dropdown. The `TestFields.jsx` entry UI and `ReportTemplate.jsx` PDF generator have been synchronized to use dynamic labeling badges (e.g., "⚧ Child") and specific reference range logic for non-standard genders, ensuring consistent abnormal detection throughout the report lifecycle.
- **Sidebar UX Enhancements:** Users can now "Pin" frequently used test panels (creating a dedicated "Pinned" category at the top of the sidebar). The sidebar collapse mechanism has been unified into a single full-width layout toggle safely integrated into the bottom footer pane.
- **Dedicated Trash View:** The application features a dedicated `TrashView.jsx` accessible via a "Trash" tab in the top navigation bar. Any panel (default or custom) removed from the main sidebar is moved here. From the Trash View, panels can be restored, bulk-restored with "Restore All", or permanently deleted (for custom panels) utilizing `ConfirmModal` for safe deletions.
- **Patient History & Payment Tracking:** Implemented `PatientHistory.jsx` in a new "Patients" tab. This screen allows technicians to view, search (by name, MR number, or phone), and paginate through all registered patients. It includes key statistics (Total Patients, Total Revenue, Outstanding Balance). Clicking a patient opens a detailed modal providing full billing summaries and the ability to record partial or full balance payments. Includes an "Open in New Report" capability to pre-fill a new report using a returning patient's data.
- **Patient Trash System:** Integrated soft-delete functionality for Patient records in the Patient History view. Trashed patients are removed from standard search but fully retained in SQLite via a `deletedAt` timestamp. The top navigation `TrashView.jsx` was split into a dual-tab layout ("Test Panels" vs "Patient Records") featuring lazy-loaded API fetches. From here, users can seamlessly *Restore* mistakenly deleted patients or perform severe multi-table cascading SQLite *Delete Forever* actions to permanently purge all associated tests, panels, and transactional data. Added "Restore All" and "Empty Trash" buttons for bulk management of trashed patient records.
- **Trash Synchronization & Refresh:** Implemented a robust data-fetching pattern in `TrashView.jsx`. Using `useCallback` for stable function references and a granular `useEffect` dependency array, the application ensures that switching to the "Patient Records" tab always triggers a fresh sync from the database. A manual "Refresh" button (with loading state and toast feedback) is also provided to resolve any data drift without requiring a page reload.
- **Save & Restore Test Results:** Test parameter results are now persisted seamlessly to a dedicated `test_results` SQLite table upon finishing the Patient Registration process (`BillingPanel.jsx`). When a technician views an old patient in the Patient History tab and clicks "Preview Report", the application dynamically fetches and injects exactly what they authored, enabling true historical patient test report retrieval and re-printing.
- **Diagnostic Infrastructure:** Added a `db:ping` IPC handler in `main.cjs` to troubleshoot main/renderer connectivity issues definitively. IPC handlers now include diagnostic `console.log` statements visible in the terminal to verify message arrival in the main process.
### 🚧 Partially Implemented / Inferable Gaps

- **QR Code:** A placeholder exists in `ReportTemplate.jsx` but no logic is implemented to generate a functional QR link.
- **Reporting Date vs Registration Date:** Mostly mirrored currently; complex reporting delay logic isn't fully implemented.

## 5. Known Bugs & Gotchas

- **PDF OKLCH Error:** `html2canvas` cannot parse Tailwind v4's OKLCH color variables. A `resolveStylesToInline` utility in `ReportPreview.jsx` and `generatePDF.js` is used to convert these to RGB before capture.
- **PDF Generation Freeze:** Large reports can lock the UI thread during canvas rendering. Handled via `setTimeout` yielding and "Generating..." states, but still intensive.
- **Chromium Print Engine Quirks:** Native `thead` repetition is unreliable in some Chromium versions. The project uses a "Fixed Header + Spacer" trick in `ReportTemplate.jsx` to ensure headers repeat on every page without overlapping content.
- **Scroll Bleed:** Modal scrolling sometimes drifts the underlying page; mitigated by `overflow-hidden` on `body` during modal visibility.
- **ESM/CJS Native Interop:** The Vite project uses `"type": "module"` (ESM), but `better-sqlite3` is a CommonJS native binding. `database.mjs` imports it safely using Node's `createRequire(import.meta.url)`. Do not remove this wrapper, or the app will crash on import.
- **SQLite Native Bindings Match:** If you install new packages that affect native bindings (or update Electron), you may get a `NODE_MODULE_VERSION` mismatch error on launch. This is fixed by running `npx electron-rebuild -f -w better-sqlite3` to recompile the SQLite driver for Electron's specific Node ABI.
- **Main Process Restart Requirement:** Changes to `main.cjs` or `database.mjs` (Main Process logic) do not hot-reload. The Electron application must be completely closed and restarted (`npm run dev`) for any new IPC handlers or database schema changes to take effect. Window refreshes (`Ctrl+R`) only update the renderer process.
- **IPC Channel Protection:** Electron does not allow registering multiple handlers for the same channel name (e.g., `ipcMain.handle("chan", ...)`). Attempting to do so will result in only the first one being registered or potentially causing a main process crash. Check for duplicates if a "No handler registered" error appears after a restart.
- **React Hook Strictness (React 19):** In complex syncing components like `TrashView.jsx`, ensure function dependencies are memoized with `useCallback`. Changing the size or order of dependency arrays in `useEffect` between renders will trigger a fatal React error. Always maintain a consistent array length.
- **Node Runtime Mode shadowing (ELECTRON_RUN_AS_NODE):** If the environment variable `ELECTRON_RUN_AS_NODE=1` is set, the Electron binary behaves like plain Node.js and fails to resolve the built-in `electron` module (causing `TypeError` on `app.whenReady`). The `dev` script in `package.json` explicitly unsets this via PowerShell to ensure the app starts in native Electron mode.

## 6. Local Development

1. **Initial Setup:**
   ```bash
   npm install
   ```
2. **Start Development (Vite + Electron):**
   ```bash
   npm run dev
   ```
   _This uses `concurrently` to start Vite and wait for the dev server before launching Electron._
3. **Build Application:**
   ```bash
   npm run build
   ```
