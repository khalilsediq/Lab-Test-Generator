import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ── oklch → rgb resolver ────────────────────────────────────────────────────
// html2canvas (v1.4.x) cannot parse oklch/oklab color functions from Tailwind v4.
//
// HOW IT WORKS:
//   The browser's 2D Canvas API CAN resolve oklch to actual RGB pixel values.
//   We set fillStyle = oklch string, then read the pixel — that gives the real RGB.
//   This is the only reliable deterministic approach (no regex guessing).
//
const _colorCache = new Map();
const _resolverCanvas = document.createElement("canvas");
_resolverCanvas.width = 1;
_resolverCanvas.height = 1;
const _resolverCtx = _resolverCanvas.getContext("2d", {
  willReadFrequently: true,
});

function resolveColorToRgb(rawValue) {
  if (
    !rawValue ||
    (!rawValue.includes("oklch") && !rawValue.includes("oklab"))
  ) {
    return rawValue;
  }
  if (_colorCache.has(rawValue)) return _colorCache.get(rawValue);

  try {
    _resolverCtx.clearRect(0, 0, 1, 1);
    _resolverCtx.fillStyle = rawValue; // browser resolves oklch internally
    _resolverCtx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = _resolverCtx.getImageData(0, 0, 1, 1).data;
    const resolved =
      a < 255
        ? `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`
        : `rgb(${r},${g},${b})`;
    _colorCache.set(rawValue, resolved);
    return resolved;
  } catch {
    // If canvas fails (e.g. in a node env), fall back to transparent
    return "transparent";
  }
}

const COLOR_PROPS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
];

function stripOklchFromStyleTags(doc) {
  // We can't modify CSSStyleSheet rules directly (CORS), but we can rewrite
  // the innerHTML of <style> elements we own (Tailwind injects these).
  for (const style of doc.querySelectorAll("style")) {
    if (style.innerHTML && /ok(?:lch|lab)/.test(style.innerHTML)) {
      // Replace each oklch(...) token with a canvas-resolved equivalent
      style.innerHTML = style.innerHTML.replace(
        /ok(?:lch|lab)\([^)]+\)/g,
        (match) => resolveColorToRgb(match),
      );
    }
  }
}

function inlineComputedColors(rootElement) {
  // After style-tag stripping, inline every element's computed color props
  // so html2canvas never has to parse oklch at all.
  for (const el of rootElement.querySelectorAll("*")) {
    const computed = window.getComputedStyle(el);
    const patch = {};
    for (const prop of COLOR_PROPS) {
      const val = computed[prop];
      if (val && (val.includes("oklch") || val.includes("oklab"))) {
        patch[prop] = resolveColorToRgb(val);
      }
    }
    for (const [prop, val] of Object.entries(patch)) {
      el.style[prop] = val;
    }
  }
}

// ── page size lookup ──────────────────────────────────────────────────────────
export const PAGE_SIZES = {
  a4: { width: 210, height: 297, label: "A4" },
  a5: { width: 148, height: 210, label: "A5" },
  letter: { width: 215.9, height: 279.4, label: "Letter" },
  legal: { width: 215.9, height: 355.6, label: "Legal" },
  custom: { width: 210, height: 297, label: "Custom Size" },
};

export function getPageSizeString({
  format,
  orientation,
  customWidth,
  customHeight,
}) {
  if (format === "custom")
    return `${customWidth}mm ${customHeight}mm ${orientation}`;
  return `${format} ${orientation}`;
}

// ── main export ───────────────────────────────────────────────────────────────
/**
 * Captures sourceElement as a multi-page PDF with correct colors.
 *
 * @param {HTMLElement} sourceElement  Live DOM node (the actual visible rendered element)
 * @param {object}      options
 *   filename        string   default 'report.pdf'
 *   format          string   'a4'|'a5'|'letter'|'legal'|'custom'
 *   orientation     string   'portrait'|'landscape'
 *   customWidth     number   mm — used when format === 'custom'
 *   customHeight    number   mm — used when format === 'custom'
 *   margins         number[] [top, right, bottom, left] in mm
 */
export async function generatePDF(sourceElement, options = {}) {
  const {
    filename = "report.pdf",
    format = "a4",
    orientation = "portrait",
    customWidth = 210,
    customHeight = 297,
    margins = [10, 10, 10, 10],
  } = options;

  // ── STEP A: Create an isolated fixed clone container ──────────────────────
  // position:fixed keeps the element in normal layout flow so Tailwind resolves.
  // opacity:0 + pointer-events:none makes it invisible & non-interactive.
  // DO NOT use top:-9999px — Chromium stops painting elements outside the viewport.
  const mmToPx = (mm) => (mm * 96) / 25.4;
  const sizes = PAGE_SIZES[format] || PAGE_SIZES.a4;
  const widthMm = format === "custom" ? customWidth : sizes.width;
  const widthPx = Math.round(mmToPx(widthMm));

  const container = document.createElement("div");
  container.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    `width:${widthPx}px`,
    "min-height:10px",
    "z-index:-99999",
    "opacity:0",
    "pointer-events:none",
    "background:white",
    "overflow:visible",
  ].join(";");

  //  ── Clone the live report element ────────────────────────────────────────
  //  We clone the INNER element (the actual A4 report div), not its scale-wrapper.
  //  The scale-wrapper in ReportPreview has CSS transform:scale() which distorts
  //  dimensions — we want the true natural-size report.
  //
  //  sourceElement is the wrapper div from reportRef. Its first (and only) child
  //  is the ReportTemplate root div.
  const innerEl = sourceElement.firstElementChild || sourceElement;
  const clone = innerEl.cloneNode(true);

  // Override any leftover transform/scale on the clone itself
  clone.style.cssText = [
    `width:${widthPx}px`,
    "transform:none",
    "zoom:1",
    "background:white",
    "display:block",
    "margin:0",
    "padding:10mm",
    "box-sizing:border-box",
  ].join(";");
  clone.classList.remove("hidden");

  container.appendChild(clone);
  document.body.appendChild(container);

  // ── STEP B: Wait for the browser to lay out and paint the clone ───────────
  // Two rAF frames guarantee one full layout + paint cycle.
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r)),
  );

  // ── STEP C: Resolve oklch BEFORE html2canvas reads the DOM ────────────────
  // html2canvas parses CSS from <style> tags first, then reads element styles.
  // We must fix both BEFORE calling html2canvas.
  stripOklchFromStyleTags(document); // live document's <style> tags
  inlineComputedColors(clone); // elements inside our clone

  // ── STEP D: Capture ───────────────────────────────────────────────────────
  const captureW = clone.offsetWidth || widthPx;
  const captureH = clone.scrollHeight || clone.offsetHeight || 1123;

  let canvas;
  try {
    canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: captureW,
      height: captureH,
      windowWidth: captureW,
      windowHeight: captureH,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc, clonedEl) => {
        // Second-pass: fix any oklch that slipped through into the internal clone
        stripOklchFromStyleTags(clonedDoc);
        inlineComputedColors(clonedEl);
      },
    });
  } finally {
    if (container.parentNode) container.parentNode.removeChild(container);
  }

  // ── STEP E: Sanity check ──────────────────────────────────────────────────
  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error(
      `Canvas captured zero dimensions (${canvas.width}×${canvas.height}). ` +
        "The report element may not have a measurable size.",
    );
  }

  // ── STEP F: Assemble PDF with per-page canvas slices ─────────────────────
  const pdfFormat = format === "custom" ? [customWidth, customHeight] : format;
  const pdf = new jsPDF({ orientation, unit: "mm", format: pdfFormat });

  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const [mTop, mRight, mBottom, mLeft] = margins;
  const usableW = pdfW - mLeft - mRight;
  const usableH = pdfH - mTop - mBottom;

  const imgAspect = canvas.height / canvas.width;
  const renderedW = usableW;
  const renderedH = renderedW * imgAspect; // total rendered mm height
  const totalPages = Math.max(1, Math.ceil(renderedH / usableH));

  let currentPage = 1;
  let yRenderedSoFar = 0;

  while (yRenderedSoFar < renderedH) {
    const sliceH = Math.min(usableH, renderedH - yRenderedSoFar);

    // Slice the full canvas vertically for this page
    const srcY = Math.round((yRenderedSoFar / renderedH) * canvas.height);
    const srcH = Math.round((sliceH / renderedH) * canvas.height);

    if (srcH > 0) {
      const pg = document.createElement("canvas");
      pg.width = canvas.width;
      pg.height = srcH;
      pg.getContext("2d").drawImage(
        canvas,
        0,
        srcY,
        canvas.width,
        srcH,
        0,
        0,
        canvas.width,
        srcH,
      );

      pdf.addImage(
        pg.toDataURL("image/jpeg", 0.95),
        "JPEG",
        mLeft,
        mTop,
        renderedW,
        sliceH,
      );
    }

    // Page number in footer area
    pdf.setFontSize(8);
    pdf.setTextColor(140);
    pdf.text(
      `Page ${currentPage} of ${totalPages}`,
      pdfW - mRight - 2,
      pdfH - mBottom / 2,
      { align: "right" },
    );
    pdf.setTextColor(0);

    yRenderedSoFar += sliceH;
    if (yRenderedSoFar < renderedH) {
      pdf.addPage();
      currentPage++;
    }
  }

  // ── STEP G: Download via blob URL (works in both browser and Electron) ────
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}
