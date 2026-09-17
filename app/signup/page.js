'use client'

import { useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Signup failed')
        setLoading(false)
        return
      }
      // new users are regular users -> go to storefront
      window.location.href = '/'
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
        <div className="auth-sub">Create your account</div>
        <form onSubmit={submit}>
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-field">
            <label>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
          </div>
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          <button className="btn-pill solid" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-alt">Already have an account? <Link href="/login">Sign in</Link></div>
        <div className="auth-alt"><Link href="/">&larr; Back to store</Link></div>
      </div>
    </div>
  )
}
