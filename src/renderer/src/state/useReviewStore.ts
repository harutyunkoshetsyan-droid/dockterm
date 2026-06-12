import { create } from 'zustand'
import type { ReviewBase, DiffSinceFile, CheckpointStatus } from '@shared/types'
import { languageForFile } from '../components/editor/language'
import { useToastStore } from './useToastStore'

function baseName(p: string): string {
  const i = p.lastIndexOf('/')
  return i >= 0 ? p.slice(i + 1) : p
}

export interface DiffTarget {
  relPath: string
  original: string
  modified: string
  language: string
}

interface ReviewState {
  base: ReviewBase
  files: DiffSinceFile[]
  diffTarget: DiffTarget | null
  checkpoint: CheckpointStatus | null
  setBase: (base: ReviewBase) => Promise<void>
  refresh: () => Promise<void>
  openDiff: (relPath: string, base?: ReviewBase) => Promise<void>
  closeDiff: () => void
  createCheckpoint: (label: string) => Promise<void>
  refreshCheckpoint: () => Promise<void>
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  base: 'working',
  files: [],
  diffTarget: null,
  checkpoint: null,

  setBase: async (base) => {
    set({ base })
    await get().refresh()
  },

  refresh: async () => {
    const res = await window.dockterm.invoke('review:list', { base: get().base })
    if (res.ok) set({ files: res.value })
  },

  openDiff: async (relPath, base) => {
    const res = await window.dockterm.invoke('review:diffFile', {
      base: base ?? get().base,
      relPath
    })
    if (!res.ok) {
      useToastStore.getState().push(res.error.message, 'error')
      return
    }
    set({ diffTarget: { ...res.value, language: languageForFile(baseName(relPath)) } })
  },

  closeDiff: () => set({ diffTarget: null }),

  createCheckpoint: async (label) => {
    const res = await window.dockterm.invoke('checkpoint:create', { label })
    if (!res.ok) {
      useToastStore.getState().push(res.error.message, 'error')
      return
    }
    if ('dirty' in res.value) {
      useToastStore
        .getState()
        .push('Commit or stash your changes before creating a checkpoint.', 'warning')
      return
    }
    useToastStore.getState().push(`Checkpoint saved at ${res.value.checkpoint.hash.slice(0, 7)}`, 'success')
    await get().refreshCheckpoint()
  },

  refreshCheckpoint: async () => {
    const res = await window.dockterm.invoke('checkpoint:get', undefined)
    if (res.ok) set({ checkpoint: res.value })
  }
}))
