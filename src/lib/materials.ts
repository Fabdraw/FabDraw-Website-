import type { MaterialType, MaterialGrade } from '../types'

export interface SizeEntry {
  label: string
  value: number | number[]
}

export interface ThicknessEntry {
  label: string
  value: number
}

export interface MaterialConfig {
  id: MaterialType
  label: string
  color: string
  isRound: boolean
  isCustomSize: boolean
  layer: string
  sizes: SizeEntry[]
  thicknesses: ThicknessEntry[]
  defaultSizeIdx: number
  defaultThkIdx: number
  defaultCustomW?: number
  defaultCustomH?: number
}

const TUBE_SIZES: SizeEntry[] = [
  { label: '1/2"', value: 0.5 },
  { label: '3/4"', value: 0.75 },
  { label: '1"', value: 1.0 },
  { label: '1-1/4"', value: 1.25 },
  { label: '1-1/2"', value: 1.5 },
  { label: '2"', value: 2.0 },
  { label: '2-1/2"', value: 2.5 },
  { label: '3"', value: 3.0 },
  { label: '4"', value: 4.0 },
  { label: '5"', value: 5.0 },
  { label: '6"', value: 6.0 },
]

const TUBE_THICKNESSES: ThicknessEntry[] = [
  { label: '16ga', value: 0.065 },
  { label: '14ga', value: 0.083 },
  { label: '13ga', value: 0.095 },
  { label: '11ga', value: 0.120 },
  { label: '10ga', value: 0.135 },
  { label: '3/16"', value: 0.1875 },
  { label: '1/4"', value: 0.250 },
  { label: '5/16"', value: 0.3125 },
  { label: '3/8"', value: 0.375 },
  { label: '1/2"', value: 0.500 },
]

const PIPE_THICKNESSES: ThicknessEntry[] = [
  { label: 'Sch5', value: 0.065 },
  { label: 'Sch10', value: 0.109 },
  { label: 'Sch40', value: 0.145 },
  { label: 'Sch80', value: 0.200 },
  { label: 'Sch160', value: 0.281 },
  { label: 'XXH', value: 0.375 },
]

const ANGLE_THICKNESSES: ThicknessEntry[] = [
  { label: '1/8"', value: 0.125 },
  { label: '3/16"', value: 0.1875 },
  { label: '1/4"', value: 0.250 },
  { label: '5/16"', value: 0.3125 },
  { label: '3/8"', value: 0.375 },
  { label: '1/2"', value: 0.500 },
  { label: '3/4"', value: 0.750 },
  { label: '1"', value: 1.000 },
]

const CHANNEL_THICKNESSES: ThicknessEntry[] = [
  { label: '3/16"', value: 0.1875 },
  { label: '1/4"', value: 0.250 },
  { label: '5/16"', value: 0.3125 },
  { label: '3/8"', value: 0.375 },
  { label: '1/2"', value: 0.500 },
]

const SHEET_THICKNESSES: ThicknessEntry[] = [
  { label: '22ga', value: 0.0299 },
  { label: '20ga', value: 0.0359 },
  { label: '18ga', value: 0.0478 },
  { label: '16ga', value: 0.0598 },
  { label: '14ga', value: 0.0747 },
  { label: '12ga', value: 0.1046 },
  { label: '11ga', value: 0.1196 },
  { label: '10ga', value: 0.1345 },
  { label: '7ga', value: 0.1793 },
]

const PLATE_THICKNESSES: ThicknessEntry[] = [
  { label: '1/8"', value: 0.125 },
  { label: '3/16"', value: 0.1875 },
  { label: '1/4"', value: 0.250 },
  { label: '5/16"', value: 0.3125 },
  { label: '3/8"', value: 0.375 },
  { label: '1/2"', value: 0.500 },
  { label: '5/8"', value: 0.625 },
  { label: '3/4"', value: 0.750 },
  { label: '1"', value: 1.000 },
  { label: '1-1/4"', value: 1.250 },
  { label: '1-1/2"', value: 1.500 },
]

export const MATERIALS: MaterialConfig[] = [
  {
    id: 'square_tube',
    label: 'Square Tube',
    color: '#4a7ab5',
    isRound: false,
    isCustomSize: false,
    layer: 'default',
    sizes: TUBE_SIZES,
    thicknesses: TUBE_THICKNESSES,
    defaultSizeIdx: 5,
    defaultThkIdx: 1,
  },
  {
    id: 'round_tube',
    label: 'Round Tube',
    color: '#5a8ec8',
    isRound: true,
    isCustomSize: false,
    layer: 'default',
    sizes: TUBE_SIZES,
    thicknesses: TUBE_THICKNESSES,
    defaultSizeIdx: 5,
    defaultThkIdx: 1,
  },
  {
    id: 'rect_tube',
    label: 'Rect Tube',
    color: '#4a7ab5',
    isRound: false,
    isCustomSize: false,
    layer: 'default',
    sizes: [
      { label: '1x2"', value: [1, 2] },
      { label: '1x3"', value: [1, 3] },
      { label: '2x3"', value: [2, 3] },
      { label: '2x4"', value: [2, 4] },
      { label: '3x4"', value: [3, 4] },
      { label: '3x5"', value: [3, 5] },
      { label: '4x6"', value: [4, 6] },
      { label: '2x6"', value: [2, 6] },
      { label: '4x8"', value: [4, 8] },
    ],
    thicknesses: TUBE_THICKNESSES,
    defaultSizeIdx: 3,
    defaultThkIdx: 1,
  },
  {
    id: 'pipe',
    label: 'Pipe',
    color: '#607080',
    isRound: true,
    isCustomSize: false,
    layer: 'default',
    sizes: [
      { label: '1/8" NPS', value: 0.405 },
      { label: '1/4" NPS', value: 0.54 },
      { label: '3/8" NPS', value: 0.675 },
      { label: '1/2" NPS', value: 0.84 },
      { label: '3/4" NPS', value: 1.05 },
      { label: '1" NPS', value: 1.315 },
      { label: '1-1/4" NPS', value: 1.66 },
      { label: '1-1/2" NPS', value: 1.9 },
      { label: '2" NPS', value: 2.375 },
      { label: '2-1/2" NPS', value: 2.875 },
      { label: '3" NPS', value: 3.5 },
      { label: '4" NPS', value: 4.5 },
      { label: '6" NPS', value: 6.625 },
      { label: '8" NPS', value: 8.625 },
    ],
    thicknesses: PIPE_THICKNESSES,
    defaultSizeIdx: 5,
    defaultThkIdx: 2,
  },
  {
    id: 'angle',
    label: 'Angle',
    color: '#4a8060',
    isRound: false,
    isCustomSize: false,
    layer: 'default',
    sizes: [
      { label: '1"', value: 1 },
      { label: '1-1/2"', value: 1.5 },
      { label: '2"', value: 2 },
      { label: '2-1/2"', value: 2.5 },
      { label: '3"', value: 3 },
      { label: '4"', value: 4 },
      { label: '5"', value: 5 },
      { label: '6"', value: 6 },
    ],
    thicknesses: ANGLE_THICKNESSES,
    defaultSizeIdx: 2,
    defaultThkIdx: 2,
  },
  {
    id: 'channel',
    label: 'Channel',
    color: '#605090',
    isRound: false,
    isCustomSize: false,
    layer: 'default',
    sizes: [
      { label: '3"', value: 3 },
      { label: '4"', value: 4 },
      { label: '5"', value: 5 },
      { label: '6"', value: 6 },
      { label: '7"', value: 7 },
      { label: '8"', value: 8 },
      { label: '9"', value: 9 },
      { label: '10"', value: 10 },
      { label: '12"', value: 12 },
      { label: '15"', value: 15 },
    ],
    thicknesses: CHANNEL_THICKNESSES,
    defaultSizeIdx: 1,
    defaultThkIdx: 1,
  },
  {
    id: 'ibeam',
    label: 'I-Beam',
    color: '#405878',
    isRound: false,
    isCustomSize: false,
    layer: 'default',
    sizes: [
      { label: '3"', value: 3 },
      { label: '4"', value: 4 },
      { label: '5"', value: 5 },
      { label: '6"', value: 6 },
      { label: '8"', value: 8 },
      { label: '10"', value: 10 },
      { label: '12"', value: 12 },
    ],
    thicknesses: CHANNEL_THICKNESSES,
    defaultSizeIdx: 1,
    defaultThkIdx: 1,
  },
  {
    id: 'flat_bar',
    label: 'Flat Bar',
    color: '#806840',
    isRound: false,
    isCustomSize: false,
    layer: 'default',
    sizes: [
      { label: '3/4"', value: 0.75 },
      { label: '1"', value: 1 },
      { label: '1-1/4"', value: 1.25 },
      { label: '1-1/2"', value: 1.5 },
      { label: '2"', value: 2 },
      { label: '2-1/2"', value: 2.5 },
      { label: '3"', value: 3 },
      { label: '4"', value: 4 },
      { label: '6"', value: 6 },
    ],
    thicknesses: ANGLE_THICKNESSES,
    defaultSizeIdx: 4,
    defaultThkIdx: 2,
  },
  {
    id: 'sheet',
    label: 'Sheet',
    color: '#786050',
    isRound: false,
    isCustomSize: true,
    layer: 'top',
    sizes: [{ label: 'Custom', value: 0 }],
    thicknesses: SHEET_THICKNESSES,
    defaultSizeIdx: 0,
    defaultThkIdx: 3,
    defaultCustomW: 48,
    defaultCustomH: 48,
  },
  {
    id: 'plate',
    label: 'Plate',
    color: '#685040',
    isRound: false,
    isCustomSize: true,
    layer: 'top',
    sizes: [{ label: 'Custom', value: 0 }],
    thicknesses: PLATE_THICKNESSES,
    defaultSizeIdx: 0,
    defaultThkIdx: 2,
    defaultCustomW: 24,
    defaultCustomH: 24,
  },
]

export const SHEET_SIZE_PRESETS = [
  { label: '36x48"', w: 36, h: 48 },
  { label: '36x96"', w: 36, h: 96 },
  { label: '48x48"', w: 48, h: 48 },
  { label: '48x96"', w: 48, h: 96 },
  { label: '48x120"', w: 48, h: 120 },
  { label: '48x144"', w: 48, h: 144 },
  { label: '60x120"', w: 60, h: 120 },
  { label: '72x96"', w: 72, h: 96 },
  { label: '72x144"', w: 72, h: 144 },
  { label: 'Custom', w: 0, h: 0 },
]

export function getMaterial(type: MaterialType): MaterialConfig {
  return MATERIALS.find(m => m.id === type) ?? MATERIALS[0]
}

export function getSizeValue(type: MaterialType, sizeIdx: number): number | number[] {
  const mat = getMaterial(type)
  const idx = Math.max(0, Math.min(sizeIdx, mat.sizes.length - 1))
  return mat.sizes[idx].value
}

export function getSizeLabel(type: MaterialType, sizeIdx: number): string {
  const mat = getMaterial(type)
  const idx = Math.max(0, Math.min(sizeIdx, mat.sizes.length - 1))
  return mat.sizes[idx].label
}

export function getOD(type: MaterialType, sizeIdx: number): number {
  const sv = getSizeValue(type, sizeIdx)
  if (Array.isArray(sv)) return Math.max(sv[0], sv[1])
  return sv
}

export function getWall(type: MaterialType, thkIdx: number): number {
  const mat = getMaterial(type)
  const idx = Math.max(0, Math.min(thkIdx, mat.thicknesses.length - 1))
  return mat.thicknesses[idx].value
}

export function getWallLabel(type: MaterialType, thkIdx: number): string {
  const mat = getMaterial(type)
  const idx = Math.max(0, Math.min(thkIdx, mat.thicknesses.length - 1))
  return mat.thicknesses[idx].label
}

export function getThicknessForGrade(type: MaterialType, _grade: MaterialGrade, thkIdx: number): number {
  return getWall(type, thkIdx)
}
