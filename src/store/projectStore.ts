import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Member, Connection, TitleBlock, Dimension, Project } from '../types';
import { DEFAULT_TITLE_BLOCK } from '../types';
import type { FabDocument, MemberElement, ConnectionElement, DimensionElement } from '../types/document';
import { projectToFabDocument, fabDocumentToProject } from '../lib/migration';

const defaultFabDocument: FabDocument = projectToFabDocument({
  id: crypto.randomUUID(),
  name: 'Untitled Project',
  members: [],
  connections: [],
  dimensions: [],
  groupNames: {},
  titleBlock: { ...DEFAULT_TITLE_BLOCK },
})

function derive(doc: FabDocument): Project {
  return fabDocumentToProject(doc)
}

function maxZ(doc: FabDocument): number {
  return doc.elements.reduce((m, e) => Math.max(m, e.z), -1)
}

interface ProjectState {
  fabDocument: FabDocument
  project: Project // derived — do not mutate directly

  addMember: (m: Omit<Member, 'id'>) => void
  updateMember: (id: string, patch: Partial<Member>) => void
  deleteMembers: (ids: string[]) => void
  addConnection: (c: Omit<Connection, 'id'>) => void
  deleteConnection: (id: string) => void
  addDimension: (d: Omit<Dimension, 'id'>) => void
  deleteDimension: (id: string) => void
  groupMembers: (ids: string[], groupId: string) => void
  ungroupMembers: (groupId: string) => void
  renameGroup: (groupId: string, name: string) => void
  setProject: (p: Project) => void
  setFabDocument: (doc: FabDocument) => void
  setProjectName: (name: string) => void
  updateTitleBlock: (patch: Partial<TitleBlock>) => void
}

function withDerived(doc: FabDocument): { fabDocument: FabDocument; project: Project } {
  return { fabDocument: doc, project: derive(doc) }
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      fabDocument: defaultFabDocument,
      project: derive(defaultFabDocument),

      addMember: (m) =>
        set((s) => {
          const z = maxZ(s.fabDocument) + 1
          const el: MemberElement = { ...m, id: crypto.randomUUID(), kind: 'member', z, bendLines: [] }
          const doc = { ...s.fabDocument, elements: [...s.fabDocument.elements, el] }
          return withDerived(doc)
        }),

      updateMember: (id, patch) =>
        set((s) => {
          const elements = s.fabDocument.elements.map((e) =>
            e.kind === 'member' && e.id === id ? { ...e, ...patch } : e
          )
          return withDerived({ ...s.fabDocument, elements })
        }),

      deleteMembers: (ids) =>
        set((s) => {
          const elements = s.fabDocument.elements.filter(
            (e) =>
              !((e.kind === 'member' && ids.includes(e.id)) ||
                (e.kind === 'connection' &&
                  (ids.includes((e as ConnectionElement).memberAId) ||
                   ids.includes((e as ConnectionElement).memberBId))))
          )
          return withDerived({ ...s.fabDocument, elements })
        }),

      addConnection: (c) =>
        set((s) => {
          const z = maxZ(s.fabDocument) + 1
          const el: ConnectionElement = { ...c, id: crypto.randomUUID(), kind: 'connection', z }
          const doc = { ...s.fabDocument, elements: [...s.fabDocument.elements, el] }
          return withDerived(doc)
        }),

      deleteConnection: (id) =>
        set((s) => {
          const elements = s.fabDocument.elements.filter((e) => !(e.kind === 'connection' && e.id === id))
          return withDerived({ ...s.fabDocument, elements })
        }),

      addDimension: (d) =>
        set((s) => {
          const z = maxZ(s.fabDocument) + 1
          const el: DimensionElement = { ...d, id: crypto.randomUUID(), kind: 'dimension', z }
          const doc = { ...s.fabDocument, elements: [...s.fabDocument.elements, el] }
          return withDerived(doc)
        }),

      deleteDimension: (id) =>
        set((s) => {
          const elements = s.fabDocument.elements.filter((e) => !(e.kind === 'dimension' && e.id === id))
          return withDerived({ ...s.fabDocument, elements })
        }),

      groupMembers: (ids, groupId) =>
        set((s) => {
          const elements = s.fabDocument.elements.map((e) =>
            e.kind === 'member' && ids.includes(e.id) ? { ...e, groupId } : e
          )
          const groupNames = {
            ...s.fabDocument.groupNames,
            [groupId]: `Group ${groupId.slice(0, 4)}`,
          }
          return withDerived({ ...s.fabDocument, elements, groupNames })
        }),

      ungroupMembers: (groupId) =>
        set((s) => {
          const elements = s.fabDocument.elements.map((e) =>
            e.kind === 'member' && e.groupId === groupId ? { ...e, groupId: undefined } : e
          )
          const groupNames = { ...s.fabDocument.groupNames }
          delete groupNames[groupId]
          return withDerived({ ...s.fabDocument, elements, groupNames })
        }),

      renameGroup: (groupId, name) =>
        set((s) => {
          const groupNames = { ...s.fabDocument.groupNames, [groupId]: name }
          return withDerived({ ...s.fabDocument, groupNames })
        }),

      setProject: (p) => {
        const doc = projectToFabDocument({
          ...p,
          dimensions: p.dimensions ?? [],
          groupNames: p.groupNames ?? {},
        })
        set(withDerived(doc))
      },

      setFabDocument: (doc) => set(withDerived(doc)),

      setProjectName: (name) =>
        set((s) => withDerived({ ...s.fabDocument, name })),

      updateTitleBlock: (patch) =>
        set((s) =>
          withDerived({ ...s.fabDocument, titleBlock: { ...s.fabDocument.titleBlock, ...patch } })
        ),
    }),
    {
      name: 'fabdraw-v4',
      // Migrate old fabdraw-v3 data (Project format) to FabDocument
      migrate: (persisted: unknown, version: number) => {
        const s = persisted as Record<string, unknown>

        if (version < 1 || !s.fabDocument) {
          // Old format had s.project: Project
          const p = s.project as Project | undefined
          if (p?.members && Array.isArray(p.members)) {
            const doc = projectToFabDocument({
              ...p,
              dimensions: (p.dimensions ?? []).filter(
                (d) => d && typeof (d as unknown as Record<string, unknown>).pointA === 'object'
              ),
              groupNames: p.groupNames ?? {},
            })
            return { fabDocument: doc, project: derive(doc) }
          }
          return { fabDocument: defaultFabDocument, project: derive(defaultFabDocument) }
        }

        const doc = s.fabDocument as FabDocument
        return { fabDocument: doc, project: derive(doc) }
      },
      version: 2,
    }
  )
)
