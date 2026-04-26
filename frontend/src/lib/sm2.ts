// SM-2 Spaced Repetition Algorithm
// quality: 0-5 rating of how well you remembered
//   5 = perfect recall
//   4 = correct with slight hesitation
//   3 = correct with difficulty
//   2 = incorrect but felt close
//   1 = incorrect, easy to recall correct answer
//   0 = complete blackout

export interface SM2Item {
  easeFactor: number    // difficulty multiplier, starts at 2.5
  interval: number      // days until next review
  repetitions: number   // number of successful reviews in a row
}

export interface SM2Result {
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewDate: Date
}

export function sm2(item: SM2Item, quality: number): SM2Result {
  if (quality < 0 || quality > 5) {
    throw new Error('Quality must be between 0 and 5')
  }

  let { easeFactor, interval, repetitions } = item

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions += 1
  } else {
    // Incorrect response — reset
    repetitions = 0
    interval = 1
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

  // Ease factor never goes below 1.3
  if (easeFactor < 1.3) easeFactor = 1.3

  const nextReviewDate = new Date()
  nextReviewDate.setDate(nextReviewDate.getDate() + interval)

  return { easeFactor, interval, repetitions, nextReviewDate }
}

export function createSM2Item(): SM2Item {
  return {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
  }
}

// Convert SM2 state to a 0-1 mastery score
export function sm2ToScore(item: SM2Item): number {
  const repScore = Math.min(item.repetitions / 5, 1) * 0.6
  const efScore = ((item.easeFactor - 1.3) / (2.5 - 1.3)) * 0.4
  return Math.round((repScore + efScore) * 100) / 100
}
