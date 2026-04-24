import { Router } from 'express'
import axios from 'axios'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth'

export const executeRouter = Router()

const JUDGE0_BASE = 'https://judge0-ce.p.rapidapi.com'

const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  javascript: 63,
  typescript: 74,
  java: 62,
  cpp: 54,
}

executeRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { code, language, stdin = '' } = req.body

  const languageId = LANGUAGE_IDS[language]
  if (!languageId) {
    return res.status(400).json({ error: `Unsupported language: ${language}` })
  }

  try {
    const submission = await axios.post(
      `${JUDGE0_BASE}/submissions?base64_encoded=false&wait=false`,
      { source_code: code, language_id: languageId, stdin },
      {
        headers: {
          'X-RapidAPI-Key': process.env.JUDGE0_API_KEY!,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
      }
    )

    const token = submission.data.token
    const result = await pollJudge0(token)
    res.json(result)
  } catch (err) {
    console.error('Judge0 error:', err)
    res.status(500).json({ error: 'Code execution failed' })
  }
})

async function pollJudge0(token: string, maxAttempts = 20): Promise<any> {
  const delays = [250, 500, 1000, 2000]

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const delay = delays[Math.min(attempt, delays.length - 1)]
    await new Promise((resolve) => setTimeout(resolve, delay))

    const response = await axios.get(
      `${JUDGE0_BASE}/submissions/${token}?base64_encoded=false`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.JUDGE0_API_KEY!,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        },
      }
    )

    if (response.data.status?.id >= 3) {
      return response.data
    }
  }

  throw new Error('Code execution timed out')
}
