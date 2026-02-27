// restructure_json.mjs
// Reads the current testTemplates.json, merges gender-split rows,
// adds category + gender_applicable, writes the new file.

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, "../src/data/testTemplates.json");

const panels = JSON.parse(readFileSync(dataFile, "utf-8"));

// Category map for each panel
const categoryMap = {
  HEMATOLOGY: "Hematology",
  HB_ELECTRO: "Hematology",
  COAG: "Coagulation",
  GLUCOSE: "Biochemistry",
  RFT: "Biochemistry",
  ELECTROLYTES: "Biochemistry",
  LFT: "Liver Function",
  LIPID: "Lipids & Cardiac",
  CARDIAC: "Lipids & Cardiac",
  THYROID: "Endocrinology",
  IRON: "Iron Studies",
  SEROLOGY: "Serology & Infection",
  URINE_RE: "Urine & Fluid",
  SFA: "Urine & Fluid",
  MICRO: "Microbiology",
  VITAMINS: "Vitamins & Minerals",
  TUMOUR: "Tumour Markers",
};

// gender_applicable for panels whose parameters are only for one gender
const maleOnlyPanels = new Set(["SFA"]);

// Per-parameter gender_applicable overrides (for params inside mixed panels)
const paramGenderOverride = {
  TUM_PSA: "male",
  TUM_CA125: "female",
  SER_hCG: "female",
};

function mergeGenderSplit(params, panelId) {
  const seen = new Map(); // baseName -> merged param
  const order = [];

  for (const p of params) {
    // Strip _M or _F suffix to get base id
    const baseId = p.id.replace(/_M$/, "").replace(/_F$/, "");
    const isMale = p.id.endsWith("_M");
    const isFemale = p.id.endsWith("_F");
    const hasSuffix = isMale || isFemale;

    if (!hasSuffix) {
      // Plain param — determine gender_applicable
      const ga =
        paramGenderOverride[p.id] ||
        (maleOnlyPanels.has(panelId) ? "male" : "all");

      // Build unified reference_range if old format
      let rr = p.reference_range;
      if (rr && !("male_min" in rr)) {
        // Old format: { min, max }
        rr = {
          general: null,
          male_min: rr.min ?? null,
          male_max: rr.max ?? null,
          female_min: rr.min ?? null,
          female_max: rr.max ?? null,
        };
      }

      seen.set(baseId, {
        id: p.id,
        name: p.name,
        abbreviation: p.abbreviation,
        unit: p.unit,
        gender_applicable: ga,
        reference_range: rr,
      });
      order.push(baseId);
    } else {
      // Gender-split param
      const rr = p.reference_range; // { min, max }
      const min = rr?.min ?? null;
      const max = rr?.max ?? null;

      if (!seen.has(baseId)) {
        seen.set(baseId, {
          id: baseId,
          name: p.name,
          abbreviation: p.abbreviation,
          unit: p.unit,
          gender_applicable: "all",
          reference_range: {
            general: null,
            male_min: null,
            male_max: null,
            female_min: null,
            female_max: null,
          },
        });
        order.push(baseId);
      }

      const entry = seen.get(baseId);
      if (isMale) {
        entry.reference_range.male_min = min;
        entry.reference_range.male_max = max;
      } else {
        entry.reference_range.female_min = min;
        entry.reference_range.female_max = max;
      }
    }
  }

  // Return in original order
  return order.map((id) => seen.get(id));
}

// Generate a sensible general label for quantitative params
function addGeneralLabel(param) {
  const rr = param.reference_range;
  if (rr.general) return; // already set

  const maleEq = rr.male_min === rr.female_min && rr.male_max === rr.female_max;

  if (maleEq) {
    if (rr.male_min !== null && rr.male_max !== null)
      rr.general = `${rr.male_min} – ${rr.male_max}`;
    else if (rr.male_min !== null) rr.general = `≥ ${rr.male_min}`;
    else if (rr.male_max !== null) rr.general = `< ${rr.male_max}`;
  } else {
    const mPart =
      rr.male_min !== null && rr.male_max !== null
        ? `M: ${rr.male_min}–${rr.male_max}`
        : rr.male_min !== null
          ? `M: ≥${rr.male_min}`
          : rr.male_max !== null
            ? `M: <${rr.male_max}`
            : null;
    const fPart =
      rr.female_min !== null && rr.female_max !== null
        ? `F: ${rr.female_min}–${rr.female_max}`
        : rr.female_min !== null
          ? `F: ≥${rr.female_min}`
          : rr.female_max !== null
            ? `F: <${rr.female_max}`
            : null;
    if (mPart && fPart) rr.general = `${mPart} | ${fPart}`;
    else if (mPart) rr.general = mPart;
    else if (fPart) rr.general = fPart;
  }
}

const output = panels.map((panel) => {
  const merged = mergeGenderSplit(panel.parameters, panel.panel_id);
  merged.forEach(addGeneralLabel);

  return {
    panel_id: panel.panel_id,
    panel_name: panel.panel_name,
    category: categoryMap[panel.panel_id] || "Other",
    description: panel.description,
    parameters: merged,
  };
});

writeFileSync(dataFile, JSON.stringify(output, null, 2), "utf-8");
console.log(`✅  Written ${output.length} panels to ${dataFile}`);
output.forEach((p) =>
  console.log(
    `   ${p.panel_id} (${p.category}): ${p.parameters.length} params`,
  ),
);
