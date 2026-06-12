import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Member, Connection, Project, TitleBlock } from '../types';
import { DEFAULT_TITLE_BLOCK } from '../types';

const defaultProject: Project = {
  id: crypto.randomUUID(),
  name: 'Untitled Project',
  members: [],
  connections: [],
  titleBlock: { ...DEFAULT_TITLE_BLOCK },
};

interface ProjectState {
  project: Project;

  addMember: (m: Omit<Member, 'id'>) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  deleteMembers: (ids: string[]) => void;
  addConnection: (c: Omit<Connection, 'id'>) => void;
  deleteConnection: (id: string) => void;
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

      setProject: (p) => set({ project: p }),

      setProjectName: (name) =>
        set((s) => ({ project: { ...s.project, name } })),

      updateTitleBlock: (patch) =>
        set((s) => ({ project: { ...s.project, titleBlock: { ...s.project.titleBlock, ...patch } } })),
    }),
    { name: 'fabdraw-v2' }
  )
);
