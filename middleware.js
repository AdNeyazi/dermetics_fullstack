import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me')

export async function middleware(request) {
  const token = request.cookies.get('access_token')?.value
  const loginUrl = new URL('/login', request.url)

  if (!token) {
    return NextResponse.redirect(loginUrl)
  }
  try {
    const { payload } = await jwtVerify(token, secret)
    if (payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
}
