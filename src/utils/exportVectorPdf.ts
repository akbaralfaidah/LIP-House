import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import { STATUS_CONFIG, STATUS_ORDER } from '../constants/statuses';
import type { SiteplanProject } from '../types/siteplan';
import { formatDateTimeID, formatPercent } from './formatters';
import { computeUnitsStats } from './stats';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Prepares a clean cloned SVG node with explicit pixel dimensions and PDF-safe fonts
 * so svg2pdf.js writes 100% crisp native vector paths & text into the PDF (zero rasterization).
 */
function prepareSvgForPdf(sourceSvg: SVGSVGElement, width: number, height: number): SVGSVGElement {
  const clone = sourceSvg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  clone.removeAttribute('class');

  const texts = clone.querySelectorAll('text');
  texts.forEach((t) => {
    // Normalize CSS variable fonts & numeric weights (600/700/800) to PDF-native Helvetica bold/normal
    t.style.fontFamily = 'helvetica';
    t.setAttribute('font-family', 'helvetica');
    const rawWeight = Number(t.getAttribute('font-weight') || '400');
    const pdfWeight = rawWeight >= 600 || t.getAttribute('font-weight') === 'bold' ? 'bold' : 'normal';
    t.setAttribute('font-weight', pdfWeight);
    t.style.fontWeight = pdfWeight;
  });

  return clone;
}

export async function generateVectorSiteplanPdfBlob(params: {
  projects: SiteplanProject[];
  svgByProjectId: Record<string, SVGSVGElement | null>;
  printedAtIso: string;
}): Promise<{ blob: Blob; fileName: string }> {
  const { projects, svgByProjectId, printedAtIso } = params;

  // A4 Landscape: 297mm x 210mm, 10mm margins -> printable width 277mm, height 190mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageW = 297;
  const margin = 10;
  const contentW = pageW - margin * 2; // 277mm

  for (let idx = 0; idx < projects.length; idx++) {
    const project = projects[idx];
    const stats = computeUnitsStats(project.units);

    if (idx > 0) {
      doc.addPage('a4', 'landscape');
    }

    // --- 1. PAGE HEADER (y: 10..24mm) ---
    // Brand 4-square emblem (8.5mm x 8.5mm)
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, 10.5, 8.5, 8.5, 1.5, 1.5, 'F');
    const sqs: Array<{ dx: number; dy: number; hex: string }> = [
      { dx: 1.4, dy: 1.4, hex: '#4E8C5F' },
      { dx: 4.6, dy: 1.4, hex: '#CC733C' },
      { dx: 1.4, dy: 4.6, hex: '#30548E' },
      { dx: 4.6, dy: 4.6, hex: '#E2E8F0' },
    ];
    for (const sq of sqs) {
      const [r, g, b] = hexToRgb(sq.hex);
      doc.setFillColor(r, g, b);
      doc.roundedRect(margin + sq.dx, 10.5 + sq.dy, 2.5, 2.5, 0.4, 0.4, 'F');
    }

    // Title: LIP HOUSE | Project Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`LIP HOUSE  |  ${project.name}`, margin + 11, 14.5);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `${project.areaLabel}  ·  ${project.blocksSummary}  ·  Total ${stats.total} Kavling`,
      margin + 11,
      18.6
    );

    // Right page pill ("Halaman X dari 4")
    const pageBadge = `Halaman ${idx + 1} dari ${projects.length}`;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(pageW - margin - 34, 10.4, 34, 5.2, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(pageBadge, pageW - margin - 17, 13.9, { align: 'center' });

    // Printed live timestamp
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Dicetak Live: ${formatDateTimeID(printedAtIso)}`, pageW - margin, 19.2, {
      align: 'right',
    });

    // Header thick divider
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.55);
    doc.line(margin, 21.5, pageW - margin, 21.5);

    // --- 2. CENTER PURE-VECTOR SVG SITEPLAN (y: 23.5..168.5mm) ---
    const mapBoxY = 23.5;
    const mapBoxH = 144.5;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, mapBoxY, contentW, mapBoxH, 1.5, 1.5, 'FD');

    const sourceSvg = svgByProjectId[project.id];
    if (sourceSvg) {
      const clonedSvg = prepareSvgForPdf(
        sourceSvg,
        project.viewBox.width,
        project.viewBox.height
      );

      // Fit SVG aspect ratio (1120/680) neatly centered inside map box
      const innerPad = 2;
      const availW = contentW - innerPad * 2;
      const availH = mapBoxH - innerPad * 2;
      const svgAspect = project.viewBox.width / project.viewBox.height;

      let drawW = availW;
      let drawH = drawW / svgAspect;
      if (drawH > availH) {
        drawH = availH;
        drawW = drawH * svgAspect;
      }
      const drawX = margin + (contentW - drawW) / 2;
      const drawY = mapBoxY + (mapBoxH - drawH) / 2;

      await doc.svg(clonedSvg, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
      });
    }

    // --- 3. BOTTOM LEGEND + RECAP TABLE (y: 170.5..200mm) ---
    const footY = 171;
    const footH = 27.5;

    // Left: 6-Color Legend Card (112mm wide)
    const legendW = 112;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, footY, legendW, footH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(51, 65, 85);
    doc.text('LEGENDA 6 STATUS KAVLING', margin + 3.2, footY + 4.8);

    doc.setFontSize(6.6);
    doc.setTextColor(154, 76, 31);
    doc.text('Garis Putus = Belum Lock', margin + legendW - 3.2, footY + 4.8, {
      align: 'right',
    });

    STATUS_ORDER.forEach((statusKey, sIdx) => {
      const meta = STATUS_CONFIG[statusKey];
      const col = sIdx % 2;
      const row = Math.floor(sIdx / 2);
      const itemX = margin + 3.2 + col * 54.5;
      const itemY = footY + 8.5 + row * 6.2;

      const [r, g, b] = hexToRgb(meta.color);
      const [sr, sg, sb] = hexToRgb(meta.darkStroke);
      doc.setFillColor(r, g, b);
      doc.setDrawColor(sr, sg, sb);
      doc.setLineWidth(meta.isDashed ? 0.35 : 0.25);
      if (meta.isDashed) {
        doc.setLineDashPattern([1, 0.7], 0);
      } else {
        doc.setLineDashPattern([], 0);
      }
      doc.roundedRect(itemX, itemY, 3.6, 3.6, 0.5, 0.5, 'FD');
      doc.setLineDashPattern([], 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      const labelText = meta.subLabel ? `${meta.label} (${meta.subLabel})` : meta.label;
      doc.text(labelText, itemX + 5.2, itemY + 2.7);
    });

    // Right: Unit Recap Table (Count & Percentage, 161mm wide)
    const tableX = margin + legendW + 4;
    const tableW = contentW - legendW - 4; // 161mm
    const colWidths = [27, 19, 19, 19, 19, 22, 18, 18]; // sum = 161mm
    const rowH = footH / 3;

    // Header Row (#0F172A)
    doc.setFillColor(15, 23, 42);
    doc.rect(tableX, footY, tableW, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);

    const headers = [
      'Rekap Status',
      ...STATUS_ORDER.map((s) => STATUS_CONFIG[s].shortLabel),
      'Total',
    ];
    let curX = tableX;
    headers.forEach((h, cIdx) => {
      if (cIdx === 0) {
        doc.text(h, curX + 2.5, footY + rowH * 0.65);
      } else if (cIdx === headers.length - 1) {
        doc.text(h, curX + colWidths[cIdx] - 2.5, footY + rowH * 0.65, { align: 'right' });
      } else {
        doc.text(h, curX + colWidths[cIdx] / 2, footY + rowH * 0.65, { align: 'center' });
      }
      curX += colWidths[cIdx];
    });

    // Row 2: Jumlah Unit
    const row2Y = footY + rowH;
    doc.setFillColor(255, 255, 255);
    doc.rect(tableX, row2Y, tableW, rowH, 'F');
    doc.setTextColor(15, 23, 42);

    const countValues = [
      'Jumlah Unit',
      ...STATUS_ORDER.map((s) => String(stats.byStatus[s])),
      String(stats.total),
    ];
    curX = tableX;
    countValues.forEach((val, cIdx) => {
      doc.setFont('helvetica', cIdx === 0 ? 'bold' : 'bold');
      doc.setFontSize(7.5);
      if (cIdx === 0) {
        doc.setTextColor(51, 65, 85);
        doc.text(val, curX + 2.5, row2Y + rowH * 0.66);
      } else if (cIdx === countValues.length - 1) {
        doc.setTextColor(15, 23, 42);
        doc.text(val, curX + colWidths[cIdx] - 2.5, row2Y + rowH * 0.66, { align: 'right' });
      } else {
        doc.setTextColor(15, 23, 42);
        doc.text(val, curX + colWidths[cIdx] / 2, row2Y + rowH * 0.66, { align: 'center' });
      }
      curX += colWidths[cIdx];
    });

    // Row 3: Persentase
    const row3Y = footY + rowH * 2;
    doc.setFillColor(248, 250, 252);
    doc.rect(tableX, row3Y, tableW, rowH, 'F');

    const pctValues = [
      'Persentase',
      ...STATUS_ORDER.map((s) => formatPercent(stats.byStatus[s], stats.total)),
      '100%',
    ];
    curX = tableX;
    pctValues.forEach((val, cIdx) => {
      doc.setFont('helvetica', cIdx === 0 || cIdx === pctValues.length - 1 ? 'bold' : 'normal');
      doc.setFontSize(7.3);
      doc.setTextColor(51, 65, 85);
      if (cIdx === 0) {
        doc.text(val, curX + 2.5, row3Y + rowH * 0.66);
      } else if (cIdx === pctValues.length - 1) {
        doc.setTextColor(15, 23, 42);
        doc.text(val, curX + colWidths[cIdx] - 2.5, row3Y + rowH * 0.66, { align: 'right' });
      } else {
        doc.text(val, curX + colWidths[cIdx] / 2, row3Y + rowH * 0.66, { align: 'center' });
      }
      curX += colWidths[cIdx];
    });

    // Outer table crisp border & horizontal row dividers
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(tableX, footY, tableW, footH, 'S');
    doc.line(tableX, row2Y, tableX + tableW, row2Y);
    doc.line(tableX, row3Y, tableX + tableW, row3Y);
  }

  const stamp = new Date(printedAtIso);
  const datePart = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(
    stamp.getDate()
  ).padStart(2, '0')}`;
  const fileName =
    projects.length === 1
      ? `LIP-House-${projects[0].shortName.replace(/\s+/g, '-')}-${datePart}.pdf`
      : `LIP-House-Siteplan-4-Lokasi-${datePart}.pdf`;

  const blob = doc.output('blob');
  return { blob, fileName };
}

export function triggerPdfDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 15000);
}

export function canUseNativeFileShare(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  if (typeof navigator.canShare !== 'function') return false;
  try {
    const testFile = new File([''], 'test.pdf', { type: 'application/pdf' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

export async function sharePdfFile(blob: Blob, fileName: string): Promise<'shared' | 'cancelled' | 'fallback'> {
  try {
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: fileName,
        files: [file],
      });
      return 'shared';
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'cancelled';
    }
  }
  triggerPdfDownload(blob, fileName);
  return 'fallback';
}
