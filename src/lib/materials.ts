import type { MaterialType } from '../types'

export interface SizeEntry { label: string; value: number | [number,number] }
export interface ThkEntry { label: string; value: number }

export interface MaterialDef {
  type: MaterialType
  label: string
  color: string
  isRound: boolean
  isCustomSize: boolean
  sizes: SizeEntry[]
  thicknesses: ThkEntry[]
  svgIcon: string
  defaultSizeIdx: number
  defaultThkIdx: number
}

export const MATERIALS: Record<MaterialType, MaterialDef> = {
  square_tube: {
    type: 'square_tube', label: 'Square Tube', color: '#4a7aaa', isRound: false, isCustomSize: false,
    defaultSizeIdx: 5, defaultThkIdx: 1,
    sizes: [
      {label:'1/2"',value:0.5},{label:'3/4"',value:0.75},{label:'1"',value:1},{label:'1-1/4"',value:1.25},
      {label:'1-1/2"',value:1.5},{label:'2"',value:2},{label:'2-1/2"',value:2.5},{label:'3"',value:3},
      {label:'4"',value:4},{label:'5"',value:5},{label:'6"',value:6}
    ],
    thicknesses: [
      {label:'16ga .065"',value:0.065},{label:'14ga .083"',value:0.083},{label:'13ga .095"',value:0.095},
      {label:'11ga .120"',value:0.120},{label:'10ga .135"',value:0.135},{label:'3/16"',value:0.1875},
      {label:'1/4"',value:0.250},{label:'5/16"',value:0.3125},{label:'3/8"',value:0.375},{label:'1/2"',value:0.500}
    ],
    svgIcon: `<svg viewBox="0 0 44 28" width="44" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="4" width="24" height="20" rx="0.5" fill="#3a6a9a" stroke="rgba(200,220,255,0.6)" stroke-width="1.5"/><rect x="14" y="8" width="16" height="12" rx="0.5" fill="rgba(0,0,0,0.65)"/></svg>`,
  },
  round_tube: {
    type: 'round_tube', label: 'Round Tube', color: '#5a70ba', isRound: true, isCustomSize: false,
    defaultSizeIdx: 5, defaultThkIdx: 1,
    sizes: [
      {label:'1/2"',value:0.5},{label:'3/4"',value:0.75},{label:'1"',value:1},{label:'1-1/4"',value:1.25},
      {label:'1-1/2"',value:1.5},{label:'2"',value:2},{label:'2-1/2"',value:2.5},{label:'3"',value:3},
      {label:'4"',value:4},{label:'6"',value:6}
    ],
    thicknesses: [
      {label:'16ga .065"',value:0.065},{label:'14ga .083"',value:0.083},{label:'13ga .095"',value:0.095},
      {label:'11ga .120"',value:0.120},{label:'3/16"',value:0.1875},{label:'1/4"',value:0.250},
      {label:'5/16"',value:0.3125},{label:'3/8"',value:0.375}
    ],
    svgIcon: `<svg viewBox="0 0 44 28" width="44" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="14" r="11" fill="#3a6a9a" stroke="rgba(200,220,255,0.6)" stroke-width="1.5"/><circle cx="22" cy="14" r="6.5" fill="rgba(0,0,0,0.65)"/></svg>`,
  },
  rect_tube: {
    type: 'rect_tube', label: 'Rect Tube', color: '#4a8aaa', isRound: false, isCustomSize: false,
    defaultSizeIdx: 2, defaultThkIdx: 1,
    sizes: [
      {label:'1x2"',value:[1,2]},{label:'1x3"',value:[1,3]},{label:'1-1/2x3"',value:[1.5,3]},
      {label:'2x3"',value:[2,3]},{label:'2x4"',value:[2,4]},{label:'2x6"',value:[2,6]},
      {label:'3x4"',value:[3,4]},{label:'3x6"',value:[3,6]},{label:'4x6"',value:[4,6]},{label:'4x8"',value:[4,8]}
    ],
    thicknesses: [
      {label:'16ga .065"',value:0.065},{label:'14ga .083"',value:0.083},{label:'13ga .095"',value:0.095},
      {label:'11ga .120"',value:0.120},{label:'3/16"',value:0.1875},{label:'1/4"',value:0.250},
      {label:'3/8"',value:0.375},{label:'1/2"',value:0.500}
    ],
    svgIcon: `<svg viewBox="0 0 44 28" width="44" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="7" width="36" height="14" rx="0.5" fill="#3a6a9a" stroke="rgba(200,220,255,0.6)" stroke-width="1.5"/><rect x="8" y="11" width="28" height="6" rx="0.5" fill="rgba(0,0,0,0.65)"/></svg>`,
  },
  pipe: {
    type: 'pipe', label: 'Pipe', color: '#607090', isRound: true, isCustomSize: false,
    defaultSizeIdx: 4, defaultThkIdx: 2,
    sizes: [
      {label:'1/2" NPS',value:0.84},{label:'3/4" NPS',value:1.05},{label:'1" NPS',value:1.315},
      {label:'1-1/4" NPS',value:1.66},{label:'1-1/2" NPS',value:1.9},{label:'2" NPS',value:2.375},
      {label:'2-1/2" NPS',value:2.875},{label:'3" NPS',value:3.5},{label:'4" NPS',value:4.5},
      {label:'6" NPS',value:6.625},{label:'8" NPS',value:8.625}
    ],
    thicknesses: [
      {label:'Sch 5',value:0.065},{label:'Sch 10',value:0.109},{label:'Sch 40',value:0.145},
      {label:'Sch 80',value:0.200},{label:'Sch 160',value:0.281},{label:'XXH',value:0.375}
    ],
    svgIcon: `<svg viewBox="0 0 44 28" width="44" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="14" r="11" fill="#506070" stroke="rgba(200,220,255,0.5)" stroke-width="1.5"/><circle cx="22" cy="14" r="5" fill="rgba(0,0,0,0.65)"/></svg>`,
  },
  angle: {
    type: 'angle', label: 'Angle Iron', color: '#4a8060', isRound: false, isCustomSize: false,
    defaultSizeIdx: 3, defaultThkIdx: 2,
    sizes: [
      {label:'1x1"',value:1},{label:'1-1/2x1-1/2"',value:1.5},{label:'2x2"',value:2},
      {label:'2-1/2x2-1/2"',value:2.5},{label:'3x3"',value:3},{label:'4x4"',value:4},
      {label:'5x5"',value:5},{label:'6x6"',value:6}
    ],
    thicknesses: [
      {label:'1/8"',value:0.125},{label:'3/16"',value:0.1875},{label:'1/4"',value:0.250},
      {label:'5/16"',value:0.3125},{label:'3/8"',value:0.375},{label:'1/2"',value:0.500},
      {label:'5/8"',value:0.625},{label:'3/4"',value:0.750}
    ],
    svgIcon: `<svg viewBox="0 0 44 28" width="44" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="18" width="30" height="6" fill="#3a7060" stroke="rgba(180,220,200,0.5)" stroke-width="1.5"/><rect x="7" y="4" width="6" height="20" fill="#3a7060" stroke="rgba(180,220,200,0.5)" stroke-width="1"/></svg>`,
  },
  channel: {
    type: 'channel', label: 'C-Channel', color: '#506090', isRound: false, isCustomSize: false,
    defaultSizeIdx: 3, defaultThkIdx: 2,
    sizes: [
      {label:'C3',value:3},{label:'C4',value:4},{label:'C5',value:5},{label:'C6',value:6},
      {label:'C7',value:7},{label:'C8',value:8},{label:'C9',value:9},{label:'C10',value:10},
      {label:'C12',value:12},{label:'C15',value:15}
    ],
    thicknesses: [
      {label:'3/16"',value:0.1875},{label:'1/4"',value:0.250},{label:'5/16"',value:0.3125},
      {label:'3/8"',value:0.375},{label:'1/2"',value:0.500}
    ],
    svgIcon: `<svg viewBox="0 0 44 28" width="44" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="4" width="6" height="20" fill="#506090"/><rect x="7" y="4" width="26" height="5" fill="#506090" stroke="rgba(180,200,255,0.4)" stroke-width="1"/><rect x="7" y="19" width="26" height="5" fill="#506090" stroke="rgba(180,200,255,0.4)" stroke-width="1"/></svg>`,
  },
  ibeam: {
    type: 'ibeam', label: 'I-Beam', color: '#405070', isRound: false, isCustomSize: false,
    defaultSizeIdx: 2, defaultThkIdx: 2,
    sizes: [
      {label:'S3',value:3},{label:'S4',value:4},{label:'S5',value:5},{label:'S6',value:6},
      {label:'W6',value:6},{label:'W8',value:8},{label:'W10',value:10},{label:'W12',value:12}
    ],
    thicknesses: [
      {label:'3/16"',value:0.1875},{label:'1/4"',value:0.250},{label:'5/16"',value:0.3125},
      {label:'3/8"',value:0.375},{label:'1/2"',value:0.500}
    ],
    svgIcon: `<svg viewBox="0 0 44 28" width="44" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="36" height="5" fill="#405070" stroke="rgba(160,190,255,0.4)" stroke-width="1"/><rect x="4" y="19" width="36" height="5" fill="#405070" stroke="rgba(160,190,255,0.4)" stroke-width="1"/><rect x="19" y="9" width="6" height="10" fill="#405070"/></svg>`,
  },
  flat_bar: {
    type: 'flat_bar', label: 'Flat Bar', color: '#806040', isRound: false, isCustomSize: false,
    defaultSizeIdx: 3, defaultThkIdx: 2,
    sizes: [
      {label:'3/4"',value:0.75},{label:'1"',value:1},{label:'1-1/4"',value:1.25},
      {label:'1-1/2"',value:1.5},{label:'2"',value:2},{label:'2-1/2"',value:2.5},
      {label:'3"',value:3},{label:'4"',value:4},{label:'5"',value:5},{label:'6"',value:6}
    ],
    thicknesses: [
      {label:'1/8"',value:0.125},{label:'3/16"',value:0.1875},{label:'1/4"',value:0.250},
      {label:'5/16"',value:0.3125},{label:'3/8"',value:0.375},{label:'1/2"',value:0.500},
      {label:'5/8"',value:0.625},{label:'3/4"',value:0.750},{label:'1"',value:1.000}
    ],
    svgIcon: `<svg viewBox="0 0 44 28" width="44" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="11" width="36" height="6" rx="0.5" fill="#706040" stroke="rgba(220,210,180,0.5)" stroke-width="1.5"/></svg>`,
  },
  sheet: {
    type: 'sheet', label: 'Sheet Metal', color: '#705040', isRound: false, isCustomSize: true,
    defaultSizeIdx: 0, defaultThkIdx: 4,
    sizes: [
      {label:'36x48"',value:[36,48]},{label:'36x96"',value:[36,96]},{label:'48x48"',value:[48,48]},
      {label:'48x96"',value:[48,96]},{label:'48x120"',value:[48,120]},{label:'48x144"',value:[48,144]},
      {label:'60x120"',value:[60,120]},{label:'72x96"',value:[72,96]},{label:'72x144"',value:[72,144]},
      {label:'Custom',value:[0,0]}
    ],
    thicknesses: [
      {label:'30ga .012"',value:0.012},{label:'28ga .0149"',value:0.0149},{label:'26ga .0179"',value:0.0179},
      {label:'24ga .0239"',value:0.0239},{label:'22ga .0299"',value:0.0299},{label:'20ga .0359"',value:0.0359},
      {label:'18ga .0478"',value:0.0478},{label:'16ga .0598"',value:0.0598},{label:'14ga .0747"',value:0.0747},
      {label:'12ga .1046"',value:0.1046},{label:'11ga .1196"',value:0.1196},{label:'10ga .1345"',value:0.1345},
      {label:'7ga .1793"',value:0.1793}
    ],
    svgIcon: `<svg viewBox="0 0 44 28" width="44" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="12" width="38" height="4" fill="#705040" stroke="rgba(220,200,180,0.5)" stroke-width="1.5"/><line x1="12" y1="10" x2="12" y2="18" stroke="rgba(255,255,255,0.3)" stroke-width="1"/><line x1="21" y1="10" x2="21" y2="18" stroke="rgba(255,255,255,0.3)" stroke-width="1"/><line x1="30" y1="10" x2="30" y2="18" stroke="rgba(255,255,255,0.3)" stroke-width="1"/></svg>`,
  },
  plate: {
    type: 'plate', label: 'Plate', color: '#604030', isRound: false, isCustomSize: true,
    defaultSizeIdx: 0, defaultThkIdx: 3,
    sizes: [
      {label:'6x6"',value:[6,6]},{label:'6x12"',value:[6,12]},{label:'12x12"',value:[12,12]},
      {label:'12x24"',value:[12,24]},{label:'24x24"',value:[24,24]},{label:'24x48"',value:[24,48]},
      {label:'Custom',value:[0,0]}
    ],
    thicknesses: [
      {label:'1/8"',value:0.125},{label:'3/16"',value:0.1875},{label:'1/4"',value:0.250},
      {label:'5/16"',value:0.3125},{label:'3/8"',value:0.375},{label:'1/2"',value:0.500},
      {label:'5/8"',value:0.625},{label:'3/4"',value:0.750},{label:'1"',value:1.000},
      {label:'1-1/4"',value:1.250},{label:'1-1/2"',value:1.500},{label:'2"',value:2.000}
    ],
    svgIcon: `<svg viewBox="0 0 44 28" width="44" height="28" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="8" width="38" height="12" rx="0.5" fill="#604030" stroke="rgba(220,200,180,0.5)" stroke-width="2"/><line x1="3" y1="12" x2="41" y2="12" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/><line x1="3" y1="16" x2="41" y2="16" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></svg>`,
  },
}

export function getSizeValue(type: MaterialType, sizeIdx: number): number | [number,number] {
  const mat = MATERIALS[type]
  const entry = mat.sizes[sizeIdx] ?? mat.sizes[mat.defaultSizeIdx]
  return entry.value
}

export function getOD(type: MaterialType, sizeIdx: number): number {
  const v = getSizeValue(type, sizeIdx)
  if (Array.isArray(v)) return v[0]
  return v as number
}

export function getWidth(type: MaterialType, sizeIdx: number): number {
  return getOD(type, sizeIdx)
}

export function getHeight(type: MaterialType, sizeIdx: number): number {
  const v = getSizeValue(type, sizeIdx)
  if (Array.isArray(v)) return v[1]
  return v as number
}

export function getWall(type: MaterialType, thkIdx: number): number {
  const mat = MATERIALS[type]
  return (mat.thicknesses[thkIdx] ?? mat.thicknesses[0]).value
}
