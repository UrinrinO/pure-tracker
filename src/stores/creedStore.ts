import { create } from 'zustand'
import { type Creed } from '@/types/database'

export type CreedPhase = 'showing' | 'waiting' | 'dismissed'

interface CreedState {
  // Data
  creeds: Creed[]
  loaded: boolean

  // Carousel position
  creedIdx: number
  verseIdx: number
  phase: CreedPhase
  breakLeft: number          // ms remaining in the break between creeds

  // Per-creed selected translation (user choice)
  translationMap: Record<string, string>

  // Actions
  setCreeds: (creeds: Creed[]) => void
  setCreedIdx: (idx: number) => void
  setVerseIdx: (idx: number) => void
  setPhase: (phase: CreedPhase) => void
  setBreakLeft: (ms: number) => void
  tickBreak: () => void
  setTranslation: (creedId: string, translation: string) => void
  advanceToNextCreed: (totalChunks: number) => void
  advanceToPrevCreed: (totalChunks: number) => void
  bumpTimer: () => void   // increments timerKey to restart the verse countdown
  timerKey: number
}

export const useCreedStore = create<CreedState>((set, get) => ({
  creeds: [],
  loaded: false,
  creedIdx: 0,
  verseIdx: 0,
  phase: 'showing',
  breakLeft: 60 * 1000,
  translationMap: {},

  timerKey: 0,

  setCreeds: (creeds) => set({ creeds, loaded: true }),
  setCreedIdx: (creedIdx) => set({ creedIdx }),
  setVerseIdx: (verseIdx) => set({ verseIdx }),
  setPhase: (phase) => set({ phase }),
  setBreakLeft: (breakLeft) => set({ breakLeft }),
  tickBreak: () => set(s => ({ breakLeft: s.breakLeft - 1000 })),
  setTranslation: (creedId, translation) =>
    set(s => ({ translationMap: { ...s.translationMap, [creedId]: translation } })),
  advanceToNextCreed: (totalChunks) =>
    set(s => ({
      creedIdx: (s.creedIdx + 1) % totalChunks,
      verseIdx: 0,
      phase: 'showing',
      breakLeft: 60 * 1000,
      timerKey: s.timerKey + 1,
    })),
  advanceToPrevCreed: (totalChunks) =>
    set(s => ({
      creedIdx: (s.creedIdx - 1 + totalChunks) % totalChunks,
      verseIdx: 0,
      phase: 'showing',
      breakLeft: 60 * 1000,
      timerKey: s.timerKey + 1,
    })),
  bumpTimer: () => set(s => ({ timerKey: s.timerKey + 1 })),
}))
