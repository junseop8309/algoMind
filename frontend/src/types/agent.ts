export const AgentType = {
  Orchestrator: 'orchestrator',
  Diagnostic: 'diagnostic',
  Hint: 'hint',
  Reflection: 'reflection',
  Review: 'review',
  Interview: 'interview',
  BeginnerCoach: 'beginner_coach',
  Motivation: 'motivation',
} as const

export type AgentType = (typeof AgentType)[keyof typeof AgentType]

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface SessionContext {
  problemId: string
  problemTitle: string
  language: string
  code: string
  hintLevel: number
  elapsedSeconds: number
  attemptCount: number
}

export interface AgentRequest {
  agentType: AgentType
  messages: AgentMessage[]
  context: SessionContext
}

export interface AgentResponse {
  message: string
  agentType: AgentType
  metadata?: Record<string, unknown>
}
