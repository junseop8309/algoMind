import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { executeRouter } from './routes/execute'
import agentRouter from './routes/agent'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// ✅ Middleware FIRST — before any routes
app.use(helmet())
app.use(cors({
  origin: ['https://algo-mind-teal.vercel.app'],
  credentials: true
}))
app.use(express.json())

// ✅ Routes AFTER middleware
app.get('/health', (_, res) => res.json({ status: 'ok', message: 'AlgoMind API is running' }))
app.use('/api/execute', executeRouter)
app.use('/api/agent', agentRouter)

app.listen(PORT, () => {
  console.log(`AlgoMind API running on port ${PORT}`)
})
