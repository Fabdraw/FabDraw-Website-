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

// ─── 3D projection engine ───────────────────────────────────────────────────

interface Pt3 { x: number; y: number; z: number }
interface Pt2 { x: number; y: number }

const toRad = (d: number) => d * Math.PI / 180;

function get3DEndpoints(m: Member): { start3: Pt3; end3: Pt3 } {
  const rx = toRad(m.rotation.x ?? 0);
  const ry = toRad(m.rotation.y);
  const halfLen = m.length / 2;
  const dx = Math.cos(ry) * Math.cos(rx);
  const dy = Math.sin(rx);
  const dz = Math.sin(ry) * Math.cos(rx);
  const cx = m.position.x, cy = m.position.y, cz = m.position.z ?? 0;
  return {
    start3: { x: cx - dx * halfLen, y: cy - dy * halfLen, z: cz - dz * halfLen },
    end3:   { x: cx + dx * halfLen, y: cy + dy * halfLen, z: cz + dz * halfLen },
  };
}

const topProj   = (p: Pt3): Pt2 => ({ x: p.x,  y: p.z });
const frontProj = (p: Pt3): Pt2 => ({ x: p.x,  y: -p.y });
const sideProj  = (p: Pt3): Pt2 => ({ x: p.z,  y: -p.y });
const isoProj   = (p: Pt3): Pt2 => ({
  x: (p.x - p.z) * Math.cos(Math.PI / 6),
  y: -p.y + (p.x + p.z) * Math.sin(Math.PI / 6),
});

function drawPoly(
  doc: jsPDF,
  pts: Pt2[],
  fr: number, fg: number, fb: number,
) {
  doc.setFillColor(Math.min(255, fr), Math.min(255, fg), Math.min(255, fb));
  doc.setDrawColor(Math.round(fr * 0.45), Math.round(fg * 0.45), Math.round(fb * 0.45));
  doc.setLineWidth(0.4);
  (doc as unknown as {
    lines: (l: [number, number][], x: number, y: number, s: [number, number], style: string, closed: boolean) => void
  }).lines(
    pts.slice(1).map((p, i) => [p.x - pts[i].x, p.y - pts[i].y] as [number, number]),
    pts[0].x, pts[0].y, [1, 1], 'FD', true,
  );
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
  const pad = 15;
  const drawArea = { x: cellX + pad, y: cellY + 22 + pad, w: cellW - pad * 2, h: cellH - 22 - pad * 2 };

  // Cell border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(cellX, cellY, cellW, cellH);

  // Label
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(label, cellX + pad, cellY + 16);

  if (members.length === 0) {
    doc.setTextColor(180, 180, 180);
    doc.setFontSize(10);
    doc.text('No members', cellX + cellW / 2, cellY + cellH / 2, { align: 'center' });
    return;
  }

  const projFn = view === 'top' ? topProj : view === 'front' ? frontProj : view === 'side' ? sideProj : isoProj;

  // Collect all projected endpoints for auto-scaling
  const allPts: Pt2[] = [];
  for (const m of members) {
    const { start3, end3 } = get3DEndpoints(m);
    allPts.push(projFn(start3), projFn(end3));
    if (view === 'isometric') {
      // Include box corners for better bounds
      const { width } = parseSizeString(m.type, m.size);
      const hw = (parseFloat(m.size) || width) / 2;
      const corners: Pt3[] = [
        { x: start3.x - hw, y: start3.y - hw, z: start3.z },
        { x: start3.x + hw, y: start3.y + hw, z: start3.z },
        { x: end3.x - hw,   y: end3.y - hw,   z: end3.z },
        { x: end3.x + hw,   y: end3.y + hw,   z: end3.z },
      ];
      corners.forEach(c => allPts.push(isoProj(c)));
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of allPts) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  const bw = (maxX - minX) || 1, bh = (maxY - minY) || 1;
  const scale = Math.min(drawArea.w / (bw + 4), drawArea.h / (bh + 4), 20);
  const offX = drawArea.x + (drawArea.w - bw * scale) / 2 - minX * scale;
  const offY = drawArea.y + (drawArea.h - bh * scale) / 2 - minY * scale;
  const toScreen = (p: Pt2): Pt2 => ({ x: p.x * scale + offX, y: p.y * scale + offY });

  if (view !== 'isometric') {
    // Orthographic views: draw each member as a filled rectangle
    for (const m of members) {
      const { start3, end3 } = get3DEndpoints(m);
      const s = toScreen(projFn(start3));
      const e = toScreen(projFn(end3));
      const { width, height } = parseSizeString(m.type, m.size);
      // thickness in screen units: use cross-section dimension perpendicular to member axis
      const isUpright = Math.abs(m.rotation.x ?? 0) >= 45;
      const crossSect = view === 'top'
        ? (isUpright ? width : height)
        : (isUpright ? m.length : height);
      const thickPx = Math.max(crossSect * scale, 1.5);
      const dx = e.x - s.x, dy = e.y - s.y;
      const lenPx = Math.sqrt(dx * dx + dy * dy);
      if (lenPx < 0.5) continue;
      const nx = -dy / lenPx, ny = dx / lenPx;
      const half = thickPx / 2;
      // Rectangle corners
      const rx = s.x + nx * half, ry = s.y + ny * half;
      const rpts: Pt2[] = [
        { x: s.x + nx * half,  y: s.y + ny * half },
        { x: s.x - nx * half,  y: s.y - ny * half },
        { x: e.x - nx * half,  y: e.y - ny * half },
        { x: e.x + nx * half,  y: e.y + ny * half },
      ];
      void rx; void ry;
      doc.setFillColor(26, 58, 92);
      doc.setDrawColor(10, 26, 60);
      doc.setLineWidth(0.5);
      (doc as unknown as {
        lines: (l: [number, number][], x: number, y: number, s: [number, number], style: string, closed: boolean) => void
      }).lines(
        rpts.slice(1).map((p, i) => [p.x - rpts[i].x, p.y - rpts[i].y] as [number, number]),
        rpts[0].x, rpts[0].y, [1, 1], 'FD', true,
      );
    }
  } else {
    // Isometric: draw each member as a 3D box with 3 lit faces — fixed colors
    for (const m of members) {
      const { start3, end3 } = get3DEndpoints(m);
      const { width } = parseSizeString(m.type, m.size);
      const hw = (parseFloat(m.size) || width) / 2;

      const c3: Pt3[] = [
        { x: start3.x - hw, y: start3.y - hw, z: start3.z },
        { x: start3.x + hw, y: start3.y - hw, z: start3.z },
        { x: start3.x + hw, y: start3.y + hw, z: start3.z },
        { x: start3.x - hw, y: start3.y + hw, z: start3.z },
        { x: end3.x - hw,   y: end3.y - hw,   z: end3.z },
        { x: end3.x + hw,   y: end3.y - hw,   z: end3.z },
        { x: end3.x + hw,   y: end3.y + hw,   z: end3.z },
        { x: end3.x - hw,   y: end3.y + hw,   z: end3.z },
      ];
      const p = c3.map(c => toScreen(isoProj(c)));

      // TOP face — #2a5a8c
      drawPoly(doc, [p[0], p[1], p[5], p[4]], 0x2a, 0x5a, 0x8c);
      // FRONT face — #1a3a5c
      drawPoly(doc, [p[0], p[1], p[2], p[3]], 0x1a, 0x3a, 0x5c);
      // SIDE face — #0f2040
      drawPoly(doc, [p[1], p[5], p[6], p[2]], 0x0f, 0x20, 0x40);
    }
  }

  // Dimension lines (top view only)
  if (view === 'top') {
    for (const d of dimensions) {
      const sA = toScreen(topProj({ x: d.pointA.x, y: 0, z: d.pointA.y }));
      const sB = toScreen(topProj({ x: d.pointB.x, y: 0, z: d.pointB.y }));
      const off = d.offsetDistance * scale;
      const dax = sA.x + d.offsetDirection.x * off, day = sA.y + d.offsetDirection.y * off;
      const dbx = sB.x + d.offsetDirection.x * off, dby = sB.y + d.offsetDirection.y * off;
      doc.setDrawColor(96, 165, 250);
      doc.setLineWidth(0.6);
      // Extension lines
      doc.line(sA.x, sA.y, dax, day);
      doc.line(sB.x, sB.y, dbx, dby);
      // Measurement line
      doc.line(dax, day, dbx, dby);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(96, 165, 250);
      doc.text(d.label, (dax + dbx) / 2, (day + dby) / 2 - 2, { align: 'center' });
    }
  }
}

export interface CapturedView { name: string; dataURL: string }

export function exportPDFFromImages(
  capturedViews: CapturedView[],
  members: Member[],
  titleBlock: TitleBlock,
  projectName: string,
): string {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const W = doc.internal.pageSize.getWidth()   // 792
  const H = doc.internal.pageSize.getHeight()  // 612

  // White background
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, H, 'F')

  // Outer border
  doc.setDrawColor(201, 64, 16)
  doc.setLineWidth(2)
  doc.rect(20, 20, W - 40, H - 40)

  // Title block (60pt high at bottom)
  const tbH = 60
  const tbY = H - 20 - tbH
  doc.setFillColor(245, 245, 245)
  doc.rect(20, tbY, W - 40, tbH, 'F')
  doc.setDrawColor(201, 64, 16)
  doc.setLineWidth(1)
  doc.line(20, tbY, W - 20, tbY)

  const colW = (W - 40) / 6
  doc.setTextColor(201, 64, 16)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(titleBlock.company || 'FabDraw', 30, tbY + 16)

  doc.setTextColor(60, 60, 60)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(titleBlock.address || '', 30, tbY + 26)
  doc.text((titleBlock.phone || '') + (titleBlock.web ? '  |  ' + titleBlock.web : ''), 30, tbY + 36)

  const pCol = 20 + colW * 1.5
  doc.setDrawColor(200, 200, 200)
  doc.line(pCol, tbY, pCol, tbY + tbH)
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(7)
  doc.text('PROJECT', pCol + 8, tbY + 13)
  doc.setTextColor(20, 20, 20)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text((titleBlock.project || projectName).substring(0, 35), pCol + 8, tbY + 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(60, 60, 60)
  doc.text((titleBlock.description || '').substring(0, 50), pCol + 8, tbY + 35)

  const dCol = 20 + colW * 3.2
  doc.line(dCol, tbY, dCol, tbY + tbH)
  doc.setTextColor(100, 100, 100); doc.setFontSize(7)
  doc.text('DRAWN BY', dCol + 8, tbY + 13)
  doc.setTextColor(20, 20, 20); doc.setFontSize(8)
  doc.text(titleBlock.drawnBy || '—', dCol + 8, tbY + 24)

  const sCol = 20 + colW * 4.2
  doc.line(sCol, tbY, sCol, tbY + tbH)
  doc.setTextColor(100, 100, 100); doc.setFontSize(7)
  doc.text('DATE', sCol + 8, tbY + 13)
  doc.setTextColor(20, 20, 20); doc.setFontSize(8)
  doc.text(titleBlock.date || '', sCol + 8, tbY + 24)
  doc.setTextColor(100, 100, 100); doc.setFontSize(7)
  doc.text('SCALE', sCol + 8, tbY + 36)
  doc.setTextColor(20, 20, 20); doc.setFontSize(8)
  doc.text(titleBlock.scale || '1:1', sCol + 8, tbY + 47)

  const rCol = 20 + colW * 5.1
  doc.line(rCol, tbY, rCol, tbY + tbH)
  doc.setTextColor(100, 100, 100); doc.setFontSize(7)
  doc.text('DWG NO', rCol + 8, tbY + 13)
  doc.setTextColor(20, 20, 20); doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(titleBlock.dwgNo || 'DWG-001', rCol + 8, tbY + 24)
  doc.setTextColor(201, 64, 16); doc.setFontSize(13)
  doc.text(titleBlock.revision || 'A', rCol + 8, tbY + 48)

  // Title line
  doc.setTextColor(201, 64, 16); doc.setFontSize(13); doc.setFont('helvetica', 'bold')
  doc.text(projectName, 30, 50)
  doc.setTextColor(100, 100, 100); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  doc.text('FABRICATION DRAWING  •  3D VIEWS', 30, 62)

  // Drawing area: from y=72 to tbY-4
  const GAP = 8
  const drawY = 72
  const drawH = tbY - 4 - drawY
  const drawX = 28
  const drawW = W - 56

  const count = Math.min(capturedViews.length, 4)

  // Compute cell positions based on count
  type CellRect = { x: number; y: number; w: number; h: number }
  let cells: CellRect[] = []

  if (count === 1) {
    cells = [{ x: drawX, y: drawY, w: drawW, h: drawH }]
  } else if (count === 2) {
    const cw = (drawW - GAP) / 2
    cells = [
      { x: drawX,           y: drawY, w: cw, h: drawH },
      { x: drawX + cw + GAP, y: drawY, w: cw, h: drawH },
    ]
  } else if (count === 3) {
    const cw = (drawW - GAP) / 2
    const ch = (drawH - GAP) / 2
    cells = [
      { x: drawX,            y: drawY,          w: cw,     h: ch },
      { x: drawX + cw + GAP, y: drawY,          w: cw,     h: ch },
      { x: drawX,            y: drawY + ch + GAP, w: drawW, h: ch },
    ]
  } else {
    const cw = (drawW - GAP) / 2
    const ch = (drawH - GAP) / 2
    cells = [
      { x: drawX,            y: drawY,            w: cw, h: ch },
      { x: drawX + cw + GAP, y: drawY,            w: cw, h: ch },
      { x: drawX,            y: drawY + ch + GAP, w: cw, h: ch },
      { x: drawX + cw + GAP, y: drawY + ch + GAP, w: cw, h: ch },
    ]
  }

  for (let i = 0; i < count; i++) {
    const { name, dataURL } = capturedViews[i]
    const { x, y, w, h } = cells[i]

    // Cell border
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.rect(x, y, w, h)

    // Label
    doc.setFontSize(7); doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text(name, x + 6, y + 13)

    // Image: captured at 1200:900 aspect — fit into cell maintaining that ratio
    const imgAreaY = y + 18
    const imgAreaH = h - 22
    // image is 1200×900 → aspect 4:3
    const imgAspect = 1200 / 900
    let imgW = w - 4
    let imgH = imgW / imgAspect
    if (imgH > imgAreaH) { imgH = imgAreaH; imgW = imgH * imgAspect }
    const imgX = x + (w - imgW) / 2
    const imgY2 = imgAreaY + (imgAreaH - imgH) / 2
    doc.addImage(dataURL, 'PNG', imgX, imgY2, imgW, imgH)
  }

  // Page 2: BOM
  doc.addPage()
  doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, H, 'F')
  doc.setDrawColor(201, 64, 16); doc.setLineWidth(2); doc.rect(20, 20, W - 40, H - 40)
  doc.setTextColor(201, 64, 16); doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('BILL OF MATERIALS', 30, 55)
  doc.setTextColor(80, 80, 80); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.text(projectName, 30, 70)
  doc.text(`Total Weight: ${formatWeight(totalWeight(members))}`, W - 30, 55, { align: 'right' })
  doc.text(`${members.length} member${members.length !== 1 ? 's' : ''}`, W - 30, 70, { align: 'right' })

  const cols = [30, 120, 220, 310, 390, 460, 570, 660]
  const headers = ['#', 'TYPE', 'SIZE', 'WALL', 'GRADE', 'LENGTH', 'QTY', 'WEIGHT']
  let rowY = 100
  doc.setFillColor(240, 240, 240); doc.rect(25, rowY - 12, W - 50, 18, 'F')
  doc.setTextColor(80, 80, 80); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
  headers.forEach((h, i) => doc.text(h, cols[i], rowY))
  rowY += 12; doc.setFont('helvetica', 'normal')

  const bomMap = new Map<string, { member: Member; qty: number; totalWeight: number }>()
  for (const m of members) {
    const key = `${m.type}|${m.size}|${m.wallThickness}|${m.grade}|${Math.round(m.length * 100)}`
    const ex = bomMap.get(key)
    if (ex) { ex.qty++; ex.totalWeight += calcWeight(m) }
    else bomMap.set(key, { member: m, qty: 1, totalWeight: calcWeight(m) })
  }

  let idx = 0
  for (const { member, qty, totalWeight: tw } of bomMap.values()) {
    const mat = MATERIALS[member.type]
    if (idx % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(25, rowY - 10, W - 50, 16, 'F') }
    doc.setTextColor(40, 40, 40); doc.setFontSize(8)
    const row = [String(idx + 1), mat.label, `${member.size}"`, `${member.wallThickness}"`, member.grade, inchesToFtIn(member.length), String(qty), formatWeight(tw)]
    row.forEach((v, ci) => doc.text(v, cols[ci], rowY))
    rowY += 16; idx++
    if (rowY > H - 60) break
  }

  return URL.createObjectURL(doc.output('blob'))
}

export function exportPDF(
  members: Member[],
  titleBlock: TitleBlock,
  projectName: string,
  dimensions: Dimension[] = [],
  views: ViewType[] = ['top'],
): string {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
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
  const tbH = 60;
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

  const GAP = 8;
  if (viewCount === 1) {
    drawViewInCell(doc, members, dimensions, views[0], drawArea.x, drawArea.y, drawArea.w, drawArea.h, VIEW_LABELS[views[0]]);
  } else if (viewCount === 2) {
    const cw = (drawArea.w - GAP) / 2;
    drawViewInCell(doc, members, dimensions, views[0], drawArea.x, drawArea.y, cw, drawArea.h, VIEW_LABELS[views[0]]);
    drawViewInCell(doc, members, dimensions, views[1], drawArea.x + cw + GAP, drawArea.y, cw, drawArea.h, VIEW_LABELS[views[1]]);
  } else if (viewCount === 3) {
    const cw = (drawArea.w - GAP) / 2;
    const ch = (drawArea.h - GAP) / 2;
    drawViewInCell(doc, members, dimensions, views[0], drawArea.x, drawArea.y, cw, ch, VIEW_LABELS[views[0]]);
    drawViewInCell(doc, members, dimensions, views[1], drawArea.x + cw + GAP, drawArea.y, cw, ch, VIEW_LABELS[views[1]]);
    drawViewInCell(doc, members, dimensions, views[2], drawArea.x, drawArea.y + ch + GAP, drawArea.w, ch, VIEW_LABELS[views[2]]);
  } else if (viewCount >= 4) {
    const cw = (drawArea.w - GAP) / 2;
    const ch = (drawArea.h - GAP) / 2;
    drawViewInCell(doc, members, dimensions, views[0], drawArea.x,          drawArea.y,          cw, ch, VIEW_LABELS[views[0]]);
    drawViewInCell(doc, members, dimensions, views[1], drawArea.x + cw + GAP, drawArea.y,        cw, ch, VIEW_LABELS[views[1]]);
    drawViewInCell(doc, members, dimensions, views[2], drawArea.x,          drawArea.y + ch + GAP, cw, ch, VIEW_LABELS[views[2]]);
    drawViewInCell(doc, members, dimensions, views[3], drawArea.x + cw + GAP, drawArea.y + ch + GAP, cw, ch, VIEW_LABELS[views[3]]);
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
