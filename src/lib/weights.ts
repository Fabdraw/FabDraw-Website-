import type { Member } from '../types'
import { parseSizeString, DENSITY } from './materials'

export function calcWeight(member: Member): number {
  const d = DENSITY[member.grade]
  const { type, size, wallThickness, length } = member
  const wall = parseFloat(wallThickness) || 0.125
  const { width, height } = parseSizeString(type, size)
  let area = 0

  switch (type) {
    case 'square_tube': {
      const outer = width * height
      const inner = (width - 2 * wall) * (height - 2 * wall)
      area = outer - Math.max(0, inner)
      break
    }
    case 'round_tube':
    case 'pipe': {
      const outerR = width / 2
      const innerR = outerR - wall
      area = Math.PI * (outerR * outerR - Math.max(0, innerR * innerR))
      break
    }
    case 'rect_tube': {
      const outer = width * height
      const inner = (width - 2 * wall) * (height - 2 * wall)
      area = outer - Math.max(0, inner)
      break
    }
    case 'angle': {
      area = 2 * width * wall - wall * wall
      break
    }
    case 'channel': {
      area = 2 * (width * wall) + (height - 2 * wall) * wall
      break
    }
    case 'i_beam': {
      // Two flanges (full width) + web (half flange thickness — typical W-section ratio)
      const webT = wall * 0.5
      area = 2 * (width * wall) + (height - 2 * wall) * webT
      break
    }
    case 'flat_bar': {
      area = width * height
      break
    }
    case 'sheet':
    case 'plate': {
      area = width * wall
      break
    }
    default:
      area = width * height
  }

  return area * length * d
}

export function formatWeight(lbs: number): string {
  if (lbs < 0.1) return '< 0.1 lbs'
  return `${lbs.toFixed(2)} lbs`
}

export function totalWeight(members: Member[]): number {
  return members.reduce((sum, m) => sum + calcWeight(m), 0)
}
