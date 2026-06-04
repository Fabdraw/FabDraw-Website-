import { jsPDF } from 'jspdf';
import type { Piece, TitleBlock } from '../types';
import { MATERIALS } from './materials';
import { calcWeight, formatWeight, totalWeight } from './weights';

function inchesToFtIn(inches: number): string {
  const ft = Math.floor(inches / 12);
  const rem = (inches % 12).toFixed(4).replace(/\.?0+$/, '');
  if (ft === 0) return `${rem}"`;
  if (parseFloat(rem) === 0) return `${ft}'`;
  return `${ft}' ${rem}"`;
}

export function exportPDF(
  pieces: Piece[],
  titleBlock: TitleBlock,
  projectName: string
): string {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'tabloid' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // === PAGE 1: DRAWING ===
  // Dark background
  doc.setFillColor(18, 21, 30);
  doc.rect(0, 0, W, H, 'F');

  // Grid lines
  doc.setDrawColor(30, 40, 60);
  doc.setLineWidth(0.5);
  const gridSpacing = 36;
  for (let x = 0; x < W; x += gridSpacing) {
    doc.line(x, 0, x, H);
  }
  for (let y = 0; y < H; y += gridSpacing) {
    doc.line(0, y, W, y);
  }

  // Border
  doc.setDrawColor(201, 64, 16);
  doc.setLineWidth(2);
  doc.rect(20, 20, W - 40, H - 40);

  // Inner border
  doc.setDrawColor(60, 80, 100);
  doc.setLineWidth(0.5);
  doc.rect(24, 24, W - 48, H - 48);

  // Title block area (bottom)
  const tbH = 100;
  const tbY = H - 20 - tbH;
  doc.setFillColor(12, 16, 28);
  doc.rect(20, tbY, W - 40, tbH, 'F');
  doc.setDrawColor(201, 64, 16);
  doc.setLineWidth(1);
  doc.line(20, tbY, W - 20, tbY);

  // Title block content
  const colW = (W - 40) / 6;

  // Company info
  doc.setTextColor(201, 64, 16);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(titleBlock.company, 30, tbY + 18);

  doc.setTextColor(180, 190, 210);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(titleBlock.address, 30, tbY + 30);
  doc.text(titleBlock.phone, 30, tbY + 41);
  doc.text(titleBlock.web, 30, tbY + 52);

  // Project info
  const pCol = 20 + colW * 1.5;
  doc.setDrawColor(50, 65, 90);
  doc.line(pCol, tbY, pCol, tbY + tbH);

  doc.setTextColor(120, 140, 170);
  doc.setFontSize(7);
  doc.text('PROJECT', pCol + 8, tbY + 14);
  doc.setTextColor(220, 230, 245);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(titleBlock.project.substring(0, 35), pCol + 8, tbY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  doc.text(titleBlock.description.substring(0, 50), pCol + 8, tbY + 38);

  // Drawn by / checked
  const dCol = 20 + colW * 3.2;
  doc.line(dCol, tbY, dCol, tbY + tbH);
  doc.setTextColor(120, 140, 170);
  doc.setFontSize(7);
  doc.text('DRAWN BY', dCol + 8, tbY + 14);
  doc.setTextColor(220, 230, 245);
  doc.setFontSize(9);
  doc.text(titleBlock.drawnBy || '—', dCol + 8, tbY + 26);

  doc.setTextColor(120, 140, 170);
  doc.setFontSize(7);
  doc.text('CHECKED BY', dCol + 8, tbY + 42);
  doc.setTextColor(220, 230, 245);
  doc.setFontSize(9);
  doc.text(titleBlock.checkedBy || '—', dCol + 8, tbY + 54);

  // Date / Scale
  const sCol = 20 + colW * 4.2;
  doc.line(sCol, tbY, sCol, tbY + tbH);
  doc.setTextColor(120, 140, 170);
  doc.setFontSize(7);
  doc.text('DATE', sCol + 8, tbY + 14);
  doc.setTextColor(220, 230, 245);
  doc.setFontSize(9);
  doc.text(titleBlock.date, sCol + 8, tbY + 26);

  doc.setTextColor(120, 140, 170);
  doc.setFontSize(7);
  doc.text('SCALE', sCol + 8, tbY + 42);
  doc.setTextColor(220, 230, 245);
  doc.setFontSize(9);
  doc.text(titleBlock.scale, sCol + 8, tbY + 54);

  // DWG No / Rev
  const rCol = 20 + colW * 5.1;
  doc.line(rCol, tbY, rCol, tbY + tbH);
  doc.setTextColor(120, 140, 170);
  doc.setFontSize(7);
  doc.text('DWG NO', rCol + 8, tbY + 14);
  doc.setTextColor(220, 230, 245);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(titleBlock.dwgNo, rCol + 8, tbY + 26);

  doc.setTextColor(120, 140, 170);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('REV', rCol + 8, tbY + 42);
  doc.setTextColor(201, 64, 16);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(titleBlock.revision, rCol + 8, tbY + 56);

  // Drawing title
  doc.setTextColor(201, 64, 16);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(projectName, 30, 55);

  doc.setTextColor(100, 120, 150);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('FABRICATION DRAWING', 30, 68);

  // Render pieces on canvas area
  const drawArea = { x: 30, y: 85, w: W - 60, h: tbY - 100 };

  if (pieces.length > 0) {
    // Find bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pieces) {
      const hw = p.length / 2;
      const hh = p.height / 2;
      const rad = (p.angle * Math.PI) / 180;
      const corners = [
        { x: p.x - hw * Math.cos(rad), y: p.y - hw * Math.sin(rad) },
        { x: p.x + hw * Math.cos(rad), y: p.y + hw * Math.sin(rad) },
      ];
      for (const c of corners) {
        minX = Math.min(minX, c.x);
        minY = Math.min(minY, c.y);
        maxX = Math.max(maxX, c.x);
        maxY = Math.max(maxY, c.y);
      }
    }

    const pad = 2;
    const bw = maxX - minX + pad * 2;
    const bh = maxY - minY + pad * 2;

    const scaleX = drawArea.w / (bw || 1);
    const scaleY = drawArea.h / (bh || 1);
    const scale = Math.min(scaleX, scaleY, 10);

    const offX = drawArea.x + (drawArea.w - bw * scale) / 2 - (minX - pad) * scale;
    const offY = drawArea.y + (drawArea.h - bh * scale) / 2 - (minY - pad) * scale;

    for (const piece of pieces) {
      const mat = MATERIALS[piece.type];
      const [r, g, b] = hexToRgb(mat.color);

      const rad = (piece.angle * Math.PI) / 180;
      const cx = piece.x * scale + offX;
      const cy = piece.y * scale + offY;
      const len = piece.length * scale;
      const vizH = Math.max((piece.height || piece.width) * scale, 3);

      doc.saveGraphicsState();

      // Translate & rotate
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // Draw rectangle via polygon
      const hw = len / 2;
      const hh = vizH / 2;

      const pts = [
        { x: cx - cos * hw + sin * hh, y: cy - sin * hw - cos * hh },
        { x: cx + cos * hw + sin * hh, y: cy + sin * hw - cos * hh },
        { x: cx + cos * hw - sin * hh, y: cy + sin * hw + cos * hh },
        { x: cx - cos * hw - sin * hh, y: cy - sin * hw + cos * hh },
      ];

      // Fill
      doc.setFillColor(r * 0.3, g * 0.3, b * 0.3);
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(1);

      // Draw polygon
      (doc as any).lines(
        pts.slice(1).map((p2, i) => {
          const prev = pts[i];
          return [p2.x - prev.x, p2.y - prev.y];
        }),
        pts[0].x, pts[0].y,
        [1, 1],
        'FD',
        true
      );

      // Label
      doc.setTextColor(220, 230, 245);
      doc.setFontSize(Math.max(5, Math.min(8, vizH * 0.8)));
      doc.setFont('helvetica', 'normal');
      const label = `${mat.label} ${inchesToFtIn(piece.length)}`;
      doc.text(label, cx, cy, { align: 'center', baseline: 'middle', angle: -(piece.angle) });

      doc.restoreGraphicsState();

      // Holes
      for (const hole of piece.holes) {
        const t = hole.fromStart / piece.length;
        const hx = (piece.x - cos * (piece.length / 2) + cos * piece.length * t) * scale + offX;
        const hy = (piece.y - sin * (piece.length / 2) + sin * piece.length * t) * scale + offY;
        const hr = Math.max(1.5, (hole.diameter / 2) * scale);
        doc.setFillColor(18, 21, 30);
        doc.setDrawColor(220, 200, 100);
        doc.setLineWidth(0.5);
        doc.circle(hx, hy, hr, 'FD');
      }
    }
  } else {
    doc.setTextColor(60, 80, 100);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('No pieces added yet', W / 2, (drawArea.y + drawArea.h) / 2, { align: 'center' });
  }

  // === PAGE 2: BOM ===
  doc.addPage('tabloid', 'landscape');

  doc.setFillColor(18, 21, 30);
  doc.rect(0, 0, W, H, 'F');

  doc.setDrawColor(201, 64, 16);
  doc.setLineWidth(2);
  doc.rect(20, 20, W - 40, H - 40);

  // BOM header
  doc.setFillColor(25, 30, 50);
  doc.rect(20, 20, W - 40, 50, 'F');
  doc.setDrawColor(201, 64, 16);
  doc.setLineWidth(0.5);
  doc.line(20, 70, W - 20, 70);

  doc.setTextColor(201, 64, 16);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL OF MATERIALS', 30, 50);

  doc.setTextColor(140, 160, 190);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${projectName}  |  ${titleBlock.dwgNo}  Rev ${titleBlock.revision}  |  Date: ${titleBlock.date}`, 30, 63);

  // Total weight
  const tw = totalWeight(pieces);
  doc.setTextColor(220, 180, 100);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Weight: ${formatWeight(tw)}`, W - 30, 50, { align: 'right' });
  doc.setTextColor(140, 160, 190);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${pieces.length} piece${pieces.length !== 1 ? 's' : ''}`, W - 30, 63, { align: 'right' });

  // Table headers
  const cols = [
    { label: '#', w: 30 },
    { label: 'TYPE', w: 90 },
    { label: 'GRADE', w: 80 },
    { label: 'SIZE (W×H)', w: 90 },
    { label: 'WALL', w: 60 },
    { label: 'LENGTH', w: 90 },
    { label: 'ANGLE', w: 55 },
    { label: 'HOLES', w: 50 },
    { label: 'WEIGHT', w: 80 },
    { label: 'NOTES', w: 0 }, // fills remaining
  ];

  // Calculate remaining width for notes
  const fixedW = cols.slice(0, -1).reduce((s, c) => s + c.w, 0);
  cols[cols.length - 1].w = W - 40 - fixedW - 20;

  const rowH = 24;
  const tableY = 82;

  // Draw header row
  doc.setFillColor(30, 40, 65);
  doc.rect(20, tableY, W - 40, rowH, 'F');

  let cx = 30;
  for (const col of cols) {
    doc.setTextColor(201, 64, 16);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(col.label, cx, tableY + 15);
    cx += col.w;
  }

  // Draw dividers
  cx = 30;
  doc.setDrawColor(50, 65, 90);
  doc.setLineWidth(0.5);
  for (const col of cols.slice(0, -1)) {
    cx += col.w;
    doc.line(cx - 5, tableY, cx - 5, H - 30);
  }

  // Rows
  pieces.forEach((piece, i) => {
    const ry = tableY + rowH + i * rowH;
    if (ry + rowH > H - 30) return; // skip if overflow

    if (i % 2 === 0) {
      doc.setFillColor(20, 25, 40);
      doc.rect(20, ry, W - 40, rowH, 'F');
    }

    // Bottom line
    doc.setDrawColor(35, 45, 70);
    doc.setLineWidth(0.3);
    doc.line(20, ry + rowH, W - 20, ry + rowH);

    const mat = MATERIALS[piece.type];
    const [r, g, b] = hexToRgb(mat.color);
    const weight = calcWeight(piece);

    const values = [
      `${i + 1}`,
      mat.label,
      piece.grade.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      `${piece.width}" × ${piece.height}"`,
      `${piece.wall}"`,
      inchesToFtIn(piece.length),
      `${piece.angle}°`,
      `${piece.holes.length}`,
      formatWeight(weight),
      piece.notes.substring(0, 40),
    ];

    let vx = 30;
    values.forEach((val, vi) => {
      doc.setTextColor(vi === 1 ? r : vi === 8 ? 220 : 200, vi === 1 ? g : vi === 8 ? 180 : 210, vi === 1 ? b : vi === 8 ? 100 : 230);
      doc.setFontSize(8);
      doc.setFont('helvetica', vi === 0 ? 'bold' : 'normal');
      doc.text(val, vx, ry + 15);
      vx += cols[vi].w;
    });
  });

  // Footer
  doc.setTextColor(60, 80, 100);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated by FabDraw  •  ${new Date().toLocaleString()}`, W / 2, H - 10, { align: 'center' });

  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [150, 150, 150];
}
