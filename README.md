# Lab Test Generator

**Lab Test Generator** is a robust, desktop-class React application explicitly designed for medical laboratories to record patient details, input test parameters, preview, and generate high-quality PDF reports.

## 🚀 Tech Stack

- **Frontend Framework:** React 18 + Vite (for lightning-fast HMR and building)
- **Styling:** Tailwind CSS (fully responsive, modern UI, and custom print rules)
- **PDF Generation:** `html2pdf.js` (client-side rendering to PDF with pixel-perfect A4 dimension mapping)
- **Routing / State:** Pure React Hooks (`useState`, `useEffect`) and lifting state up for a centralized source of truth.

---

## 🏗️ Architecture & Component Overview

The application features a modular structure mapping to specific functional areas:

- **`App.jsx`**: The central orchestrator. It manages the global state:
  - `patientDetails`: Demographics, registration dates, MR Numbers, etc.
  - `testData`: The dynamically built results mapping parameter IDs to values.
  - `paramOrders` & `editedParams` & `editedRanges`: User-customized overrides for ranges and parameter sorting.
  - `additionalPanels`: Enables the **Multi-Test Composition** feature, stacking multiple tests onto a single report.
- **`Sidebar.jsx`**: A mobile-responsive navigation drawer. Contains categories and renders the `TestList` for selecting the primary panel.
- **`TestFields.jsx`**: A complex, interactive component that displays all parameters for the currently selected tests (including additional panels). It conditionally handles sorting orders and drag-and-drop.
- **`BloodBankFields.jsx`**: A dedicated form component specifically for "Blood Grouping & Cross Matching". It leverages specialized parameter types like `qualitative_select` and `text_remark`.
- **`ReportPreview.jsx`**: Handles the preview modal. Invokes `html2pdf.js` to trigger a final PDF render of the data.
- **`ReportTemplate.jsx` & `BloodBankReportSection.jsx`**: Print-optimized (A4 dimension) layout components. These contain highly-specific Tailwind `print:` classes to ensure that backgrounds, borders, and margins map perfectly onto physical paper.

---

## 🔄 Data Flow

1.  **State Initialization:** Standard panels are loaded from `testTemplates.json`. Custom panels are merged from `localStorage`.
2.  **User Input:** As the user fills out `PatientForm` or `TestFields`, state is continuously pushed back up to `App.jsx` via `setTestData` or `setPatientDetails`.
3.  **Overrides:** Users can drag-and-drop parameters to reorder them or temporarily overwrite a parameter's name/reference range. These localized overrides are stored in Maps in `App.jsx`.
4.  **Composition:** Clicking "Add Another Test" pushes a new panel ID into the `additionalPanels` array.
5.  **Report Generation:** When "Generate Report" is clicked, all active panels (primary + additional) and the unified `testData` dictionary are passed down to `ReportTemplate.jsx`. The template aggressively filters empty panels and loops through them to generate stacked result sections on the A4 page.

---

## 🩸 Blood Bank Module Integration

The **Blood Bank Module** operates as an intelligent branch within the main application flow.

When a custom panel is assigned the category `"Blood Bank"`, or if `isBloodBank` evaluates to true:

1.  **Form Entry (`BloodBankFields.jsx`):** Instead of standard numerical inputs, the application renders dynamic blood group selectors, specialized text-areas for Rh factors and Cross-Match remarks, and visual subheadings.
2.  **Report Layout (`BloodBankReportSection.jsx`):** Automatically bypasses the standard tabular (Test | Result | Ref Range) layout. Instead, it renders a specialized two-column, key-value aesthetic suitable for critical qualitative remarks typical in pre-transfusion reports.

---

## 🛠️ Custom Panel Creation

Users are not limited to the predefined tests. The `CustomTestModal.jsx` allows the creation of personalized tests.

- It supports traditional `numeric` values.
- It introduces **qualitative selectors** (`qualitative_select`), **multi-line text** (`text_remark`), and purely decorative **subheadings** (`subheading`).
- Created panels are saved in `localStorage` under `customTestPanels` and instantly injected into the active sidebar session.

---

## 💻 Running Locally

To get the application running on your local machine:

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd Lab-Test-Generator
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or yarn install
    ```

3.  **Start the development server:**

    ```bash
    npm run dev
    # or yarn dev
    ```

    _The console will provide a localized URL (typically `http://localhost:5173`) to view the application in your browser._

4.  **Build for Production:**
    ```bash
    npm run build
    ```
    _This generates optimized, minified static files in the `/dist` directory, ready to be deployed to any static host._
