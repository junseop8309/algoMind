export type Difficulty = 'easy' | 'medium' | 'hard'

export interface TestCase {
  input: string
  expectedOutput: string
  isHidden: boolean
}

export interface StarterCode {
  python: string
  javascript: string
  typescript: string
  java: string
  cpp: string
}

export interface Hint {
  level: number
  content: string
}

export interface Problem {
  id: string
  slug: string
  title: string
  description: string
  difficulty: Difficulty
  conceptId: string
  starterCode: StarterCode
  testCases: TestCase[]
  hints: Hint[]
  tags: string[]
  createdAt: string
}

export interface SubmissionResult {
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  status: {
    id: number
    description: string
  }
  time: string | null
  memory: number | null
}
