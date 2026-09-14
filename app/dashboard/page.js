'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'

const NAV = [
  { key: 'overview', label: 'Overview' },
  { key: 'products', label: 'Products' },
  { key: 'categories', label: 'Categories' },
  { key: 'content', label: 'Website Content' },
  { key: 'users', label: 'Users' },
  { key: 'inquiries', label: 'Inquiries' },
]

const TIER_LABELS = { premium: 'Premium', ultra: 'Ultra Premium', super: 'Super Ultra Premium' }

const api = (url, opts = {}) =>
  fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts }).then((r) => r.json())

/* ---------------- OVERVIEW ---------------- */
function Overview() {
  const [data, setData] = useState(null)
  useEffect(() => { api('/api/admin/analytics/overview').then(setData).catch(() => {}) }, [])
  if (!data || !data.stats) return <p style={{ color: '#a3a3a3' }}>Loading analytics...</p>

  const stats = [
    { label: 'Visitors Today', value: data.stats.visitorsToday },
    { label: 'Visitors (7d)', value: data.stats.visitorsWeek },
    { label: 'Registered Users', value: data.stats.totalUsers },
    { label: 'Total Inquiries', value: data.stats.inquiries },
  ]

  return (
    <div>
      <div className="stat-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value gold-text">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="chart-row">
        <div className="panel">
          <h3>Visitors — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.visitorsSeries}>
              <defs>
                <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4af37" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(212,175,55,0.1)" vertical={false} />
              <XAxis dataKey="date" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12, color: '#f5f5f5' }} />
              <Area type="monotone" dataKey="visitors" stroke="#d4af37" strokeWidth={2} fill="url(#gold)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h3>Category Interest</h3>
          {data.tierInterest.length === 0 ? (
            <p style={{ color: '#a3a3a3', fontSize: 14 }}>No tab interactions recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.tierInterest.map((t) => ({ ...t, label: TIER_LABELS[t.tier] || t.tier }))}>
                <CartesianGrid stroke="rgba(212,175,55,0.1)" vertical={false} />
                <XAxis dataKey="label" stroke="#a3a3a3" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(212,175,55,0.08)' }} contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12, color: '#f5f5f5' }} />
                <Bar dataKey="count" fill="#d4af37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="chart-row">
        <div className="panel">
          <h3>Most-Viewed Products</h3>
          {data.topProducts.length === 0 ? (
            <p style={{ color: '#a3a3a3', fontSize: 14 }}>No product views recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart layout="vertical" data={data.topProducts} margin={{ left: 20 }}>
                <CartesianGrid stroke="rgba(212,175,55,0.1)" horizontal={false} />
                <XAxis type="number" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#a3a3a3" fontSize={11} width={150} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(212,175,55,0.08)' }} contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 12, color: '#f5f5f5' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {data.topProducts.map((_, i) => (<Cell key={i} fill="#d4af37" />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel">
          <h3>Conversion Funnel</h3>
          {[
            { label: 'Page Visits', value: data.funnel.visits },
            { label: 'Product Views', value: data.funnel.productViews },
            { label: 'Inquiries', value: data.funnel.inquiries },
          ].map((f, i) => {
            const max = Math.max(data.funnel.visits, 1)
            const pct = Math.max((f.value / max) * 100, 4)
            return (
              <div key={f.label} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#e5e5e5', marginBottom: 8 }}>
                  <span>{f.label}</span><span className="gold-text" style={{ fontWeight: 600 }}>{f.value}</span>
                </div>
                <div style={{ height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(135deg,#f7e7ce,#d4af37,#aa7c11)', borderRadius: 100 }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ---------------- PRODUCTS ---------------- */
function Products() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null) // product or {} for new
  const load = useCallback(() => { api('/api/products').then(setItems).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])

  const save = async (p) => {
    const isNew = !p.id
    await api(isNew ? '/api/admin/products' : `/api/admin/products/${p.id}`, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(p) })
    setEditing(null); load()
  }
  const del = async (id) => { if (confirm('Delete this product?')) { await api(`/api/admin/products/${id}`, { method: 'DELETE' }); load() } }

  const filtered = items.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.tag || '').toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <div className="dash-toolbar">
        <input className="dash-search" placeholder="Search products..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-sm gold" onClick={() => setEditing({ tier: 'premium', tag: '', name: '', description: '', price: '', imageUrl: '' })}>+ Add Product</button>
      </div>
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="dash-table">
          <thead><tr><th>Image</th><th>Name</th><th>Tier</th><th>Price</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.imageUrl ? <img className="tbl-img" src={p.imageUrl} alt="" /> : '—'}</td>
                <td><div style={{ fontFamily: 'var(--font-serif)', fontSize: 17 }}>{p.name}</div><div style={{ color: '#a3a3a3', fontSize: 12 }}>{p.tag}</div></td>
                <td><span className="badge">{TIER_LABELS[p.tier] || p.tier}</span></td>
                <td className="gold-text" style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>${p.price}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn-sm" onClick={() => setEditing(p)}>Edit</button>
                  <button className="btn-sm danger" onClick={() => del(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <ProductModal product={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

function ProductModal({ product, onClose, onSave }) {
  const [f, setF] = useState(product)
  const set = (k, v) => setF({ ...f, [k]: v })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h3 className="gold-text">{product.id ? 'Edit Product' : 'New Product'}</h3>
        <div className="content-form" style={{ marginTop: 20 }}>
          <div className="field"><label>Name</label><input value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="field"><label>Tier</label>
            <select value={f.tier} onChange={(e) => set('tier', e.target.value)}>
              <option value="premium">Premium</option>
              <option value="ultra">Ultra Premium</option>
              <option value="super">Super Ultra Premium</option>
            </select>
          </div>
          <div className="field"><label>Tag</label><input value={f.tag} onChange={(e) => set('tag', e.target.value)} /></div>
          <div className="field"><label>Description</label><textarea value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="field"><label>Price ($)</label><input type="number" value={f.price} onChange={(e) => set('price', e.target.value)} /></div>
          <div className="field"><label>Image URL</label><input value={f.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." /></div>
        </div>
        <div className="save-bar">
          <button className="btn-pill solid" onClick={() => onSave(f)}>Save Product</button>
          <button className="btn-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- CATEGORIES ---------------- */
function Categories() {
  const [items, setItems] = useState([])
  const [msg, setMsg] = useState('')
  const load = useCallback(() => { api('/api/categories').then(setItems).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])
  const setField = (id, k, v) => setItems(items.map((c) => (c.id === id ? { ...c, [k]: v } : c)))
  const save = async (c) => {
    await api(`/api/admin/categories/${c.id}`, { method: 'PUT', body: JSON.stringify({ label: c.label, introTitle: c.introTitle, introText: c.introText }) })
    setMsg('Saved ' + c.label); setTimeout(() => setMsg(''), 2000)
  }
  return (
    <div>
      {items.map((c) => (
        <div className="panel" key={c.id} style={{ marginBottom: 20 }}>
          <div className="content-form">
            <div className="content-form two">
              <div className="field"><label>Tab Label</label><input value={c.label} onChange={(e) => setField(c.id, 'label', e.target.value)} /></div>
              <div className="field"><label>Intro Heading</label><input value={c.introTitle} onChange={(e) => setField(c.id, 'introTitle', e.target.value)} /></div>
            </div>
            <div className="field"><label>Intro Subtext</label><textarea value={c.introText} onChange={(e) => setField(c.id, 'introText', e.target.value)} /></div>
          </div>
          <div className="save-bar">
            <button className="btn-pill solid" onClick={() => save(c)}>Save</button>
            {msg === 'Saved ' + c.label && <span className="save-msg">Saved!</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- WEBSITE CONTENT ---------------- */
function Content() {
  const [c, setC] = useState(null)
  const [msg, setMsg] = useState('')
  useEffect(() => { api('/api/content').then(setC).catch(() => {}) }, [])
  if (!c) return <p style={{ color: '#a3a3a3' }}>Loading content...</p>
  const set = (k, v) => setC({ ...c, [k]: v })
  const setProc = (i, k, v) => { const p = [...c.process]; p[i] = { ...p[i], [k]: v }; setC({ ...c, process: p }) }
  const save = async () => { await api('/api/admin/content', { method: 'PUT', body: JSON.stringify(c) }); setMsg('Content saved!'); setTimeout(() => setMsg(''), 2500) }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <h3>Hero & Brand</h3>
        <div className="content-form two">
          <div className="field"><label>Hero Title</label><input value={c.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} /></div>
          <div className="field"><label>Hero Subtext</label><input value={c.heroSub} onChange={(e) => set('heroSub', e.target.value)} /></div>
          <div className="field"><label>Phone Number</label><input value={c.phone} onChange={(e) => set('phone', e.target.value)} /></div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3>Flagship — My Skin My Formulation</h3>
        <div className="content-form">
          <div className="content-form two">
            <div className="field"><label>Flagship Title</label><input value={c.flagshipTitle} onChange={(e) => set('flagshipTitle', e.target.value)} /></div>
            <div className="field"><label>Flagship Subtext</label><input value={c.flagshipSub} onChange={(e) => set('flagshipSub', e.target.value)} /></div>
          </div>
          <div className="content-form two">
            <div className="field"><label>&quot;What is&quot; Title</label><input value={c.whatTitle} onChange={(e) => set('whatTitle', e.target.value)} /></div>
            <div className="field"><label>&quot;Why&quot; Title</label><input value={c.whyTitle} onChange={(e) => set('whyTitle', e.target.value)} /></div>
          </div>
          <div className="field"><label>&quot;What is&quot; Text</label><textarea value={c.whatText} onChange={(e) => set('whatText', e.target.value)} /></div>
          <div className="field"><label>&quot;Why&quot; Text</label><textarea value={c.whyText} onChange={(e) => set('whyText', e.target.value)} /></div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3>How It Works — Process Steps</h3>
        {(c.process || []).map((p, i) => (
          <div className="content-form two" key={i} style={{ marginBottom: 14 }}>
            <div className="field"><label>Step {p.n} Title</label><input value={p.title} onChange={(e) => setProc(i, 'title', e.target.value)} /></div>
            <div className="field"><label>Step {p.n} Text</label><input value={p.text} onChange={(e) => setProc(i, 'text', e.target.value)} /></div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3>Feedback Banner & Footer</h3>
        <div className="content-form">
          <div className="field"><label>Feedback Title</label><input value={c.feedbackTitle} onChange={(e) => set('feedbackTitle', e.target.value)} /></div>
          <div className="field"><label>Feedback Text</label><textarea value={c.feedbackText} onChange={(e) => set('feedbackText', e.target.value)} /></div>
          <div className="field"><label>Footer Heading</label><input value={c.footerHeading} onChange={(e) => set('footerHeading', e.target.value)} /></div>
          <div className="field"><label>Footer Text</label><textarea value={c.footerText} onChange={(e) => set('footerText', e.target.value)} /></div>
        </div>
      </div>

      <div className="save-bar">
        <button className="btn-pill solid" onClick={save}>Save All Content</button>
        {msg && <span className="save-msg">{msg}</span>}
      </div>
    </div>
  )
}

/* ---------------- USERS ---------------- */
function Users() {
  const [items, setItems] = useState([])
  const load = useCallback(() => { api('/api/admin/users').then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])
  const toggle = async (u) => { await api(`/api/admin/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ active: !(u.active !== false) }) }); load() }
  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="dash-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td style={{ color: '#a3a3a3' }}>{u.email}</td>
              <td><span className="badge">{u.role}</span></td>
              <td><span className={`badge ${u.active === false ? 'red' : 'green'}`}>{u.active === false ? 'Inactive' : 'Active'}</span></td>
              <td style={{ textAlign: 'right' }}>
                {u.role !== 'admin' && <button className="btn-sm" onClick={() => toggle(u)}>{u.active === false ? 'Activate' : 'Deactivate'}</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------------- INQUIRIES ---------------- */
function Inquiries() {
  const [items, setItems] = useState([])
  useEffect(() => { api('/api/admin/consultations').then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => {}) }, [])
  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="dash-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Interest</th><th>Message</th><th>Date</th></tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={6} style={{ color: '#a3a3a3', padding: 24 }}>No inquiries yet.</td></tr>}
          {items.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td className="gold-text">{c.phone}</td>
              <td style={{ color: '#a3a3a3' }}>{c.email || '—'}</td>
              <td><span className="badge">{TIER_LABELS[c.tier] || c.tier || '—'}</span></td>
              <td style={{ color: '#a3a3a3', maxWidth: 260 }}>{c.message || '—'}</td>
              <td style={{ color: '#a3a3a3', fontSize: 12 }}>{new Date(c.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------------- SHELL ---------------- */
export default function Dashboard() {
  const [tab, setTab] = useState('overview')
  const [me, setMe] = useState(null)
  useEffect(() => { api('/api/auth/me').then((d) => setMe(d.user)).catch(() => {}) }, [])

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const titles = {
    overview: ['Overview', 'Key metrics and visitor analytics at a glance'],
    products: ['Products', 'Add, edit and remove products across all tiers'],
    categories: ['Categories', 'Rename tiers and edit their intro copy'],
    content: ['Website Content', 'Edit the storefront copy without touching code'],
    users: ['Users', 'Registered members of DERMATICS'],
    inquiries: ['Inquiries', 'Consultation requests submitted by visitors'],
  }

  return (
    <div className="dash">
      <div className="ambient-glow" />
      <aside className="dash-sidebar">
        <div className="dash-brand gold-text">DERMATICS</div>
        <div className="dash-brand-sub">Admin</div>
        <nav className="dash-nav">
          {NAV.map((n) => (
            <button key={n.key} className={tab === n.key ? 'active' : ''} onClick={() => setTab(n.key)}>{n.label}</button>
          ))}
        </nav>
        <button className="dash-logout" onClick={logout}>Sign Out{me ? ` (${me.name})` : ''}</button>
      </aside>

      <main className="dash-main">
        <h1 className="dash-title gold-text">{titles[tab][0]}</h1>
        <p className="dash-subtitle">{titles[tab][1]}</p>
        {tab === 'overview' && <Overview />}
        {tab === 'products' && <Products />}
        {tab === 'categories' && <Categories />}
        {tab === 'content' && <Content />}
        {tab === 'users' && <Users />}
        {tab === 'inquiries' && <Inquiries />}
      </main>
    </div>
  )
}
