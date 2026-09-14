import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(plain, hashed) {
  return bcrypt.compare(plain, hashed)
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secret)
  return payload
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  }
}

// Reads access_token cookie, verifies, returns { id, email, role, name } or null
export async function getAuthUser(request) {
  try {
    const token = request.cookies.get('access_token')?.value
    if (!token) return null
    const payload = await verifyToken(token)
    return { id: payload.sub, email: payload.email, role: payload.role, name: payload.name }
  } catch {
    return null
  }
}
