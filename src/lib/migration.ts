import type { Project } from '../types/model'
import type { FabDocument, FabElement, MemberElement, ConnectionElement, DimensionElement } from '../types/document'

export function projectToFabDocument(p: Project): FabDocument {
  let z = 0
  const elements: FabElement[] = []

  for (const m of p.members) {
    const el: MemberElement = { ...m, kind: 'member', z: z++, bendLines: [] }
    elements.push(el)
  }
  for (const c of p.connections) {
    const el: ConnectionElement = { ...c, kind: 'connection', z: z++ }
    elements.push(el)
  }
  for (const d of p.dimensions ?? []) {
    const el: DimensionElement = { ...d, kind: 'dimension', z: z++ }
    elements.push(el)
  }

  return {
    version: 1,
    id: p.id,
    name: p.name,
    elements,
    titleBlock: p.titleBlock,
    groupNames: p.groupNames ?? {},
  }
}

export function fabDocumentToProject(doc: FabDocument): Project {
  return {
    id: doc.id,
    name: doc.name,
    members: doc.elements
      .filter((e): e is MemberElement => e.kind === 'member')
      .sort((a, b) => a.z - b.z)
      .map(({ kind: _kind, z: _z, bendLines: _bl, ...m }) => m),
    connections: doc.elements
      .filter((e): e is ConnectionElement => e.kind === 'connection')
      .map(({ kind: _kind, z: _z, ...c }) => c),
    dimensions: doc.elements
      .filter((e): e is DimensionElement => e.kind === 'dimension')
      .map(({ kind: _kind, z: _z, ...d }) => d),
    groupNames: doc.groupNames,
    titleBlock: doc.titleBlock,
  }
}

/** Accept either a legacy Project or a FabDocument, always return FabDocument. */
export function loadAsFabDocument(raw: unknown): FabDocument {
  const obj = raw as Record<string, unknown>
  if (obj.version === 1 && Array.isArray(obj.elements)) {
    // Already a FabDocument
    return obj as unknown as FabDocument
  }
  // Legacy Project
  const p = obj as unknown as Project
  if (!p.members || !Array.isArray(p.members)) throw new Error('Invalid file')
  return projectToFabDocument({
    ...p,
    dimensions: p.dimensions ?? [],
    groupNames: p.groupNames ?? {},
  })
}
