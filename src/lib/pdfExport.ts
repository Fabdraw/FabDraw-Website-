import { jsPDF } from 'jspdf'
import type { Project } from '../types'
import type { RefObject } from 'react'
import { getSizeValue, getWall } from './materials'
import { calcWeight } from './weights'

export async function exportPDF(project: Project, stageRef: RefObject<any>) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // Page 1 background — white
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, H, 'F')

  // Grid lines (light gray for white bg)
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.4)
  const gridSpacing = 36
  for (let x = 0; x < W; x += gridSpacing) doc.line(x, 0, x, H)
  for (let y = 0; y < H; y += gridSpacing) doc.line(0, y, W, y)

  // Outer border — keep orange
  doc.setDrawColor(201, 64, 16)
  doc.setLineWidth(2)
  doc.rect(16, 16, W - 32, H - 32)
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.rect(20, 20, W - 40, H - 40)

  // Title block — light gray background
  const tbY = H - 16 - 88
  doc.setFillColor(245, 245, 245)
  doc.rect(16, tbY, W - 32, 88, 'F')
  doc.setDrawColor(201, 64, 16)
  doc.setLineWidth(1)
  doc.line(16, tbY, W - 16, tbY)

  // Vertical dividers at 32% 58% 76%
  const d1 = 16 + (W - 32) * 0.32
  const d2 = 16 + (W - 32) * 0.58
  const d3 = 16 + (W - 32) * 0.76
  doc.setDrawColor(180, 180, 180)
  ;[d1, d2, d3].forEach(x => doc.line(x, tbY, x, H - 16))

  const tb = project.titleBlock
  doc.setTextColor(201, 64, 16)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(tb.company || 'FabDraw Engineering', 22, tbY + 18)

  doc.setTextColor(60, 60, 60)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(tb.address || '', 22, tbY + 30)
  doc.text(`${tb.phone || ''} | ${tb.web || ''}`, 22, tbY + 40)

  doc.setTextColor(120, 120, 120)
  doc.setFontSize(7)
  doc.text('PROJECT', 22, tbY + 54)
  doc.setTextColor(20, 20, 20)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(tb.project || 'Untitled Project', 22, tbY + 65)

  doc.setTextColor(120, 120, 120)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('DESCRIPTION', 22, tbY + 76)
  doc.setTextColor(60, 60, 60)
  doc.setFontSize(8)
  doc.text(tb.description || '', 22, tbY + 84)

  // Mid section
  doc.setTextColor(120, 120, 120)
  doc.setFontSize(7)
  doc.text('DRAWN BY', d1 + 8, tbY + 20)
  doc.setTextColor(20, 20, 20)
  doc.setFontSize(9)
  doc.text(tb.drawnBy || '', d1 + 8, tbY + 32)
  doc.setTextColor(120, 120, 120)
  doc.setFontSize(7)
  doc.text('CHECKED BY', d1 + 8, tbY + 50)
  doc.setTextColor(20, 20, 20)
  doc.setFontSize(9)
  doc.text(tb.checkedBy || '', d1 + 8, tbY + 62)

  doc.setTextColor(120, 120, 120)
  doc.setFontSize(7)
  doc.text('DATE', d2 + 8, tbY + 20)
  doc.setTextColor(20, 20, 20)
  doc.setFontSize(9)
  doc.text(tb.date || new Date().toLocaleDateString(), d2 + 8, tbY + 32)
  doc.setTextColor(120, 120, 120)
  doc.setFontSize(7)
  doc.text('SCALE', d2 + 8, tbY + 50)
  doc.setTextColor(20, 20, 20)
  doc.setFontSize(9)
  doc.text(tb.scale || 'NTS', d2 + 8, tbY + 62)

  // Keep orange for DWG/REV
  doc.setTextColor(201, 64, 16)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`DWG-${tb.dwgNo || '001'}`, d3 + 8, tbY + 28)
  doc.setFontSize(22)
  doc.text(`REV ${tb.revision || 'A'}`, d3 + 8, tbY + 60)

  // Canvas image
  if (stageRef?.current) {
    try {
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 1.5 })
      const drawH = tbY - 36
      doc.addImage(dataURL, 'PNG', 22, 24, W - 44, drawH)
    } catch (e) {
      console.warn('Canvas export failed', e)
    }
  }

  // Page 2 — BOM (white background)
  doc.addPage('letter', 'landscape')
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, H, 'F')

  // Light grid for page 2
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.4)
  for (let x = 0; x < W; x += gridSpacing) doc.line(x, 0, x, H)
  for (let y = 0; y < H; y += gridSpacing) doc.line(0, y, W, y)

  doc.setDrawColor(201, 64, 16)
  doc.setLineWidth(2)
  doc.rect(16, 16, W - 32, H - 32)

  // BOM header — light gray
  doc.setFillColor(245, 245, 245)
  doc.rect(16, 16, W - 32, 40, 'F')
  doc.setDrawColor(201, 64, 16)
  doc.setLineWidth(1.5)
  doc.line(28, 56, W - 28, 56)

  doc.setTextColor(201, 64, 16)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('FabDraw', 28, 44)
  doc.setTextColor(20, 20, 20)
  doc.setFontSize(13)
  doc.text('BILL OF MATERIALS', 100, 44)

  // BOM table
  const cols = ['#', 'TYPE', 'SIZE', 'WALL', 'MATERIAL', 'LENGTHS', 'QTY', 'TOTAL WEIGHT']
  const colX = [30, 50, 120, 200, 270, 360, 490, 540]

  doc.setTextColor(80, 80, 80)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  let y = 72
  cols.forEach((c, i) => doc.text(c, colX[i], y))
  doc.setDrawColor(180, 180, 180)
  doc.line(28, y + 4, W - 28, y + 4)

  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  // Group pieces
  const groups = new Map<string, typeof project.pieces>()
  for (const p of project.pieces) {
    const key = `${p.type}|${p.sizeIdx}|${p.thkIdx}|${p.material}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  let rowNum = 1
  let totalW = 0
  let isAlt = false
  for (const [, pieces] of groups) {
    const p = pieces[0]
    const lengths = pieces.map(pc => `${pc.length}"`).join(', ')
    const sv = getSizeValue(p.type, p.sizeIdx)
    const wall = getWall(p.type, p.thkIdx)
    const w = pieces.reduce((sum, pc) => sum + calcWeight(pc, sv, wall), 0)

    if (isAlt) {
      doc.setFillColor(248, 248, 248)
      doc.rect(28, y - 10, W - 56, 14, 'F')
    }
    isAlt = !isAlt

    doc.setTextColor(20, 20, 20)
    doc.text(String(rowNum++), colX[0], y)
    doc.text(p.type.replace('_', ' '), colX[1], y)
    doc.text(String(p.sizeIdx), colX[2], y)
    doc.text(String(p.thkIdx), colX[3], y)
    doc.text(p.material.replace('_', ' '), colX[4], y)
    doc.text(lengths.substring(0, 40), colX[5], y)
    doc.text(String(pieces.length), colX[6], y)
    doc.setTextColor(201, 64, 16)
    doc.text(`${w.toFixed(2)} lbs`, colX[7], y)
    doc.setTextColor(20, 20, 20)
    totalW += w
    y += 14
    if (y > H - 40) break
  }

  // Bottom divider line
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.5)
  doc.line(28, y + 2, W - 28, y + 2)

  // Total row
  doc.setFillColor(245, 240, 235)
  doc.rect(28, y + 4, W - 56, 16, 'F')
  doc.setTextColor(201, 64, 16)
  doc.setFont('helvetica', 'bold')
  doc.text(`TOTAL: ${totalW.toFixed(2)} lbs`, colX[6], y + 15)

  doc.setTextColor(120, 120, 120)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('fabdraw.com', 28, H - 22)
  doc.text('Page 2 of 2', W - 60, H - 22)

  const filename = (project.name || 'fabdraw').replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
