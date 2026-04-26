import { useState } from 'react'
import { useAuth } from '../features/auth/AuthProvider'
import type { SubmissionResult } from '../types/problem'

type ExecutionState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'success'; data: SubmissionResult }
  | { status: 'error'; message: string }

export function useCodeExecution() {
  const [state, setState] = useState<ExecutionState>({ status: 'idle' })
  const { session } = useAuth()

  async function execute(code: string, language: string, stdin?: string) {
    if (!session) {
      setState({ status: 'error', message: 'Not authenticated' })
      return
    }

    setState({ status: 'running' })

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code, language, stdin }),
        }
      )

      if (!response.ok) {
        const err = await response.json()
        setState({ status: 'error', message: err.error || 'Execution failed' })
        return
      }

      const data = await response.json()
      setState({ status: 'success', data })
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

  return { state, execute, reset }
}
