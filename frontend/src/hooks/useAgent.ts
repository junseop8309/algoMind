
useAgent
import { useState } from 'react'
import { useAuth } from '../features/auth/AuthProvider'
import type { AgentType, AgentMessage, SessionContext } from '../types/agent'

type AgentState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | { status: 'limit_reached'; message: string }

export function useAgent() {
  const [state, setState] = useState<AgentState>({ status: 'idle' })
  const { session, user } = useAuth()

  async function ask(
    agentType: AgentType,
    messages: AgentMessage[],
    context?: SessionContext
  ) {
    if (!session) {
      setState({ status: 'error', message: 'Not authenticated' })
      return
    }

    setState({ status: 'loading' })

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            agentType,
            messages,
            context,
            userId: user?.id, // passed to backend for daily rate limiting
          }),
        }
      )

      // Daily limit reached
      if (response.status === 429) {
        const err = await response.json()
        setState({
          status: 'limit_reached',
          message: err.message ?? "You've reached your daily AI limit. Come back tomorrow!",
        })
        return
      }

      if (!response.ok) {
        const err = await response.json()
        setState({ status: 'error', message: err.error ?? 'Agent request failed' })
        return
      }

      const data = await response.json()
      setState({ status: 'success', message: data.message })
    } catch {
      setState({
        status: 'error',
        message: 'Network error — is the backend running?',
      })
    }
  }

  function reset() {
    setState({ status: 'idle' })
  }

  return { state, ask, reset }
}
