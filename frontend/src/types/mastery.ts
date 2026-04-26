import type { MasteryState } from './roadmap'

export interface MasteryRecord {
  id: string
  userId: string
  conceptId: string
  masteryState: MasteryState
  easeFactor: number
  interval: number
  repetitions: number
  nextReview: string | null
  lastReview: string | null
  createdAt: string
  updatedAt: string
}

export interface MasteryScore {
  conceptId: string
  score: number        // 0-1 normalized score
  masteryState: MasteryState
  nextReview: string | null
}
