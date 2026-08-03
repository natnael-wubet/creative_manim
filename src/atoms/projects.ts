
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export interface RecentProject {
  id: string
  name: string
  path: string

  template: string,
  lastOpened: string // ISO date
}

export const isEditingAtom = atomWithStorage<boolean>('isEditingState', false)

export const recentProjectsAtom = atomWithStorage<RecentProject[]>('recentProjects', [])

export const currentProjectAtom = atom<RecentProject | null>(null)

export const newProjectModalOpenAtom = atom<boolean>(false);
