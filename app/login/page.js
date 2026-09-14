'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Login failed')
        setLoading(false)
        return
      }
      // Confirm the auth cookie is active before navigating (avoids redirect race with middleware)
      const dest = data.user?.role === 'admin' ? '/dashboard' : '/'
      for (let i = 0; i < 12; i++) {
        try {
          const meRes = await fetch('/api/auth/me', { credentials: 'include' })
          const me = await meRes.json()
          if (me.user) { window.location.href = dest; return }
        } catch { /* retry */ }
        await new Promise((r) => setTimeout(r, 150))
      }
      window.location.href = dest
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="ambient-glow" />
      <div className="auth-card">
        <div className="auth-brand gold-text">DERMATICS</div>
        <div className="auth-sub">Sign in to your account</div>
        <form onSubmit={submit}>
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn-pill solid" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="auth-alt">Don&apos;t have an account? <Link href="/signup">Create one</Link></div>
        <div className="auth-alt"><Link href="/">&larr; Back to store</Link></div>
      </div>
    </div>
  )
}
