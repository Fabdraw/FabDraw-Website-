import React, { useState } from 'react'
import { X, Zap, Loader2, AlertCircle } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import type { Member } from '../types'

type ParsedMember = Omit<Member, 'id'>

const ENV = (import.meta as unknown as { env: Record<string, string> }).env

const BASE_SYSTEM_PROMPT = `You are a fabrication CAD assistant for FabDraw. Return ONLY a valid JSON array of Member objects. No markdown, no code fences, no explanation. The response must start with [ and end with ].

Each Member object must have EXACTLY these fields:
{
  "type": one of: "square_tube" | "round_tube" | "rect_tube" | "pipe" | "angle" | "channel" | "i_beam" | "flat_bar" | "sheet" | "plate",
  "size": string — "2x2" for square/rect/angle/channel/i_beam, "2" for round/pipe, "3x0.25" for flat_bar (heightxwidth), "48x96" for sheet/plate,
  "wallThickness": string like "0.120" or "0.083" or "0.1875",
  "grade": one of: "mild" | "stainless" | "aluminum",
  "length": number in inches (always positive),
  "position": { "x": number, "y": number, "z": number },
  "rotation": { "x": number, "y": number, "z": 0 },
  "holes": []
}

COORDINATE SYSTEM:
- position.x and position.y are the 2D plan view coordinates in inches (top-down view)
- position.z is height above floor in inches
- rotation.x = 90 means the member is an upright vertical column (stands up from floor)
- rotation.x = 0 means the member is horizontal/lying flat
- rotation.y = 0 means the member runs along the X axis (left-right)
- rotation.y = 90 means the member runs along the Y axis (front-back)
- rotation.y = 45 means diagonal at 45 degrees in plan view
- position for horizontal members = center point of the member

IMPORTANT: Never omit any field. Always include all fields for every member.`

async function callAPI(userMessage: string): Promise<string> {
  const apiKey = ENV.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: ENV.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: BASE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return (data.content?.[0]?.text ?? '') as string
}

function mapMember(obj: Record<string, unknown>): ParsedMember {
  const pos = (obj.position ?? {}) as Record<string, unknown>
  const rot = (obj.rotation ?? {}) as Record<string, unknown>
  return {
    type: (obj.type as Member['type']) || 'square_tube',
    size: typeof obj.size === 'string' ? obj.size : '2x2',
    wallThickness: typeof obj.wallThickness === 'string' ? obj.wallThickness : '0.120',
    grade: (['mild', 'stainless', 'aluminum'].includes(obj.grade as string) ? obj.grade as Member['grade'] : 'mild'),
    length: typeof obj.length === 'number' ? obj.length : 24,
    position: {
      x: typeof pos.x === 'number' ? pos.x : 0,
      y: typeof pos.y === 'number' ? pos.y : 0,
      z: typeof pos.z === 'number' ? pos.z : 0,
    },
    rotation: {
      x: typeof rot.x === 'number' ? rot.x : 0,
      y: typeof rot.y === 'number' ? rot.y : 0,
      z: 0,
    },
    holes: [],
  }
}

function parseMembers(text: string): ParsedMember[] {
  const cleaned = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
  const arr = JSON.parse(cleaned)
  if (!Array.isArray(arr)) throw new Error('Expected a JSON array')
  return arr.map((obj: unknown) => mapMember(obj as Record<string, unknown>))
}

interface Template {
  id: string
  name: string
  description: string
  defaultW: number
  defaultD: number
  defaultH: number
  buildPrompt: (w: number, d: number, h: number) => string
}

const TEMPLATES: Template[] = [
  {
    id: 'welding-table',
    name: 'Welding Table',
    description: 'Flat work surface frame with 4 legs, top frame, and bottom stretcher.',
    defaultW: 48, defaultD: 24, defaultH: 34,
    buildPrompt: (w, d, h) => `Build a welding table frame with these exact dimensions: Width=${w}", Depth=${d}", Height=${h}".

Structure:
- 4 vertical legs at corners: positions (0,0), (${w},0), (0,${d}), (${w},${d}). All rotation.x=90, length=${h}, position.z=0.
- 2 long top rails (along X axis): length=${w}, rotation.y=0, position.y=0 and position.y=${d}, position.z=${h - 2}, position.x=${w / 2}.
- 2 short top rails (along Y axis): length=${d}, rotation.y=90, position.x=0 and position.x=${w}, position.z=${h - 2}, position.y=${d / 2}.
- 2 long bottom stretchers at z=4: length=${w}, rotation.y=0, position.y=0 and position.y=${d}, position.z=4, position.x=${w / 2}.
- 2 short bottom stretchers at z=4: length=${d}, rotation.y=90, position.x=0 and position.x=${w}, position.z=4, position.y=${d / 2}.

All members: type="square_tube", size="2x2", wallThickness="0.120", grade="mild".`,
  },
  {
    id: 'workbench-shelf',
    name: 'Workbench with Lower Shelf',
    description: '6-leg workbench with a full lower shelf frame at 18" from floor.',
    defaultW: 72, defaultD: 24, defaultH: 36,
    buildPrompt: (w, d, h) => `Build a workbench with lower shelf: Width=${w}", Depth=${d}", Height=${h}".

Structure:
- 6 vertical legs: 4 at corners (0,0),(${w},0),(0,${d}),(${w},${d}) plus 2 mid-span legs at (${w / 2},0) and (${w / 2},${d}). All rotation.x=90, length=${h}, z=0.
- Top frame: 2 long rails length=${w} at y=0 and y=${d}, z=${h - 2}, x=${w / 2}, rotation.y=0. 2 short rails length=${d} at x=0 and x=${w}, z=${h - 2}, y=${d / 2}, rotation.y=90.
- Lower shelf frame at z=18: same layout as top frame — 2 long (length=${w}) and 2 short (length=${d}).
- Bottom stretchers at z=4: 2 long and 2 short, same layout.

All: type="square_tube", size="2x2", wallThickness="0.120", grade="mild".`,
  },
  {
    id: 'standing-desk',
    name: 'Standing Desk Frame',
    description: 'Minimal 4-leg desk with mid-height side braces.',
    defaultW: 60, defaultD: 30, defaultH: 42,
    buildPrompt: (w, d, h) => `Build a standing desk frame: Width=${w}", Depth=${d}", Height=${h}".

Structure:
- 4 vertical legs at corners (0,0),(${w},0),(0,${d}),(${w},${d}). rotation.x=90, length=${h}, z=0.
- Top frame: 2 long rails length=${w} at y=0 and y=${d}, z=${h - 1.5}, x=${w / 2}, rotation.y=0. 2 short rails length=${d} at x=0 and x=${w}, z=${h - 1.5}, y=${d / 2}, rotation.y=90.
- 2 cross braces on long sides at mid height z=${h / 2}: length=${w}, rotation.y=0, position.y=0 and position.y=${d}, x=${w / 2}.

All: type="square_tube", size="1.5x1.5", wallThickness="0.083", grade="mild".`,
  },
  {
    id: 'coffee-table',
    name: 'Coffee Table Base',
    description: 'Low 4-leg base with top frame and lower shelf.',
    defaultW: 48, defaultD: 24, defaultH: 18,
    buildPrompt: (w, d, h) => `Build a coffee table base: Width=${w}", Depth=${d}", Height=${h}".

Structure:
- 4 vertical legs at corners. rotation.x=90, length=${h}, z=0.
- Top frame: 2 long rails (length=${w}, rotation.y=0) and 2 short rails (length=${d}, rotation.y=90) at z=${h - 1.5}.
- Lower shelf frame at z=4: 2 long and 2 short same layout.

All: type="square_tube", size="1.5x1.5", wallThickness="0.083", grade="mild".`,
  },
  {
    id: 'dining-table',
    name: 'Dining Table Base',
    description: 'Two end frames connected by long side stretchers.',
    defaultW: 72, defaultD: 36, defaultH: 30,
    buildPrompt: (w, d, h) => `Build a dining table base: Width=${w}", Depth=${d}", Height=${h}".

Structure:
- Left end frame (x=4): 2 vertical legs at (4,0) and (4,${d}), rotation.x=90, length=${h}. Top rail: length=${d}, rotation.y=90, x=4, y=${d / 2}, z=${h - 2}. Bottom rail: length=${d}, rotation.y=90, x=4, y=${d / 2}, z=6.
- Right end frame (x=${w - 4}): 2 vertical legs at (${w - 4},0) and (${w - 4},${d}), same. Top rail same at x=${w - 4}. Bottom rail same at x=${w - 4}.
- 2 long side stretchers connecting end frames at mid height z=${h / 2}: length=${w - 8}, rotation.y=0, x=${w / 2}, y=6 and y=${d - 6}.

All: type="square_tube", size="2x2", wallThickness="0.120", grade="mild".`,
  },
  {
    id: 'shelving-unit',
    name: 'Single Bay Shelving Unit',
    description: 'Four-shelf storage unit with front and back uprights.',
    defaultW: 48, defaultD: 24, defaultH: 72,
    buildPrompt: (w, d, h) => {
      const shelfSpacing = h / 4
      const shelves = [shelfSpacing, shelfSpacing * 2, shelfSpacing * 3, h - 2]
      return `Build a single bay shelving unit: Width=${w}", Depth=${d}", Height=${h}".

Structure:
- 4 vertical uprights at corners (0,0),(${w},0),(0,${d}),(${w},${d}). rotation.x=90, length=${h}, z=0.
- 4 shelf levels at z=${shelves.map(s => s.toFixed(1)).join(', ')}. Each shelf: 2 long rails length=${w} (rotation.y=0, x=${w / 2}, y=0 and y=${d}) + 2 short rails length=${d} (rotation.y=90, x=0 and x=${w}, y=${d / 2}).

All: type="square_tube", size="1.5x1.5", wallThickness="0.083", grade="mild".`
    },
  },
  {
    id: 'garage-rack',
    name: 'Garage Storage Rack',
    description: '3-bay heavy duty rack with diagonal back bracing.',
    defaultW: 96, defaultD: 24, defaultH: 84,
    buildPrompt: (w, d, h) => {
      const bw = w / 3
      const shelfZ = [h / 4, h / 2, h * 3 / 4, h - 2]
      return `Build a garage storage rack: Width=${w}", Depth=${d}", Height=${h}".

Structure:
- 6 vertical uprights: at x=0,${bw},${w * 2 / 3},${w} front (y=0) and back (y=${d}). rotation.x=90, length=${h}, z=0.
- 4 shelf levels at z=${shelfZ.map(s => s.toFixed(1)).join(', ')}. Each level: 3 long front rails and 3 long back rails (length=${bw}, positions at x=${bw / 2},${bw + bw / 2},${bw * 2 + bw / 2}, rotation.y=0, y=0 and y=${d}).
- Diagonal back bracing: 2 diagonal members per bay crossing between uprights from z=0 to z=${h} at y=${d}, rotation.y=0 approximately, at 45 degree angles.

All: type="square_tube", size="2x2", wallThickness="0.120", grade="mild".`
    },
  },
  {
    id: 'pipe-rack',
    name: 'Pipe & Material Storage Rack',
    description: 'Cantilever arms at 4 levels for storing long pipe and bar stock.',
    defaultW: 48, defaultD: 24, defaultH: 48,
    buildPrompt: (w, d, h) => `Build a pipe and material storage rack: Width=${w}", Depth=${d}", Height=${h}".

Structure:
- 2 vertical uprights: at x=${w / 2 - 2}, y=0 and x=${w / 2 + 2}, y=0. rotation.x=90, type="square_tube", size="2x2", wallThickness="0.120", length=${h}, z=0.
- 8 horizontal cantilever arms at 4 heights (z=${h / 4 * 1},${h / 4 * 2},${h / 4 * 3},${h - 4}), 2 arms per height pointing along Y axis (rotation.y=90). Arms: type="flat_bar", size="3x0.25", length=${d}, wallThickness="0.25". Left arm at x=${w / 2 - 2}, right arm at x=${w / 2 + 2}, y=${d / 2}.
- Top horizontal connecting rail: type="square_tube", size="2x2", length=4, rotation.y=0, z=${h}, x=${w / 2}, y=0.

grade="mild" for all.`,
  },
  {
    id: 'wall-bracket',
    name: 'Wall Bracket Shelf',
    description: 'Two L-shaped wall brackets with diagonal braces.',
    defaultW: 36, defaultD: 12, defaultH: 12,
    buildPrompt: (w, d, h) => `Build a wall bracket shelf: Width=${w}", Depth=${d}", Height=${h}".

Structure (2 brackets at x=${w / 3} and x=${w * 2 / 3}):
- 2 horizontal members: type="flat_bar", size="3x0.25", length=${d}, rotation.y=90, z=${h}, at x=${w / 3} and x=${w * 2 / 3}, y=${d / 2}.
- 2 diagonal brace members: type="flat_bar", size="3x0.25", length=${Math.sqrt(d * d + h * h).toFixed(1)}, rotation.y=90 angled downward at ~${Math.atan2(h, d) * 180 / Math.PI | 0} degrees, from wall (y=0,z=${h}) to tip (y=${d},z=0). Place at x=${w / 3} and x=${w * 2 / 3}.
- 1 top shelf rail connecting brackets: type="flat_bar", size="3x0.25", length=${w}, rotation.y=0, z=${h}, y=${d / 2}, x=${w / 2}.

grade="mild".`,
  },
  {
    id: 'machine-skid',
    name: 'Machine Base Skid',
    description: 'Heavy perimeter frame with longitudinal runners and forklift pockets.',
    defaultW: 48, defaultD: 36, defaultH: 6,
    buildPrompt: (w, d, h) => `Build a machine base skid: Width=${w}", Depth=${d}", Height=${h}".

Structure:
- Perimeter frame at z=0: 2 long sides length=${w} (rotation.y=0, y=0 and y=${d}, x=${w / 2}) + 2 short sides length=${d} (rotation.y=90, x=0 and x=${w}, y=${d / 2}).
- 3 longitudinal runners evenly spaced: length=${w}, rotation.y=0, at y=${d / 4},${d / 2},${d * 3 / 4}, x=${w / 2}, z=0.
- 2 forklift pocket tubes: length=${d}, rotation.y=90, at x=${w / 4} and x=${w * 3 / 4}, y=${d / 2}, z=3.

All: type="square_tube", size="3x3", wallThickness="0.1875", grade="mild".`,
  },
  {
    id: 'equipment-stand',
    name: 'Equipment Stand',
    description: '4-leg stand with top/bottom frames and X bracing on all 4 sides.',
    defaultW: 24, defaultD: 24, defaultH: 36,
    buildPrompt: (w, d, h) => `Build an equipment stand: Width=${w}", Depth=${d}", Height=${h}".

Structure:
- 4 vertical legs at corners (0,0),(${w},0),(0,${d}),(${w},${d}). rotation.x=90, length=${h}, z=0.
- Top frame: 2 long (length=${w}, y=0 and y=${d}, z=${h - 2}) + 2 short (length=${d}, x=0 and x=${w}, z=${h - 2}).
- Bottom frame: same layout at z=2.
- X bracing: 4 diagonal members. Front (y=0): 2 diagonals from (0,0,2) to (${w},0,${h - 2}) and (${w},0,2) to (0,0,${h - 2}). Back (y=${d}): same. Right (x=${w}): 2 diagonals (${w},0,2)-(${w},${d},${h - 2}) and (${w},${d},2)-(${w},0,${h - 2}).

All: type="square_tube", size="2x2", wallThickness="0.120", grade="mild".`,
  },
  {
    id: 'welding-cart',
    name: 'Welding Cart',
    description: 'Rolling cart with 3 shelf levels and rear handle.',
    defaultW: 24, defaultD: 18, defaultH: 36,
    buildPrompt: (w, d, h) => `Build a welding cart frame: Width=${w}", Depth=${d}", Height=${h}".

Structure:
- 4 vertical legs at corners. rotation.x=90, length=${h}, z=0.
- Top shelf frame at z=${h - 1.5}: 2 long (length=${w}) + 2 short (length=${d}).
- Middle shelf frame at z=${h * 2 / 3}: 2 long + 2 short.
- Bottom shelf frame at z=4: 2 long + 2 short.
- Handle: 1 member across back top, length=${w}, rotation.y=0, y=${d}, z=${h + 4}, x=${w / 2}.

All: type="square_tube", size="1.5x1.5", wallThickness="0.083", grade="mild".`,
  },
  {
    id: 'tool-cart',
    name: 'Tool Cart Frame',
    description: 'Cart frame with drawer cavity between mid and top shelf.',
    defaultW: 30, defaultD: 18, defaultH: 34,
    buildPrompt: (w, d, h) => `Build a tool cart frame: Width=${w}", Depth=${d}", Height=${h}".

Structure:
- 4 vertical legs at corners. rotation.x=90, length=${h}, z=0.
- Top frame at z=${h - 1.5}: 2 long (length=${w}) + 2 short (length=${d}).
- Mid shelf at z=${h / 2}: 2 long + 2 short. (Drawer space between mid and top.)
- Bottom shelf at z=4: 2 long + 2 short.

All: type="square_tube", size="1.5x1.5", wallThickness="0.083", grade="mild".`,
  },
  {
    id: 'gate-frame',
    name: 'Gate Frame',
    description: 'Rectangular gate with single diagonal brace.',
    defaultW: 48, defaultD: 2, defaultH: 60,
    buildPrompt: (w, d, h) => `Build a gate frame: Width=${w}", Height=${h}".

Structure (flat gate, minimal depth):
- Left vertical stile: rotation.x=90, length=${h}, position=(0,0,0).
- Right vertical stile: rotation.x=90, length=${h}, position=(${w},0,0).
- Top rail: length=${w}, rotation.y=0, y=0, z=${h - 1.5}, x=${w / 2}.
- Bottom rail: length=${w}, rotation.y=0, y=0, z=1.5, x=${w / 2}.
- Diagonal brace from (0,0,1.5) to (${w},0,${h - 1.5}): length=${Math.sqrt(w * w + h * h).toFixed(1)}, rotation.y=${(Math.atan2(h, w) * 180 / Math.PI * -1 + 90).toFixed(1)}, x=${w / 2}, y=0, z=${h / 2}.

All: type="square_tube", size="1.5x1.5", wallThickness="0.083", grade="mild".`,
  },
  {
    id: 'fence-panel',
    name: 'Fence Panel Frame',
    description: 'Wide fence panel with end posts and mid pickets.',
    defaultW: 96, defaultD: 2, defaultH: 48,
    buildPrompt: (w, d, h) => `Build a fence panel frame: Width=${w}", Height=${h}".

Structure (flat panel):
- 2 end posts: rotation.x=90, length=${h}, at x=0 and x=${w}, y=0, z=0.
- 2 mid pickets: rotation.x=90, length=${h}, at x=${w / 3} and x=${w * 2 / 3}, y=0, z=0.
- Top rail: length=${w}, rotation.y=0, y=0, z=${h - 1.5}, x=${w / 2}.
- Bottom rail: length=${w}, rotation.y=0, y=0, z=1.5, x=${w / 2}.

All: type="square_tube", size="1.5x1.5", wallThickness="0.083", grade="mild".`,
  },
  {
    id: 'handrail',
    name: 'Handrail Section',
    description: 'Two posts with top rail, mid rail, and kick plate.',
    defaultW: 36, defaultD: 4, defaultH: 42,
    buildPrompt: (w, d, h) => `Build a handrail section: Width=${w}", Height=${h}".

Structure:
- 2 vertical posts: rotation.x=90, length=${h}, at x=0 and x=${w}, y=0, z=0.
- Top rail: length=${w}, rotation.y=0, y=0, z=${h - 2}, x=${w / 2}.
- Mid rail: length=${w}, rotation.y=0, y=0, z=${h / 2}, x=${w / 2}.
- Kick plate: length=${w}, rotation.y=0, y=0, z=4, x=${w / 2}.

All: type="round_tube", size="1.5", wallThickness="0.083", grade="mild".`,
  },
  {
    id: 'stair-stringer',
    name: 'Stair Stringer',
    description: 'Diagonal stringer pair with 4 horizontal tread supports.',
    defaultW: 48, defaultD: 6, defaultH: 36,
    buildPrompt: (w, d, h) => `Build a stair stringer assembly: Horizontal run=${w}", Rise=${h}", Depth=${d}".

Structure:
- Left stringer: type="channel", size="4x1.5", wallThickness="0.25", length=${Math.sqrt(w * w + h * h).toFixed(1)}, grade="mild". Position at x=${w / 2}, y=0, z=${h / 2}. Rotation.y=90 (runs in X direction), rotation.x=${(Math.atan2(h, w) * 180 / Math.PI).toFixed(1)}.
- Right stringer: same but y=${d}.
- 4 tread supports (flat bar) horizontal at step heights z=${h / 4 * 1},${h / 4 * 2},${h / 4 * 3},${h}: type="flat_bar", size="3x0.25", wallThickness="0.25", length=${d}, rotation.y=90, at x=${w / 4 * 1},${w / 4 * 2},${w / 4 * 3},${w}, y=${d / 2}.

grade="mild".`,
  },
  {
    id: 'trailer-frame',
    name: 'Trailer Frame',
    description: 'Rectangular trailer frame with tongue and crossmembers.',
    defaultW: 96, defaultD: 48, defaultH: 6,
    buildPrompt: (w, d, h) => `Build a trailer frame: Width=${w}", Length=${d}", Height=${h}".

Structure:
- Perimeter: 2 long side rails length=${d} (rotation.y=90, at x=0 and x=${w}, y=${d / 2}, z=3) + front rail length=${w} (rotation.y=0, y=0, z=3, x=${w / 2}) + rear double bumper 2 members at y=${d}, z=3.
- 3 crossmembers: length=${w}, rotation.y=0, at y=${d / 4},${d / 2},${d * 3 / 4}, x=${w / 2}, z=3.
- Tongue: 2 angled members from front corners (x=6,y=0,z=3) and (x=${w - 6},y=0,z=3) converging to point (x=${w / 2},y=-24,z=3). Each length approx ${Math.sqrt(Math.pow(w / 2 - 6, 2) + 24 * 24).toFixed(0)}, angled inward.

All: type="square_tube", size="3x3", wallThickness="0.1875", grade="mild".`,
  },
  {
    id: 'truck-rack',
    name: 'Truck Bed Rack',
    description: 'Bed rack with 4 legs and top rail frame.',
    defaultW: 65, defaultD: 72, defaultH: 24,
    buildPrompt: (w, d, h) => `Build a truck bed rack: Width=${w}", Length=${d}", Height=${h}".

Structure:
- 4 vertical legs at corners (0,0),(${w},0),(0,${d}),(${w},${d}). rotation.x=90, length=${h}, z=0.
- 2 long top rails: length=${d}, rotation.y=90, at x=0 and x=${w}, y=${d / 2}, z=${h - 1.5}.
- 2 end cross members: length=${w}, rotation.y=0, at y=0 and y=${d}, z=${h - 1.5}, x=${w / 2}.
- 1 mid cross member: length=${w}, rotation.y=0, at y=${d / 2}, z=${h - 1.5}, x=${w / 2}.

All: type="square_tube", size="1.5x1.5", wallThickness="0.083", grade="mild".`,
  },
  {
    id: 'motorcycle-stand',
    name: 'Motorcycle / ATV Stand',
    description: 'Flat base stand with ramp approach and side supports.',
    defaultW: 24, defaultD: 48, defaultH: 12,
    buildPrompt: (w, d, h) => `Build a motorcycle/ATV stand: Width=${w}", Length=${d}", Height=${h}".

Structure:
- Base frame at z=${h}: 2 long sides length=${d} (rotation.y=90, x=0 and x=${w}, y=${d / 2}) + 2 short ends length=${w} (rotation.y=0, y=0 and y=${d}, x=${w / 2}).
- 4 vertical legs at corners: rotation.x=90, length=${h}, z=0.
- 2 diagonal ramp approach members at front (y<0): from corner (x=0,y=0,z=${h}) and (x=${w},y=0,z=${h}) angling to floor at y=-12, length approx ${Math.sqrt(12 * 12 + h * h).toFixed(0)}, angled forward.
- 2 flat bar cross braces inside base: type="flat_bar", size="2x0.25", length=${w}, rotation.y=0, at y=${d / 3} and y=${d * 2 / 3}, z=${h}, x=${w / 2}.
- 2 vertical side support members at front: rotation.x=90, length=${h}, at x=0 and x=${w}, y=2, z=0.

Main members: type="square_tube", size="2x2", wallThickness="0.120". Flat bars separate. grade="mild".`,
  },
]

interface CardState {
  w: number
  d: number
  h: number
}

export default function TemplateLibrary() {
  const { project, addMember } = useProjectStore()
  const { members, connections } = project
  const { setShowTemplateModal, setPanZoom } = useUIStore()
  const { push } = useHistoryStore()

  const [cardState, setCardState] = useState<Record<string, CardState>>(() =>
    Object.fromEntries(TEMPLATES.map(t => [t.id, { w: t.defaultW, d: t.defaultD, h: t.defaultH }]))
  )
  const [generating, setGenerating] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const setDim = (id: string, key: keyof CardState, val: number) =>
    setCardState(prev => ({ ...prev, [id]: { ...prev[id], [key]: val } }))

  const handleGenerate = async (tpl: Template) => {
    const { w, d, h } = cardState[tpl.id]
    setGenerating(tpl.id)
    setErrors(prev => ({ ...prev, [tpl.id]: '' }))
    try {
      const text = await callAPI(tpl.buildPrompt(w, d, h))
      const parsed = parseMembers(text)
      push({ members, connections })
      for (const m of parsed) addMember(m)

      // Auto-fit
      const all = [...members, ...parsed.map(m => ({ ...m, id: '' }))]
      if (all.length > 0) {
        const canvas = document.querySelector('canvas')
        const W = canvas?.offsetWidth ?? 800
        const H = canvas?.offsetHeight ?? 600
        const S = 8
        let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity
        for (const m of all) {
          mnX = Math.min(mnX, m.position.x - m.length / 2)
          mnY = Math.min(mnY, m.position.y - 2)
          mxX = Math.max(mxX, m.position.x + m.length / 2)
          mxY = Math.max(mxY, m.position.y + 2)
        }
        const z = Math.max(0.05, Math.min(8, Math.min(W * 0.8 / ((mxX - mnX + 10) * S), H * 0.8 / ((mxY - mnY + 10) * S))))
        const cx = (mnX + mxX) / 2, cy = (mnY + mxY) / 2
        setPanZoom(W / 2 - cx * z * S, H / 2 - cy * z * S, z)
      }
      setShowTemplateModal(false)
    } catch (err) {
      setErrors(prev => ({ ...prev, [tpl.id]: err instanceof Error ? err.message : String(err) }))
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowTemplateModal(false) }}>
      <div
        className="flex flex-col rounded-xl shadow-2xl"
        style={{ background: '#1a1d27', border: '1px solid #2e3350', width: 'min(1100px, 96vw)', height: 'min(720px, 92vh)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #2e3350' }}>
          <div>
            <div className="text-base font-semibold text-slate-100">Template Library</div>
            <div className="text-xs text-slate-500">20 structural templates — set dimensions, then generate</div>
          </div>
          <button className="text-slate-500 hover:text-slate-200 transition-colors" onClick={() => setShowTemplateModal(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {TEMPLATES.map(tpl => {
              const state = cardState[tpl.id]
              const isGen = generating === tpl.id
              const err = errors[tpl.id]
              return (
                <div
                  key={tpl.id}
                  className="flex flex-col rounded-lg p-4 relative"
                  style={{ background: '#21253a', border: '1px solid #2e3350' }}
                >
                  {isGen && (
                    <div className="absolute inset-0 rounded-lg flex items-center justify-center z-10" style={{ background: 'rgba(26,29,39,0.85)' }}>
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={24} className="animate-spin text-orange-400" />
                        <span className="text-xs text-slate-400">Generating...</span>
                      </div>
                    </div>
                  )}

                  <div className="mb-2">
                    <div className="text-sm font-semibold text-slate-100">{tpl.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{tpl.description}</div>
                  </div>

                  {/* Dimension inputs */}
                  <div className="flex gap-2 mb-3">
                    {(['w', 'd', 'h'] as const).map(key => (
                      <label key={key} className="flex-1 flex flex-col gap-0.5">
                        <span className="text-xs text-slate-500 uppercase">{key === 'w' ? 'Width' : key === 'd' ? 'Depth' : 'Height'}</span>
                        <div className="flex items-center rounded" style={{ background: '#0f1117', border: '1px solid #2e3350' }}>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={state[key]}
                            onChange={e => setDim(tpl.id, key, Number(e.target.value))}
                            className="flex-1 bg-transparent text-slate-200 text-xs px-2 py-1.5 focus:outline-none w-0 min-w-0"
                          />
                          <span className="text-slate-600 text-xs pr-1.5">"</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  {err && (
                    <div className="flex items-start gap-1.5 mb-2 text-xs text-red-400 rounded p-2" style={{ background: 'rgba(239,68,68,0.1)' }}>
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      <span className="break-all">{err}</span>
                    </div>
                  )}

                  <button
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded transition-colors disabled:opacity-40"
                    style={{ background: '#f97316', color: '#fff' }}
                    onMouseEnter={e => { if (!isGen) (e.currentTarget as HTMLButtonElement).style.background = '#ea6c0a' }}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#f97316'}
                    onClick={() => handleGenerate(tpl)}
                    disabled={isGen || generating !== null}
                  >
                    <Zap size={12} />
                    Generate
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
