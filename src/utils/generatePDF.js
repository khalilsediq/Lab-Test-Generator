import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ── oklch → rgb resolver ────────────────────────────────────────────────────
// html2canvas (v1.4.x) cannot parse oklch/oklab color functions (Tailwind v4).
// The Canvas 2D API CAN resolve oklch to actual RGB pixels.
// IMPORTANT: Only strip oklch from cloned documents (inside onclone),
// NEVER from the live document.

const _colorCache = new Map();
const _resolverCanvas = document.createElement("canvas");
_resolverCanvas.width = 1;
_resolverCanvas.height = 1;
const _resolverCtx = _resolverCanvas.getContext("2d", { willReadFrequently: true });

function resolveColorToRgb(rawValue) {
  if (!rawValue || (!rawValue.includes("oklch") && !rawValue.includes("oklab"))) {
    return rawValue;
  }
  if (_colorCache.has(rawValue)) return _colorCache.get(rawValue);
  try {
    _resolverCtx.clearRect(0, 0, 1, 1);
    _resolverCtx.fillStyle = rawValue;
    _resolverCtx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = _resolverCtx.getImageData(0, 0, 1, 1).data;
    const resolved = a < 255
      ? `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`
      : `rgb(${r},${g},${b})`;
    _colorCache.set(rawValue, resolved);
    return resolved;
  } catch {
    return "transparent";
  }
}

const COLOR_PROPS = [
  "color", "backgroundColor",
  "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
  "outlineColor", "textDecorationColor",
];

function stripOklchFromStyleTags(clonedDoc) {
  for (const style of clonedDoc.querySelectorAll("style")) {
    if (style.innerHTML && /ok(?:lch|lab)/.test(style.innerHTML)) {
      style.innerHTML = style.innerHTML.replace(
        /ok(?:lch|lab)\([^)]+\)/g,
        (match) => resolveColorToRgb(match),
      );
    }
  }
}

function inlineComputedColors(liveSource, clonedRoot) {
  const liveEls  = liveSource.querySelectorAll("*");
  const cloneEls = clonedRoot.querySelectorAll("*");
  const count    = Math.min(liveEls.length, cloneEls.length);
  for (let i = 0; i < count; i++) {
    const computed = window.getComputedStyle(liveEls[i]);
    for (const prop of COLOR_PROPS) {
      const val = computed[prop];
      if (val && (val.includes("oklch") || val.includes("oklab"))) {
        cloneEls[i].style[prop] = resolveColorToRgb(val);
      }
    }
  }
}

// ── page size lookup ──────────────────────────────────────────────────────────
export const PAGE_SIZES = {
  a4:     { width: 210,   height: 297,   label: "A4" },
  a5:     { width: 148,   height: 210,   label: "A5" },
  letter: { width: 215.9, height: 279.4, label: "Letter" },
  legal:  { width: 215.9, height: 355.6, label: "Legal" },
  custom: { width: 210,   height: 297,   label: "Custom Size" },
};

export function getPageSizeString({ format, orientation, customWidth, customHeight }) {
  if (format === "custom") return `${customWidth}mm ${customHeight}mm ${orientation}`;
  return `${format} ${orientation}`;
}

const mmToPx = (mm) => (mm * 96) / 25.4;

// ── shared capture helper ─────────────────────────────────────────────────────
async function captureToCanvas(liveEl, cloneEl, widthPx, heightPx) {
  return html2canvas(cloneEl, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    width: widthPx,
    height: heightPx,
    windowWidth: widthPx,
    windowHeight: heightPx,
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc, clonedEl) => {
      stripOklchFromStyleTags(clonedDoc);
      inlineComputedColors(cloneEl, clonedEl);
    },
  });
}

// ── make an off-screen fixed container ────────────────────────────────────────
function makeContainer(widthPx) {
  const c = document.createElement("div");
  c.style.cssText = [
    "position:fixed", "top:0", "left:0",
    `width:${widthPx}px`,
    "min-height:10px",
    "z-index:-99999",
    "opacity:0",
    "pointer-events:none",
    "background:white",
    "overflow:visible",
  ].join(";");
  return c;
}

// ── main export ─────────────────────────────────────────────────────────────
/**
 * @param {HTMLElement} sourceElement  reportWrapperRef.current
 *   (its firstElementChild is the A4 ReportTemplate root div)
 * @param {object} options
 */
export async function generatePDF(sourceElement, options = {}) {
  const {
    filename    = "report.pdf",
    format      = "a4",
    orientation = "portrait",
    customWidth  = 210,
    customHeight = 297,
    margins      = [10, 10, 10, 10],
  } = options;

  const sizes   = PAGE_SIZES[format] || PAGE_SIZES.a4;
  const widthMm = format === "custom" ? customWidth : sizes.width;
  const widthPx = Math.round(mmToPx(widthMm));

  // The A4 report root div (inside the wrapper)
  const innerEl = sourceElement.firstElementChild || sourceElement;

  // ── STEP A: Capture header ────────────────────────────────────────────────
  // Find the header zone element.
  const liveHeader = innerEl.querySelector("#report-header-zone");
  let headerCanvas   = null;
  let headerHeightMm = 0;
  let headerHeightPx = 0;

  if (liveHeader) {
    const hContainer = makeContainer(widthPx);
    const headerClone = liveHeader.cloneNode(true);
    headerClone.style.cssText = [
      `width:${widthPx}px`,
      "transform:none", "zoom:1",
      "background:white", "display:block", "visibility:visible",
    ].join(";");
    hContainer.appendChild(headerClone);
    document.body.appendChild(hContainer);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    inlineComputedColors(liveHeader, headerClone);

    const h = headerClone.scrollHeight || headerClone.offsetHeight || 10;
    try {
      headerCanvas = await captureToCanvas(liveHeader, headerClone, widthPx, h);
    } finally {
      hContainer.remove();
    }
    if (headerCanvas) {
      // headerCanvas.height is at scale:2, so real px = height/2
      headerHeightPx = headerCanvas.height / 2;
      headerHeightMm = (headerHeightPx / widthPx) * widthMm;
    }
  }

  // ── STEP B: Capture footer ────────────────────────────────────────────────
  const liveFooter = innerEl.querySelector(".report-footer");
  let footerCanvas   = null;
  let footerHeightMm = 0;
  let footerHeightPx = 0;

  if (liveFooter) {
    const fContainer = makeContainer(widthPx);
    const footerClone = liveFooter.cloneNode(true);
    footerClone.style.cssText = [
      `width:${widthPx}px`,
      "transform:none", "zoom:1",
      "background:white", "display:block",
      // Footer is now in-flow (not absolute), so no position override needed
    ].join(";");
    fContainer.appendChild(footerClone);
    document.body.appendChild(fContainer);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    inlineComputedColors(liveFooter, footerClone);

    const h = footerClone.scrollHeight || footerClone.offsetHeight || 10;
    try {
      footerCanvas = await captureToCanvas(liveFooter, footerClone, widthPx, h);
    } finally {
      fContainer.remove();
    }
    if (footerCanvas) {
      footerHeightPx = footerCanvas.height / 2;
      footerHeightMm = (footerHeightPx / widthPx) * widthMm;
    }
  }

  // ── STEP C: Capture body-only canvas ─────────────────────────────────────
  //
  // BUG 2 + BUG 4 FIX: The body clone is the FULL report div, which naturally
  // contains the header zone and footer inside it. If we capture it as-is and
  // also stamp header/footer separately, they appear TWICE.
  //
  // Fix: before capturing the body clone, HIDE the header zone and footer
  // elements inside the clone. This makes the body canvas contain ONLY
  // the content between them (patient info + test tables).
  //
  // BUG 3 FIX (ghost page): The report div has `pb-[250px]` padding to create
  // space for the absolute-positioned footer on screen. This extra ~66mm of
  // empty space makes the canvas taller than the real content, which pushes
  // the page count past 1 and creates a blank second page.
  // Fix: after hiding header/footer in the clone, also remove pb padding and
  // reset min-height, then measure the ACTUAL scroll height after layout.

  const container = makeContainer(widthPx);
  const clone     = innerEl.cloneNode(true);

  // Reset only the structural sizing — keep all other Tailwind classes intact
  clone.style.cssText = [
    `width:${widthPx}px`,
    "transform:none",
    "zoom:1",
    "background:white",
    "display:block",
    "margin:0",
    // Remove the pb-[250px] / min-height:[297mm] that would add ghost space
    "padding-bottom:0",
    "min-height:0",
  ].join(";");
  clone.classList.remove("hidden");

  // BUG 2+4 FIX: Hide the header zone (which includes the hr separator) inside
  // the clone so it doesn't appear in the body canvas (we stamp it separately).
  const cloneHeaderZone = clone.querySelector("#report-header-zone");
  if (cloneHeaderZone) {
    cloneHeaderZone.style.display = "none";
  }

  // BUG 2+4 FIX: Also hide the footer inside the clone.
  const cloneFooter = clone.querySelector(".report-footer");
  if (cloneFooter) {
    cloneFooter.style.display = "none";
  }

  container.appendChild(clone);
  document.body.appendChild(container);

  // Two rAF frames → full layout + paint with hidden elements
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  inlineComputedColors(innerEl, clone);

  // BUG 3 FIX: Use scrollHeight AFTER hiding header/footer and removing pb padding.
  // This gives us the true height of the body content only.
  const captureW = clone.offsetWidth  || widthPx;
  const captureH = Math.max(clone.scrollHeight, clone.offsetHeight, 10);

  let bodyCanvas;
  try {
    bodyCanvas = await html2canvas(clone, {
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
        stripOklchFromStyleTags(clonedDoc);
        inlineComputedColors(clone, clonedEl);
      },
    });
  } finally {
    container.remove();
  }

  if (bodyCanvas.width === 0 || bodyCanvas.height === 0) {
    throw new Error(`Canvas zero dimensions (${bodyCanvas.width}×${bodyCanvas.height}).`);
  }

  // ── STEP D: Assemble PDF ──────────────────────────────────────────────────
  const pdfFormat = format === "custom" ? [customWidth, customHeight] : format;
  const pdf = new jsPDF({ orientation, unit: "mm", format: pdfFormat });

  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const [mTop, mRight, mBottom, mLeft] = margins;

  const usableW = pdfW - mLeft - mRight;
  // Usable height for body slices = page minus margins minus header/footer stamps
  const usableH = pdfH - mTop - mBottom - headerHeightMm - footerHeightMm;

  // Body image total rendered height in mm
  const bodyAspect = bodyCanvas.height / bodyCanvas.width;
  const bodyW      = usableW;
  const bodyH      = bodyW * bodyAspect;

  // BUG 3 FIX: Only create additional pages when there is genuine remaining
  // content. We use a small epsilon (0.1mm) to avoid floating-point ghosts.
  const EPSILON       = 0.1;
  const totalPages    = Math.max(1, Math.ceil((bodyH - EPSILON) / usableH));

  let currentPage  = 1;
  let yBodySoFar   = 0;   // mm of body content rendered so far

  while (yBodySoFar < bodyH - EPSILON) {
    const sliceH = Math.min(usableH, bodyH - yBodySoFar);
    if (sliceH <= 0) break;

    // ── Stamp header ──────────────────────────────────────────────────────
    if (headerCanvas && headerHeightMm > 0) {
      pdf.addImage(
        headerCanvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        mLeft, mTop, usableW, headerHeightMm,
      );
    }

    // ── Stamp body slice ──────────────────────────────────────────────────
    const bodyTopOnPage = mTop + headerHeightMm;
    const srcY = Math.round((yBodySoFar / bodyH) * bodyCanvas.height);
    const srcH = Math.round((sliceH    / bodyH) * bodyCanvas.height);

    if (srcH > 0) {
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width  = bodyCanvas.width;
      sliceCanvas.height = srcH;
      sliceCanvas.getContext("2d").drawImage(
        bodyCanvas,
        0, srcY, bodyCanvas.width, srcH,
        0, 0,    bodyCanvas.width, srcH,
      );
      pdf.addImage(
        sliceCanvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        mLeft, bodyTopOnPage, usableW, sliceH,
      );
    }

    // ── Stamp footer ──────────────────────────────────────────────────────
    if (footerCanvas && footerHeightMm > 0) {
      const footerY = pdfH - mBottom - footerHeightMm;
      pdf.addImage(
        footerCanvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        mLeft, footerY, usableW, footerHeightMm,
      );
    }

    // ── Page number ───────────────────────────────────────────────────────
    pdf.setFontSize(7);
    pdf.setTextColor(150);
    pdf.text(
      `Page ${currentPage} of ${totalPages}`,
      pdfW - mRight - 1,
      pdfH - mBottom / 2,
      { align: "right" },
    );
    pdf.setTextColor(0);

    yBodySoFar += sliceH;

    // BUG 3 FIX: Only add a new page when there is genuine remaining content
    if (yBodySoFar < bodyH - EPSILON) {
      pdf.addPage();
      currentPage++;
    }
  }

  // ── STEP E: Download ──────────────────────────────────────────────────────
  const blob = pdf.output("blob");
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
}
