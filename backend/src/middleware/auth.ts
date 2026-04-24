import { jwtVerify, createRemoteJWKSet } from 'jose'
import type { Request, Response, NextFunction } from 'express'

const PROJECT_JWKS = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
)

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string
    email?: string
  }
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.slice(7)

  try {
    const { payload } = await jwtVerify(token, PROJECT_JWKS)
    req.user = {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
    }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
