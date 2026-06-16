import { jsPDF } from 'jspdf';
import type { Member, TitleBlock, Dimension } from '../types';
import { MATERIALS } from './materials';
import { calcWeight, formatWeight, totalWeight } from './weights';
import { parseSizeString } from './materials';

function inchesToFtIn(inches: number): string {
  const ft = Math.floor(inches / 12);
  const rem = (inches % 12).toFixed(4).replace(/\.?0+$/, '');
  if (ft === 0) return `${rem}"`;
  if (parseFloat(rem) === 0) return `${ft}'`;
  return `${ft}' ${rem}"`;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [128, 128, 128];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

type ViewType = 'top' | 'front' | 'side' | 'isometric';

/** Project each member into 2D (px, py) for a given view */
function projectMember(m: Member, view: ViewType): { cx: number; cy: number; angle: number } {
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);
  const mx = m.position.x;
  const my = m.position.y;
  const mz = m.position.z ?? 0;

  switch (view) {
    case 'top':
      return { cx: mx, cy: my, angle: m.rotation.y };
    case 'front':
      return { cx: mx, cy: -mz, angle: 0 };
    case 'side':
      return { cx: my, cy: -mz, angle: 0 };
    case 'isometric': {
      const px2 = mx + my * cos30;
      const py2 = -mz - my * sin30 * 0.5;
      return { cx: px2, cy: py2, angle: 0 };
    }
  }
}

function drawViewInCell(
  doc: jsPDF,
  members: Member[],
  dimensions: Dimension[],
  view: ViewType,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  label: string,
) {
  const pad = 10;
  const drawArea = { x: cellX + pad, y: cellY + 18 + pad, w: cellW - pad * 2, h: cellH - 18 - pad * 2 };

  // Label
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(label, cellX + pad, cellY + 14);

  if (members.length === 0) {
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(10);
    doc.text('No members', cellX + cellW / 2, cellY + cellH / 2, { align: 'center' });
    return;
  }

  // Compute projected bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const m of members) {
    const { cx, cy } = projectMember(m, view);
    const hw = m.length / 2;
    minX = Math.min(minX, cx - hw);
    minY = Math.min(minY, cy - hw);
    maxX = Math.max(maxX, cx + hw);
    maxY = Math.max(maxY, cy + hw);
  }

  const p = 2;
  const bw = maxX - minX + p * 2;
  const bh = maxY - minY + p * 2;
  const scale = Math.min(drawArea.w / (bw || 1), drawArea.h / (bh || 1), 10);
  const offX = drawArea.x + (drawArea.w - bw * scale) / 2 - (minX - p) * scale;
  const offY = drawArea.y + (drawArea.h - bh * scale) / 2 - (minY - p) * scale;

  for (const m of members) {
    const { cx: mcx, cy: mcy, angle } = projectMember(m, view);
    const mat = MATERIALS[m.type];
    const [r, g, b] = hexToRgb(mat.color);
    const { height } = parseSizeString(m.type, m.size);
    const rad = (angle * Math.PI) / 180;
    const cx = mcx * scale + offX;
    const cy = mcy * scale + offY;
    const len = m.length * scale;
    const vizH = Math.max(height * scale, 2);

    const cos = Math.cos(rad), sin = Math.sin(rad);
    const hw = len / 2, hh = vizH / 2;
    const pts = [
      { x: cx - cos * hw + sin * hh, y: cy - sin * hw - cos * hh },
      { x: cx + cos * hw + sin * hh, y: cy + sin * hw - cos * hh },
      { x: cx + cos * hw - sin * hh, y: cy + sin * hw + cos * hh },
      { x: cx - cos * hw - sin * hh, y: cy - sin * hw + cos * hh },
    ];

    doc.setFillColor(r * 0.7 + 76, g * 0.7 + 76, b * 0.7 + 76);
    doc.setDrawColor(r * 0.5, g * 0.5, b * 0.5);
    doc.setLineWidth(0.7);

    (doc as unknown as { lines: (lines: [number, number][], x: number, y: number, scale: [number, number], style: string, closed: boolean) => void }).lines(
      pts.slice(1).map((p2, i) => {
        const prev = pts[i];
        return [p2.x - prev.x, p2.y - prev.y] as [number, number];
      }),
      pts[0].x, pts[0].y, [1, 1], 'FD', true
    );
  }

  // Dimensions (top view only)
  if (view === 'top') {
    for (const d of dimensions) {
      const sx = d.startX * scale + offX;
      const sy = d.startY * scale + offY;
      const ex = d.endX * scale + offX;
      const ey = d.endY * scale + offY;
      const dx = ex - sx, dy = ey - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;
      const nx = -dy / len, ny = dx / len;
      const off = (d.offset ?? 3) * scale;
      const lsx = sx + nx * off, lsy = sy + ny * off;
      const lex = ex + nx * off, ley = ey + ny * off;
      doc.setDrawColor(96, 165, 250);
      doc.setLineWidth(0.6);
      doc.line(lsx, lsy, lex, ley);
      doc.line(sx, sy, lsx, lsy);
      doc.line(ex, ey, lex, ley);
      const mx2 = (lsx + lex) / 2, my2 = (lsy + ley) / 2;
      const totalIn = Math.sqrt((d.endX - d.startX) ** 2 + (d.endY - d.startY) ** 2);
      const ft = Math.floor(totalIn / 12);
      const inch = totalIn % 12;
      const lbl = ft > 0 ? `${ft}'-${inch.toFixed(2).replace(/\.?0+$/, '')}"` : `${totalIn.toFixed(2).replace(/\.?0+$/, '')}"`;
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(96, 165, 250);
      doc.text(lbl, mx2, my2 - 2, { align: 'center' });
    }
  }
}

export function exportPDF(
  members: Member[],
  titleBlock: TitleBlock,
  projectName: string,
  dimensions: Dimension[] = [],
  views: ViewType[] = ['top'],
): string {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'tabloid' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');

  // Grid
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  for (let x = 0; x < W; x += 36) doc.line(x, 0, x, H);
  for (let y = 0; y < H; y += 36) doc.line(0, y, W, y);

  // Border
  doc.setDrawColor(201, 64, 16);
  doc.setLineWidth(2);
  doc.rect(20, 20, W - 40, H - 40);

  // Title block
  const tbH = 90;
  const tbY = H - 20 - tbH;
  doc.setFillColor(245, 245, 245);
  doc.rect(20, tbY, W - 40, tbH, 'F');
  doc.setDrawColor(201, 64, 16);
  doc.setLineWidth(1);
  doc.line(20, tbY, W - 20, tbY);

  const colW = (W - 40) / 6;

  doc.setTextColor(201, 64, 16);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(titleBlock.company || 'FabDraw', 30, tbY + 18);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(titleBlock.address || '', 30, tbY + 30);
  doc.text(titleBlock.phone || '', 30, tbY + 41);
  doc.text(titleBlock.web || '', 30, tbY + 52);

  const pCol = 20 + colW * 1.5;
  doc.setDrawColor(200, 200, 200);
  doc.line(pCol, tbY, pCol, tbY + tbH);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text('PROJECT', pCol + 8, tbY + 14);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text((titleBlock.project || projectName).substring(0, 35), pCol + 8, tbY + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text((titleBlock.description || '').substring(0, 50), pCol + 8, tbY + 38);

  const dCol = 20 + colW * 3.2;
  doc.line(dCol, tbY, dCol, tbY + tbH);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text('DRAWN BY', dCol + 8, tbY + 14);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(9);
  doc.text(titleBlock.drawnBy || '—', dCol + 8, tbY + 26);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text('CHECKED BY', dCol + 8, tbY + 42);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(9);
  doc.text(titleBlock.checkedBy || '—', dCol + 8, tbY + 54);

  const sCol = 20 + colW * 4.2;
  doc.line(sCol, tbY, sCol, tbY + tbH);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text('DATE', sCol + 8, tbY + 14);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(9);
  doc.text(titleBlock.date || '', sCol + 8, tbY + 26);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text('SCALE', sCol + 8, tbY + 42);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(9);
  doc.text(titleBlock.scale || '1:1', sCol + 8, tbY + 54);

  const rCol = 20 + colW * 5.1;
  doc.line(rCol, tbY, rCol, tbY + tbH);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text('DWG NO', rCol + 8, tbY + 14);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(titleBlock.dwgNo || 'DWG-001', rCol + 8, tbY + 26);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('REV', rCol + 8, tbY + 42);
  doc.setTextColor(201, 64, 16);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(titleBlock.revision || 'A', rCol + 8, tbY + 56);

  // Title
  doc.setTextColor(201, 64, 16);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(projectName, 30, 55);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('FABRICATION DRAWING', 30, 68);

  // Drawing area
  const drawArea = { x: 30, y: 85, w: W - 60, h: tbY - 100 };

  const viewCount = views.length;
  const VIEW_LABELS: Record<ViewType, string> = {
    top: 'TOP VIEW',
    front: 'FRONT VIEW',
    side: 'SIDE VIEW',
    isometric: 'ISOMETRIC VIEW',
  };

  if (viewCount === 1) {
    drawViewInCell(doc, members, dimensions, views[0], drawArea.x, drawArea.y, drawArea.w, drawArea.h, VIEW_LABELS[views[0]]);
  } else if (viewCount === 2) {
    const hw = drawArea.w / 2;
    drawViewInCell(doc, members, dimensions, views[0], drawArea.x, drawArea.y, hw, drawArea.h, VIEW_LABELS[views[0]]);
    drawViewInCell(doc, members, dimensions, views[1], drawArea.x + hw, drawArea.y, hw, drawArea.h, VIEW_LABELS[views[1]]);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(drawArea.x + hw, drawArea.y, drawArea.x + hw, drawArea.y + drawArea.h);
  } else if (viewCount === 3) {
    const hw = drawArea.w / 2;
    const hh = drawArea.h / 2;
    drawViewInCell(doc, members, dimensions, views[0], drawArea.x, drawArea.y, hw, hh, VIEW_LABELS[views[0]]);
    drawViewInCell(doc, members, dimensions, views[1], drawArea.x + hw, drawArea.y, hw, hh, VIEW_LABELS[views[1]]);
    drawViewInCell(doc, members, dimensions, views[2], drawArea.x, drawArea.y + hh, drawArea.w, hh, VIEW_LABELS[views[2]]);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(drawArea.x + hw, drawArea.y, drawArea.x + hw, drawArea.y + hh);
    doc.line(drawArea.x, drawArea.y + hh, drawArea.x + drawArea.w, drawArea.y + hh);
  } else if (viewCount >= 4) {
    const hw = drawArea.w / 2;
    const hh = drawArea.h / 2;
    drawViewInCell(doc, members, dimensions, views[0], drawArea.x, drawArea.y, hw, hh, VIEW_LABELS[views[0]]);
    drawViewInCell(doc, members, dimensions, views[1], drawArea.x + hw, drawArea.y, hw, hh, VIEW_LABELS[views[1]]);
    drawViewInCell(doc, members, dimensions, views[2], drawArea.x, drawArea.y + hh, hw, hh, VIEW_LABELS[views[2]]);
    drawViewInCell(doc, members, dimensions, views[3], drawArea.x + hw, drawArea.y + hh, hw, hh, VIEW_LABELS[views[3]]);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(drawArea.x + hw, drawArea.y, drawArea.x + hw, drawArea.y + drawArea.h);
    doc.line(drawArea.x, drawArea.y + hh, drawArea.x + drawArea.w, drawArea.y + hh);
  }

  // === PAGE 2: BOM ===
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');
  doc.setDrawColor(201, 64, 16);
  doc.setLineWidth(2);
  doc.rect(20, 20, W - 40, H - 40);

  doc.setTextColor(201, 64, 16);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL OF MATERIALS', 30, 55);

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(projectName, 30, 70);
  doc.text(`Total Weight: ${formatWeight(totalWeight(members))}`, W - 30, 55, { align: 'right' });
  doc.text(`${members.length} member${members.length !== 1 ? 's' : ''}`, W - 30, 70, { align: 'right' });

  // BOM table
  const cols = [30, 120, 220, 310, 390, 460, 570, 660];
  const headers = ['#', 'TYPE', 'SIZE', 'WALL', 'GRADE', 'LENGTH', 'QTY', 'WEIGHT'];
  let rowY = 100;

  doc.setFillColor(240, 240, 240);
  doc.rect(25, rowY - 12, W - 50, 18, 'F');
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, cols[i], rowY));

  rowY += 12;
  doc.setFont('helvetica', 'normal');

  const bomMap = new Map<string, { member: Member; qty: number; totalWeight: number }>();
  for (const m of members) {
    const key = `${m.type}|${m.size}|${m.wallThickness}|${m.grade}|${Math.round(m.length * 100)}`;
    const ex = bomMap.get(key);
    if (ex) { ex.qty++; ex.totalWeight += calcWeight(m); }
    else bomMap.set(key, { member: m, qty: 1, totalWeight: calcWeight(m) });
  }

  let i = 0;
  for (const { member, qty, totalWeight: tw } of bomMap.values()) {
    const mat = MATERIALS[member.type];
    if (i % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(25, rowY - 10, W - 50, 16, 'F'); }
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8);
    const row = [
      String(i + 1),
      mat.label,
      `${member.size}"`,
      `${member.wallThickness}"`,
      member.grade,
      inchesToFtIn(member.length),
      String(qty),
      formatWeight(tw),
    ];
    row.forEach((v, ci) => doc.text(v, cols[ci], rowY));
    rowY += 16;
    i++;
    if (rowY > H - 60) break;
  }

  return URL.createObjectURL(doc.output('blob'));
}
