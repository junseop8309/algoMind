import { Router, Request, Response } from 'express'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

const DAILY_LIMIT = 20 // max AI calls per user per day

const SYSTEM_PROMPTS: Record<string, string> = {
  hint: `You are a patient coding mentor. The student is stuck on a data structures & algorithms problem.
Give a helpful nudge — ask a guiding question or point them toward the right concept.
NEVER give away the full solution or write the complete code for them.
Keep your response to 3-5 sentences max.`,

  reflection: `You are a code reviewer giving feedback to a student who just solved a coding problem.
Praise what they did well, then suggest one concrete improvement (time complexity, readability, or edge cases).
Be encouraging. Keep it under 6 sentences.`,

  beginner_coach: `You are a friendly DSA tutor for absolute beginners.
Explain concepts simply, use analogies, and be encouraging.
Never assume prior knowledge. Keep answers concise.`,

  diagnostic: `You are assessing a student's knowledge of data structures and algorithms.
Ask targeted questions to gauge their understanding level.
Be neutral and objective.`,

  interview: `You are a technical interviewer conducting a mock DSA interview.
Ask follow-up questions about the student's solution, time/space complexity, and edge cases.
Be professional but encouraging. One question at a time.`,

  review: `You are reviewing a student's spaced repetition session.
Help them recall key concepts and patterns from problems they've seen before.
Ask them to explain their approach before giving feedback.`,

  motivation: `You are an encouraging coach helping a student who is frustrated or stuck.
Be warm, normalize struggle, and help them take one small next step.
Keep it brief and energizing.`,
}

async function checkAndIncrementUsage(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // Upsert — create row if not exists, increment if exists
  const { data, error } = await supabase
    .from('ai_usage')
    .upsert(
      { userId, date: today, count: 1 },
      { onConflict: 'userId,date', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error || !data) {
    // If upsert failed, try a manual increment
    const { data: existing } = await supabase
      .from('ai_usage')
      .select('count')
      .eq('userId', userId)
      .eq('date', today)
      .single()

    if (existing) {
      if (existing.count >= DAILY_LIMIT) {
        return { allowed: false, remaining: 0 }
      }
      await supabase
        .from('ai_usage')
        .update({ count: existing.count + 1 })
        .eq('userId', userId)
        .eq('date', today)
      return { allowed: true, remaining: DAILY_LIMIT - existing.count - 1 }
    }

    // Fallback — allow if we can't check
    return { allowed: true, remaining: DAILY_LIMIT }
  }

  if (data.count > DAILY_LIMIT) {
    // Already over limit — roll back the increment
    await supabase
      .from('ai_usage')
      .update({ count: DAILY_LIMIT })
      .eq('userId', userId)
      .eq('date', today)
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: DAILY_LIMIT - data.count }
}

router.post('/', async (req: Request, res: Response) => {
  const { agentType, messages, context, userId } = req.body

  // --- Per-user daily rate limit ---
  if (userId) {
    const { allowed, remaining } = await checkAndIncrementUsage(userId)
    if (!allowed) {
      return res.status(429).json({
        error: 'Daily AI limit reached',
        message: "You've used all 20 AI requests for today. Come back tomorrow!",
        remaining: 0,
      })
    }
    res.setHeader('X-AI-Remaining', remaining)
  }

  const systemPrompt = SYSTEM_PROMPTS[agentType] ?? SYSTEM_PROMPTS.hint

  const contextNote = context
    ? `\n\nContext: Problem "${context.problemTitle}", language: ${context.language}, time spent: ${context.elapsedSeconds}s, hints used: ${context.hintLevel}.`
    : ''

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt + contextNote },
        ...messages,
      ],
      max_tokens: 300,
      temperature: 0.7,
    })

    const message = completion.choices[0]?.message?.content ?? 'No response.'
    res.json({ message })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
