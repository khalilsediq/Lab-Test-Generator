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
  - `main.js`: Electron entry point and IPC registration.
  - `database.js`: Pure SQLite logic for the main process.
- `/src`: Primary React source code.
  - `/src/components`: UI components. Key files:
    - `ReportTemplate.jsx`: The core A4 print layout.
    - `TestFields.jsx`: Dynamic form generator for test parameters.
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
- **Database Persistence**: Fully implemented using `better-sqlite3`. Replaced `localStorage`-heavy methods. Local data is securely stored at the `userData` roaming path to survive updates. Includes built-in `localStorage` migration hook.
- **Top Navigation & Settings:** Introduced a top Tab Bar replacing the static header. Includes a dedicated Settings page with a sub-navigation layout.
- **Test Price Management:** Prices are centralized in `App.jsx` state (`testPrices`) and fetched once from SQLite on mount via `dbClient.getAllTestPrices()`. A `handleUpdatePrice` handler performs optimistic UI updates and persists to SQLite. `TestPriceManager` (in Settings) reads from this global state via props — no independent DB fetching. Prices can also be set inline in any test panel header within the patient report, and set during custom test creation.
- **Custom Panel Price on Creation:** `CustomTestModal.jsx` includes a "Panel Price (Rs.)" input. When the panel is saved, the price is passed to `handleSaveCustomTest(panel, price)` and immediately saved to the SQLite database via `handleUpdatePrice`.
- **Inline Price Editing in Test Fields:** Each panel header in `TestFields.jsx` has a small `Rs.` input that on blur/Enter calls `onUpdatePrice` to save the price globally and to the database — no page reload needed.
- **Custom Gender Reference Ranges:** `CustomTestModal.jsx` allows adding arbitrary custom gender entries (e.g., Child, Infant, Elderly) per parameter, stored as a `custom_ranges: [{gender, min, max}]` array in the parameter's `reference_range`. `TestFields.jsx`'s `isAbnormal()` and `formatRange()` functions check `custom_ranges` first before falling back to standard male/female keys. The `EditRow` component also dynamically supports editing these custom ranges in real-time, enabling full abnormal detection and customization for any defined custom gender.
- **UI Stability & Defensive Logic:** Implemented comprehensive null checks and reactive state synchronization to prevent UI freezes/crashes when deleting custom test panels that are currently active in the workspace. Native Chromium dialogs (`window.confirm`/`prompt`/`alert`) have been banned and replaced by a pure React `ConfirmModal` and inline toast system to prevent renderer thread locking during reconciliation. Heavy array mutations (`customTests`, `trashedPanels`) are strictly wrapped in React 19's `startTransition()` to yield priority to user input.
- **Gender Label Synchronization & Branding:** Custom gender labels defined in `custom_ranges` within any test template are dynamically harvested in `App.jsx` and injected into the `PatientForm.jsx` gender dropdown. The `TestFields.jsx` entry UI and `ReportTemplate.jsx` PDF generator have been synchronized to use dynamic labeling badges (e.g., "⚧ Child") and specific reference range logic for non-standard genders, ensuring consistent abnormal detection throughout the report lifecycle.
- **Sidebar UX Enhancements:** Users can now "Pin" frequently used test panels (creating a dedicated "Pinned" category at the top of the sidebar).
- **Dedicated Trash View:** The application features a dedicated `TrashView.jsx` accessible via a "Trash" tab in the top navigation bar. Any panel (default or custom) removed from the main sidebar is moved here. From the Trash View, panels can be restored, bulk-restored with "Restore All", or permanently deleted (for custom panels) utilizing `ConfirmModal` for safe deletions.

### 🚧 Partially Implemented / Inferable Gaps

- **QR Code:** A placeholder exists in `ReportTemplate.jsx` but no logic is implemented to generate a functional QR link.
- **Reporting Date vs Registration Date:** Mostly mirrored currently; complex reporting delay logic isn't fully implemented.

## 5. Known Bugs & Gotchas

- **PDF OKLCH Error:** `html2canvas` cannot parse Tailwind v4's OKLCH color variables. A `resolveStylesToInline` utility in `ReportPreview.jsx` and `generatePDF.js` is used to convert these to RGB before capture.
- **PDF Generation Freeze:** Large reports can lock the UI thread during canvas rendering. Handled via `setTimeout` yielding and "Generating..." states, but still intensive.
- **Chromium Print Engine Quirks:** Native `thead` repetition is unreliable in some Chromium versions. The project uses a "Fixed Header + Spacer" trick in `ReportTemplate.jsx` to ensure headers repeat on every page without overlapping content.
- **Scroll Bleed:** Modal scrolling sometimes drifts the underlying page; mitigated by `overflow-hidden` on `body` during modal visibility.
- **ESM/CJS Native Interop:** The Vite project uses `"type": "module"` (ESM), but `better-sqlite3` is a CommonJS native binding. `database.js` imports it safely using Node's `createRequire(import.meta.url)`. Do not remove this wrapper, or the app will crash on import.
- **SQLite Native Bindings Match:** If you install new packages that affect native bindings (or update Electron), you may get a `NODE_MODULE_VERSION` mismatch error on launch. This is fixed by running `npx electron-rebuild -f -w better-sqlite3` to recompile the SQLite driver for Electron's specific Node ABI.

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
