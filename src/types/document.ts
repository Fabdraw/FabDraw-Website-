import type { Member, Connection, Dimension, TitleBlock } from './model'

export interface MemberElement extends Member {
  kind: 'member'
  z: number
  bendLines: []
}

export interface ConnectionElement extends Connection {
  kind: 'connection'
  z: number
}

export interface DimensionElement extends Dimension {
  kind: 'dimension'
  z: number
}

export interface NoteElement {
  kind: 'note'
  id: string
  z: number
  text: string
  position: { x: number; y: number }
}

export interface GroupElement {
  kind: 'group'
  id: string
  z: number
  name: string
  memberIds: string[]
}

export type FabElement = MemberElement | ConnectionElement | DimensionElement | NoteElement | GroupElement

export interface FabDocument {
  version: 1
  id: string
  name: string
  elements: FabElement[]
  titleBlock: TitleBlock
  /** Group names map (groupId → label), carried from legacy Project */
  groupNames: Record<string, string>
}
