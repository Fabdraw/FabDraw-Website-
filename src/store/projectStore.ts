import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Member, Connection, Project, TitleBlock, Dimension } from '../types';
import { DEFAULT_TITLE_BLOCK } from '../types';

const defaultProject: Project = {
  id: crypto.randomUUID(),
  name: 'Untitled Project',
  members: [],
  connections: [],
  dimensions: [],
  groupNames: {},
  titleBlock: { ...DEFAULT_TITLE_BLOCK },
};

interface ProjectState {
  project: Project;

  addMember: (m: Omit<Member, 'id'>) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  deleteMembers: (ids: string[]) => void;
  addConnection: (c: Omit<Connection, 'id'>) => void;
  deleteConnection: (id: string) => void;
  addDimension: (d: Omit<Dimension, 'id'>) => void;
  deleteDimension: (id: string) => void;
  groupMembers: (ids: string[], groupId: string) => void;
  ungroupMembers: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  setProject: (p: Project) => void;
  setProjectName: (name: string) => void;
  updateTitleBlock: (patch: Partial<TitleBlock>) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      project: defaultProject,

      addMember: (m) =>
        set((s) => ({
          project: {
            ...s.project,
            members: [...s.project.members, { ...m, id: crypto.randomUUID() }],
          },
        })),

      updateMember: (id, patch) =>
        set((s) => ({
          project: {
            ...s.project,
            members: s.project.members.map((m) =>
              m.id === id ? { ...m, ...patch } : m
            ),
          },
        })),

      deleteMembers: (ids) =>
        set((s) => ({
          project: {
            ...s.project,
            members: s.project.members.filter((m) => !ids.includes(m.id)),
            connections: s.project.connections.filter(
              (c) => !ids.includes(c.memberAId) && !ids.includes(c.memberBId)
            ),
          },
        })),

      addConnection: (c) =>
        set((s) => ({
          project: {
            ...s.project,
            connections: [
              ...s.project.connections,
              { ...c, id: crypto.randomUUID() },
            ],
          },
        })),

      deleteConnection: (id) =>
        set((s) => ({
          project: {
            ...s.project,
            connections: s.project.connections.filter((c) => c.id !== id),
          },
        })),

      addDimension: (d) =>
        set((s) => ({
          project: {
            ...s.project,
            dimensions: [...(s.project.dimensions ?? []), { ...d, id: crypto.randomUUID() }],
          },
        })),

      deleteDimension: (id) =>
        set((s) => ({
          project: {
            ...s.project,
            dimensions: (s.project.dimensions ?? []).filter((d) => d.id !== id),
          },
        })),

      groupMembers: (ids, groupId) =>
        set((s) => ({
          project: {
            ...s.project,
            members: s.project.members.map((m) =>
              ids.includes(m.id) ? { ...m, groupId } : m
            ),
            groupNames: { ...(s.project.groupNames ?? {}), [groupId]: `Group ${groupId.slice(0, 4)}` },
          },
        })),

      ungroupMembers: (groupId) =>
        set((s) => {
          const gn = { ...(s.project.groupNames ?? {}) }
          delete gn[groupId]
          return {
            project: {
              ...s.project,
              members: s.project.members.map((m) =>
                m.groupId === groupId ? { ...m, groupId: undefined } : m
              ),
              groupNames: gn,
            },
          }
        }),

      renameGroup: (groupId, name) =>
        set((s) => ({
          project: {
            ...s.project,
            groupNames: { ...(s.project.groupNames ?? {}), [groupId]: name },
          },
        })),

      setProject: (p) => set({ project: { ...p, dimensions: p.dimensions ?? [], groupNames: p.groupNames ?? {} } }),

      setProjectName: (name) =>
        set((s) => ({ project: { ...s.project, name } })),

      updateTitleBlock: (patch) =>
        set((s) => ({ project: { ...s.project, titleBlock: { ...s.project.titleBlock, ...patch } } })),
    }),
    {
      name: 'fabdraw-v3',
      // Strip dimensions saved in the old format (pre-pointA/pointB schema) so they
      // don't crash Canvas2D when accessed as dim.pointA.x
      migrate: (persisted: unknown, _version: number) => {
        const s = persisted as { project?: Project }
        if (s?.project?.dimensions) {
          s.project.dimensions = s.project.dimensions.filter(
            (d) => d && typeof (d as unknown as Record<string, unknown>).pointA === 'object'
          )
        }
        return s as { project: Project }
      },
      version: 1,
    }
  )
);
