import { create } from 'zustand'

type Language = 'python' | 'javascript' | 'typescript' | 'java' | 'cpp'
type HintLevel = 0 | 1 | 2 | 3 | 4 | 5

interface SessionStore {
  currentProblemId: string | null
  language: Language
  hintLevel: HintLevel
  elapsedSeconds: number
  timerActive: boolean
  _intervalId: ReturnType<typeof setInterval> | null
  setLanguage: (lang: Language) => void
  revealNextHint: () => void
  startTimer: (problemId: string) => void
  stopTimer: () => void
  resetSession: () => void
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  currentProblemId: null,
  language: 'python',
  hintLevel: 0,
  elapsedSeconds: 0,
  timerActive: false,
  _intervalId: null,

  setLanguage: (lang) => set({ language: lang }),

  revealNextHint: () =>
    set((state) => ({
      hintLevel: Math.min(5, state.hintLevel + 1) as HintLevel,
    })),

  startTimer: (problemId) => {
    const existing = get()._intervalId
    if (existing) clearInterval(existing)

    const id = setInterval(() => {
      set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }))
    }, 1000)

    set({
      currentProblemId: problemId,
      timerActive: true,
      elapsedSeconds: 0,
      _intervalId: id,
    })
  },

  stopTimer: () => {
    const id = get()._intervalId
    if (id) clearInterval(id)
    set({ timerActive: false, _intervalId: null })
  },

  resetSession: () => {
    const id = get()._intervalId
    if (id) clearInterval(id)
    set({
      currentProblemId: null,
      hintLevel: 0,
      elapsedSeconds: 0,
      timerActive: false,
      _intervalId: null,
    })
  },
}))
