import { jsPDF } from 'jspdf'
import type { Project } from '../types'
import type { RefObject } from 'react'
import { getSizeValue, getWall } from './materials'
import { calcWeight } from './weights'

export async function exportPDF(project: Project, stageRef: RefObject<any>) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // Page 1 background
  doc.setFillColor(10, 13, 20)
  doc.rect(0, 0, W, H, 'F')

  // Outer border
  doc.setDrawColor(48, 96, 160)
  doc.setLineWidth(2)
  doc.rect(16, 16, W - 32, H - 32)
  doc.setLineWidth(0.5)
  doc.rect(20, 20, W - 40, H - 40)

  // Title block 88pt from bottom
  const tbY = H - 16 - 88
  doc.setFillColor(13, 17, 23)
  doc.rect(16, tbY, W - 32, 88, 'F')
  doc.setDrawColor(48, 96, 160)
  doc.setLineWidth(1)
  doc.line(16, tbY, W - 16, tbY)

  // Vertical dividers at 32% 58% 76%
  const d1 = 16 + (W - 32) * 0.32
  const d2 = 16 + (W - 32) * 0.58
  const d3 = 16 + (W - 32) * 0.76
  ;[d1, d2, d3].forEach(x => doc.line(x, tbY, x, H - 16))

  const tb = project.titleBlock
  doc.setTextColor(249, 115, 22)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(tb.company || 'FabDraw Engineering', 22, tbY + 18)

  doc.setTextColor(148, 163, 184)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(tb.address || '', 22, tbY + 30)
  doc.text(`${tb.phone || ''} | ${tb.web || ''}`, 22, tbY + 40)

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.text('PROJECT', 22, tbY + 54)
  doc.setTextColor(241, 245, 249)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(tb.project || 'Untitled Project', 22, tbY + 65)

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('DESCRIPTION', 22, tbY + 76)
  doc.setTextColor(241, 245, 249)
  doc.setFontSize(8)
  doc.text(tb.description || '', 22, tbY + 84)

  // Mid section
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.text('DRAWN BY', d1 + 8, tbY + 20)
  doc.setTextColor(241, 245, 249)
  doc.setFontSize(9)
  doc.text(tb.drawnBy || '', d1 + 8, tbY + 32)
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.text('CHECKED BY', d1 + 8, tbY + 50)
  doc.setTextColor(241, 245, 249)
  doc.setFontSize(9)
  doc.text(tb.checkedBy || '', d1 + 8, tbY + 62)

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.text('DATE', d2 + 8, tbY + 20)
  doc.setTextColor(241, 245, 249)
  doc.setFontSize(9)
  doc.text(tb.date || new Date().toLocaleDateString(), d2 + 8, tbY + 32)
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.text('SCALE', d2 + 8, tbY + 50)
  doc.setTextColor(241, 245, 249)
  doc.setFontSize(9)
  doc.text(tb.scale || 'NTS', d2 + 8, tbY + 62)

  doc.setTextColor(249, 115, 22)
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

  // Page 2 — BOM
  doc.addPage('letter', 'landscape')
  doc.setFillColor(10, 13, 20)
  doc.rect(0, 0, W, H, 'F')
  doc.setDrawColor(48, 96, 160)
  doc.setLineWidth(2)
  doc.rect(16, 16, W - 32, H - 32)

  doc.setTextColor(249, 115, 22)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('FabDraw', 28, 44)
  doc.setTextColor(241, 245, 249)
  doc.setFontSize(13)
  doc.text('BILL OF MATERIALS', 100, 44)
  doc.setDrawColor(249, 115, 22)
  doc.setLineWidth(1.5)
  doc.line(28, 50, W - 28, 50)

  // BOM table
  const cols = ['#', 'TYPE', 'SIZE', 'WALL', 'MATERIAL', 'LENGTHS', 'QTY', 'TOTAL WEIGHT']
  const colX = [30, 50, 120, 200, 270, 360, 490, 540]

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  let y = 68
  cols.forEach((c, i) => doc.text(c, colX[i], y))
  doc.setDrawColor(60, 80, 120)
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
      doc.setFillColor(20, 25, 36)
      doc.rect(28, y - 10, W - 56, 14, 'F')
    }
    isAlt = !isAlt

    doc.setTextColor(241, 245, 249)
    doc.text(String(rowNum++), colX[0], y)
    doc.text(p.type.replace('_', ' '), colX[1], y)
    doc.text(String(p.sizeIdx), colX[2], y)
    doc.text(String(p.thkIdx), colX[3], y)
    doc.text(p.material.replace('_', ' '), colX[4], y)
    doc.text(lengths.substring(0, 40), colX[5], y)
    doc.text(String(pieces.length), colX[6], y)
    doc.setTextColor(249, 115, 22)
    doc.text(`${w.toFixed(2)} lbs`, colX[7], y)
    doc.setTextColor(241, 245, 249)
    totalW += w
    y += 14
    if (y > H - 40) break
  }

  // Total row
  doc.setFillColor(40, 20, 10)
  doc.rect(28, y, W - 56, 16, 'F')
  doc.setTextColor(249, 115, 22)
  doc.setFont('helvetica', 'bold')
  doc.text(`TOTAL: ${totalW.toFixed(2)} lbs`, colX[6], y + 11)

  doc.setTextColor(71, 85, 105)
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
