'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

const DEFAULT_TABS = [
  { key: 'premium', label: 'Premium' },
  { key: 'ultra', label: 'Ultra Premium' },
  { key: 'super', label: 'Super Ultra Premium Luxury' },
]

const DEFAULT_CONTENT = {
  heroTitle: 'DERMATICS',
  heroSub: 'The Art & Science of Bespoke Skincare',
  flagshipTitle: 'MY SKIN MY FORMULATION',
  flagshipSub: 'Customise Skin Care Solution For Skin Lovers',
  whatTitle: 'What is My Skin My Formulation?',
  whatText: '',
  whyTitle: 'Why My Skin My Formulation?',
  whyText: '',
  process: [],
  feedbackTitle: 'Infinite Perfection Guarantee',
  feedbackText: '',
  footerHeading: 'Ready For Your Bespoke Formulation?',
  footerText: 'Speak with our concierge and begin a skincare ritual designed entirely around you.',
  phone: '+91 98765 43210',
}

/* ---------- analytics ---------- */
function getSid() {
  if (typeof window === 'undefined') return null
  let sid = localStorage.getItem('dermatics_sid')
  if (!sid) {
    sid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random())
    localStorage.setItem('dermatics_sid', sid)
  }
  return sid
}
function track(event_type, metadata = {}) {
  try {
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ event_type, page: '/', metadata, session_id: getSid(), referrer: typeof document !== 'undefined' ? document.referrer : '', device: typeof navigator !== 'undefined' ? navigator.userAgent : '' }),
    })
  } catch { /* ignore */ }
}

const Header = ({ phone }) => {
  const tel = 'tel:' + (phone || '').replace(/\s+/g, '')
  return (
    <header className="header">
      <div className="container header-inner">
        <div className="brand gold-text">DERMATICS</div>
        <a className="btn-pill" href={tel} onClick={() => track('cta_click', { location: 'header' })}>Book Appointment: {phone}</a>
      </div>
    </header>
  )
}

const ProductCard = ({ p, onInquire }) => (
  <div className="product-card">
    <div className="product-img"><img src={p.imageUrl} alt={p.name} /></div>
    <div className="product-body">
      <span className="product-tag">{p.tag}</span>
      <h3 className="product-name">{p.name}</h3>
      <p className="product-desc">{p.description}</p>
      <div className="product-footer">
        <span className="product-price gold-text">${p.price}</span>
        <button className="btn-inquire" onClick={() => onInquire(p)}>Inquire</button>
      </div>
    </div>
  </div>
)

const FaqItem = ({ faq, open, onToggle }) => (
  <div className={`faq-item ${open ? 'open' : ''}`}>
    <button className="faq-q" onClick={onToggle}>
      <span>{faq.question}</span>
      <span className="faq-icon">{open ? '\u2212' : '+'}</span>
    </button>
    <div className="faq-a" style={{ maxHeight: open ? '400px' : '0px' }}>
      <div className="faq-a-inner">{faq.answer}</div>
    </div>
  </div>
)

const ConsultationModal = ({ open, onClose, product }) => {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (open) {
      setStatus('idle')
      setForm({ name: '', phone: '', email: '', message: product ? `I'm interested in ${product.name}.` : '' })
    }
  }, [open, product])

  if (!open) return null

  const submit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tier: product ? product.tier : 'bespoke' }),
      })
      if (!res.ok) throw new Error('failed')
      setStatus('success')
    } catch (err) {
      setStatus('error')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        {status === 'success' ? (
          <div className="modal-success">
            <div className="check gold-text">&#10003;</div>
            <h3 className="gold-text">Thank You</h3>
            <p className="modal-sub">Our concierge will reach out shortly to schedule your bespoke consultation.</p>
            <button className="btn-pill solid" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3 className="gold-text">Book Consultation</h3>
            <p className="modal-sub">{product ? `Enquiry for ${product.name}` : 'Begin your bespoke formulation journey.'}</p>
            <label>Full Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" required />
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." required />
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com" />
            <label>Message</label>
            <textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us about your skin goals" />
            <div style={{ marginTop: 24 }}>
              <button className="btn-pill solid" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending...' : 'Request Consultation'}
              </button>
            </div>
            {status === 'error' && <p style={{ color: '#e57373', fontSize: 13, marginTop: 12, textAlign: 'center' }}>Something went wrong. Please try again.</p>}
          </form>
        )}
      </div>
    </div>
  )
}

function App() {
  const [active, setActive] = useState('premium')
  const [tabs, setTabs] = useState(DEFAULT_TABS)
  const [intros, setIntros] = useState({})
  const [content, setContent] = useState(DEFAULT_CONTENT)
  const [products, setProducts] = useState([])
  const [team, setTeam] = useState([])
  const [faqs, setFaqs] = useState([])
  const [openFaq, setOpenFaq] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalProduct, setModalProduct] = useState(null)
  const viewed = useRef(false)

  useEffect(() => {
    if (!viewed.current) { viewed.current = true; track('page_view', {}) }
    fetch('/api/products').then((r) => r.json()).then((d) => setProducts(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/team').then((r) => r.json()).then((d) => setTeam(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/faqs').then((r) => r.json()).then((d) => setFaqs(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/content').then((r) => r.json()).then((d) => { if (d && d.key) setContent(d) }).catch(() => {})
    fetch('/api/categories').then((r) => r.json()).then((d) => {
      if (Array.isArray(d) && d.length) {
        setTabs(d.map((c) => ({ key: c.key, label: c.label })))
        const m = {}
        d.forEach((c) => { m[c.key] = { title: c.introTitle, text: c.introText } })
        setIntros(m)
      }
    }).catch(() => {})
  }, [])

  const openInquiry = useCallback((p) => {
    if (p) track('inquiry', { name: p.name, tier: p.tier })
    else track('cta_click', { location: 'bespoke' })
    setModalProduct(p || null)
    setModalOpen(true)
  }, [])

  const switchTab = (key) => {
    setActive(key)
    setOpenFaq(null)
    track('tab_switch', { tier: key })
  }

  const tierProducts = products.filter((p) => p.tier === active)
  const intro = intros[active] || {}
  const tel = 'tel:' + (content.phone || '').replace(/\s+/g, '')

  return (
    <div className="page">
      <div className="ambient-glow" />
      <Header phone={content.phone} />

      <main className="container">
        {active !== 'super' && (
          <section className="hero">
            <h1 className="gold-text">{content.heroTitle}</h1>
            <p className="sub">{content.heroSub}</p>
          </section>
        )}

        <div className="switcher-wrap">
          <div className="switcher">
            {tabs.map((t) => (
              <button key={t.key} className={active === t.key ? 'active' : ''} onClick={() => switchTab(t.key)}>{t.label}</button>
            ))}
          </div>
        </div>

        {active !== 'super' ? (
          <section className="view" key={active}>
            <div className="section-intro">
              <h2 className="gold-text">{intro.title}</h2>
              <p>{intro.text}</p>
            </div>
            <div className="product-grid">
              {tierProducts.map((p) => (<ProductCard key={p.id} p={p} onInquire={openInquiry} />))}
            </div>
          </section>
        ) : (
          <section className="view" key="super">
            <div className="flagship-hero">
              <h1 className="gold-text">{(content.flagshipTitle || '').split(' ').length > 2 ? <>{content.flagshipTitle.split(' ').slice(0, 2).join(' ')}<br />{content.flagshipTitle.split(' ').slice(2).join(' ')}</> : content.flagshipTitle}</h1>
              <p className="sub">{content.flagshipSub}</p>
            </div>

            <div className="article-blocks">
              <div className="article-block">
                <h3 className="gold-text">{content.whatTitle}</h3>
                <p>{content.whatText}</p>
              </div>
              <div className="article-block">
                <h3 className="gold-text">{content.whyTitle}</h3>
                <p>{content.whyText}</p>
              </div>
            </div>

            <h2 className="block-heading gold-text">How It Works</h2>
            <div className="process-grid">
              {(content.process || []).map((s) => (
                <div className="process-step" key={s.n}>
                  <span className="process-num">{s.n}</span>
                  <h4>{s.title}</h4>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>

            <div className="feedback-banner">
              <h3 className="gold-text">{content.feedbackTitle}</h3>
              <p>{content.feedbackText}</p>
            </div>

            <h2 className="block-heading gold-text">The Master Minds</h2>
            <div className="team-grid">
              {team.map((m) => (
                <div className="team-member" key={m.id}>
                  <div className="team-photo"><img src={m.imageUrl} alt={m.name} /></div>
                  <h4>{m.name}</h4>
                  <div className="team-role">{m.role}</div>
                  <p className="team-bio">{m.bio}</p>
                </div>
              ))}
            </div>

            <h2 className="block-heading gold-text">Frequently Asked Questions</h2>
            <div className="faq-wrap">
              {faqs.map((f, i) => (
                <FaqItem key={f.id} faq={f} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
              ))}
            </div>

            <div style={{ textAlign: 'center', paddingBottom: 60 }}>
              <button className="btn-pill solid" onClick={() => openInquiry(null)}>Book Your Bespoke Consultation</button>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="container">
          <h2 className="gold-text">{content.footerHeading}</h2>
          <p>{content.footerText}</p>
          <a className="btn-pill solid" href={tel} onClick={() => track('cta_click', { location: 'footer' })}>Book Phone Consultation: {content.phone}</a>
          <div className="copyright">&copy; {new Date().getFullYear()} DERMATICS. All Rights Reserved. Crafted for Skin Lovers.</div>
        </div>
      </footer>

      <ConsultationModal open={modalOpen} onClose={() => setModalOpen(false)} product={modalProduct} />
    </div>
  )
}

export default App
