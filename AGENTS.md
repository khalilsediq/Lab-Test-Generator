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
    - `InvoiceModal.jsx`: Modal for A5 financial invoice generation.
    - `CustomTestModal.jsx`: Interface for creating user-defined tests.
    - `ExpenseManager.jsx`: Full-page Expense Management Dashboard with daily/monthly financial views, expense logging, category bar charts, and `.txt` export.
  - `/src/data`: Static JSON templates (`testTemplates.json`) for predefined laboratory tests.
  - `/src/utils`: Utility functions.
    - `generatePDF.js`: Handles canvas slicing for multi-page PDF generation.
    - `dbClient.js`: IPC wrapper for all renderer-to-main database calls.
  - `/src/assets`: Images and static resources (Lab Logo, etc.).
- `/public`: Static assets served by Vite.
- `/dist`: Production build output (Vite).

## 4. Feature Status

## 4. Feature Status

### ✅ Implemented

- **Patient Stats & ID Reliability:** Fixed the `getTotalStats` query to exclude soft-deleted (trashed) patients so the UI accurately reflects active totals. Also overhauled the MR number counter to be independent of the `patients` table by seeding and persisting the highest MR number in `app_settings` via SQLite transactions, guaranteeing it never decrements when patients are trashed or permanently deleted.
- **Workflow Efficiency:** Added a prominent "New Patient" button to the New Report tab. This instantly clears the patient form, tests, and billing panel (via `resetKey`), while auto-fetching the next sequential MR number, drastically reducing friction between patient registrations.
- **App Security & Authentication:** Complete locked-screen application system with `bcryptjs` hashed SQLite persistence. Includes first-run Setup, Lockout logic, Security Question / Recovery Key password recovery flows, and dynamic "Remove/Bypass Security" controls. A futuristic animated secure Logout button is integrated into the collapsible Sidebar and Mobile Navbar. State seamlessly updates across components via `onSecurityChanged` callbacks without forcing hard reloads. The Security Settings UI is fully responsive with vertical scrolling support for all screen sizes.
- **Core Demographics:** Patient registration with automated barcode generation (CODE128) and sequential MR Number tracking.
- **Dynamic Test Engine:** Adaptive entry fields for complex test panels with real-time abnormal value detection based on age/gender-specific ranges.
- **Specialized Fields:** Dedicated UI logic for `BloodBankFields.jsx` (Cross-matching) and `qualitative_select` parameters.
- **Multi-Test Composition:** Ability to stack multiple panels into a single A4 report with seamless page overflow handling.
- **Patient History Tabs:** Advanced filtering by payment status (All, Paid, Unpaid, Partial) with integrated search and server-side pagination.
- **PDF Generation:** High-fidelity PDF creation using `html2canvas` and `jsPDF`. Includes a style-resolution utility to convert Tailwind v4 OKLCH colors to standard RGB for canvas stability.
- **Billing & Transactions:** Integrated `BillingPanel.jsx` for atomic patient registration, panel billing, discount management, and balance tracking.
- **Administrative Test Hub:** Consolidated test management (Create, Import, Export, Bulk Delete) into a dedicated **Manage Tests** section within `Settings.jsx`.
- **UI Architecture:** Optimized sidebar for navigation-only by lifting administrative logic to `App.jsx` and `Settings.jsx`.
- **Safety Patterns:** Standardized destructive actions (Bulk Remove) using a custom React `ConfirmModal` instead of native browser dialogs.
- **Historical Report Preview:** Global `window.showPreviewReport` handler allowing re-printing of historical tests via a `previewPayload` state without losing current draft data.
- **Database Persistence:** Centralized `better-sqlite3` storage at `userData` path. Includes a migration layer for legacy `localStorage` data.
- **Trash Management:** Dual-tab Trash View for Test Panels and Patient Records with cascading permanent delete transactions.
- **Trash Synchronization:** High-reliability sync pattern in `TrashView.jsx` leveraging `useCallback` for stable re-fetching and a manual "Refresh" button for data drift correction.
- **Invoice Generator:** A5 financial invoice/receipt generation system (Step 4.5) with dedicated printing isolation and history support.
- **Custom Application Branding:** Official application logo integration in the Electron window icon, report headers, watermarks, and favicon.
- **Empty Startup Screen:** Application now launches with an empty "New Report" view, preventing unnecessary auto-selection of the first test panel.
- **Advanced Layout Responsiveness:** Improved Test Entry layout with adaptive grid breakpoints (`lg:`/`xl:`), fluid column widths, and smart-stacking strategies for tablets and small desktops. Provides superior usability even when side panels (Billing/Sidebar) are open.
- **Premium Sidebar UX:**
  - **Launch Stability:** Integrated a reactive `windowWidth` state to ensure the sidebar is correctly visible on fresh launch, solving the issue where static `window.innerWidth` checks would fail during the initial render stabilization.
  - **Mounting Protection:** Uses a `hasMounted` state to prevent transient viewport size fluctuations (e.g., 0px reports during app load) from triggering the sidebar's mobile auto-close logic, eliminating launch-time clipping.
  - **Persistent Branding:** Laboratory logo scales dynamically but remains visible in both expanded and collapsed states.
  - **Centered Alignment:** Logo is perfectly centered in both 64px (collapsed) and expanded states.
  - **Synchronized Transitions:** All internal components (Search bar, navigation list, resize handle, and version footer) share a 300ms transition with the sidebar container, eliminating all visual lag and "popping."
  - **Stable Footer:** Fixed-height collapse button and controlled-height version reveal to prevent upward "jumping" animations during expansion.
- **Diagnostic Infrastructure:** Integrated `db:ping` and verbose console logging in the Main Process to definitively verify IPC connectivity and handler registration.
- **Patient Validation:** Mandatory Patient Name check in `BillingPanel.jsx` before registration, with clear UI feedback and red asterisk indicators in `PatientForm.jsx`.
- **Unified Test Removal:** Standardized the deletion of any test panel from the central "Test Entry" view. Regardless of whether a test is added from the Sidebar (primary) or the internal dropdown (secondary), every panel now consistently features a "Remove" button, enabling full control over the report composition without reloading or clearing the entire form.
- **React Stability & Performance:** Optimized `TestFields.jsx` by resolving React Hook rule violations and replacing cascading render effects (synchronous `useEffect` calls) with a more efficient `key`-based reset strategy.
- **Controlled Input Reliability:** Implemented comprehensive state reset logic in `App.jsx` and added defensive `|| ""` guards to all `PatientForm.jsx` inputs, eliminating React "controlled to uncontrolled" warnings during patient registration.
- **Expense Management Dashboard (Step 5 — FINAL FEATURE):** Full financial management screen accessible via the **Expenses** top-nav tab (inserted between Patients and Settings). Implements:
  - **Dashboard Tab** with Daily and Monthly views: stat cards (Total Revenue, Total Expenses, Net Profit/Loss, Total Patients), expense category bar-chart breakdown, patient revenue breakdown table, and a daily trend table for monthly view.
  - **Real-Time Refresh:** Dashboard auto-refreshes whenever the user navigates to the Expenses tab (via `isActive` prop + `useRef` transition detection in `ExpenseManager`). A manual **Refresh** button is also shown in the Dashboard toolbar, implemented in `DashboardTab` via an `onRefresh` callback prop.
  - **Expenses Tab**: Add Expense form (date, category dropdown with custom category support, description, integer amount), date-range filtered Expense Log table with delete functionality via `ConfirmModal`.
  - **Export**: Formatted `.txt` export via Electron `dialog.showSaveDialog` + `fs.writeFileSync`, triggered from both Daily and Monthly dashboard views.
  - **Database**: 5 new functions in `database.mjs`: `getExpenseCategories()`, `getDailyReport()`, `getMonthlyReport()`, `getExpensesByDateRange()`, `deleteExpense()`. These join with patients/transactions for accurate revenue accounting, excluding soft-deleted patients.
  - **IPC**: 7 new handlers in `main.cjs` under the `exp:` namespace: `exp:get-categories`, `exp:get-daily-report`, `exp:get-monthly-report`, `exp:get-expenses-range`, `exp:save-expense`, `exp:delete-expense`, `exp:export-text`.
  - **Client**: 7 new wrappers added to `dbClient.js` under the `exp:` namespace.

---

> ### 🏁 PROJECT STATUS: FEATURE COMPLETE
> All five planned feature steps have been implemented and verified. The Bukhari Lab Test Generator is now a fully-featured desktop application.



## 5. Architectural Patterns & Lessons

### Module Interop (ESM + CJS)

- The project follows a hybrid module system. The Frontend is **ESM** (`"type": "module"`), while the Electron main process uses **CommonJS** (`main.cjs`) to ensure reliable loading of native Node bindings like `better-sqlite3`.
- **Rule:** Never rename `main.cjs` to `.js` or `.mjs` without verifying native driver support.

### IPC & State Management

- **Persistence First:** Always persist billing and result changes to SQLite. `localStorage` is used only for UI-only state (sidebar width, etc.).
- **Global Handlers:** Use `window.X` sparingly (e.g., `showPreviewReport`, `showToast`) as a bridge between deep components and the main application container.
- **IPC Safety:** Electron does not allow duplicate IPC handlers for the same channel. Always check `main.cjs` for existing registrations before adding new ones.

### React 19 Hook Strictness

- Follow the **Stable Dependency** rule: In `useEffect` hooks, especially those fetching data, ensure all referenced functions are wrapped in `useCallback`.
- **Fatal Error:** Changing the size or order of a dependency array between renders (e.g., during live-reload) will crash the application. Maintain a constant array structure.
- **State Synchronization:** Avoid using `useEffect` to synchronize or reset internal component state based on prop changes. Instead, use a unique `key` (e.g., `panelId + gender`) to force a clean remount, which is more performant and prevents cascading renders.

## 6. Known Bugs & Gotchas

- **PDF Generation Freeze:** Large canvas captures can lock the renderer. Use `setTimeout` yielding and explicit "Generating..." UI states.
- **Process Lifecycle:** Changes to `main.cjs` or `database.mjs` **require a full application restart** (`npm run dev`). Native Electron hot-reloading only applies to the renderer process.
- **Tailwind v4 Canvas Bug:** `html2canvas` cannot read OKLCH. Always run `resolveStylesToInline` utility before PDF capture.

## 7. Local Development

1. **Initial Setup:** `npm install`
2. **Start Dev Server:** `npm run dev` (Starts Vite and then Electron).
3. **Build:** `npm run build`
