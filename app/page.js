'use client'

import { useEffect, useState, useCallback } from 'react'

const TABS = [
  { key: 'premium', label: 'Premium' },
  { key: 'ultra', label: 'Ultra Premium' },
  { key: 'super', label: 'Super Ultra Premium Luxury' },
]

const INTROS = {
  premium: {
    title: 'The Universal Essentials',
    text: 'A refined foundation of everyday luxuries \u2014 timeless formulations crafted to hydrate, protect and reveal the skin\u2019s natural brilliance.',
  },
  ultra: {
    title: 'Precision Longevity',
    text: 'Advanced, science-led actives engineered to defend against ageing at the cellular level \u2014 for those who demand more from their ritual.',
  },
}

const PROCESS = [
  { n: '01', title: 'Book Dermatologist Consultation', text: 'A one-on-one session where our dermatologist maps your skin type, concerns and goals in detail.' },
  { n: '02', title: 'Scientific Board Review', text: 'Our scientific board reviews your diagnosis and architects a formula tailored precisely to your skin.' },
  { n: '03', title: 'Custom Compounding & Approval', text: 'Your bespoke formula is hand-compounded in small batches and approved for potency and safety.' },
  { n: '04', title: 'Home Delivery & Evaluation', text: 'Delivered to your door, followed by a structured evaluation to refine and perfect your results.' },
]

const Header = ({ onBook }) => (
  <header className="header">
    <div className="container header-inner">
      <div className="brand gold-text">DERMATICS</div>
      <a className="btn-pill" href="tel:+919876543210">Book Appointment: +91 98765 43210</a>
    </div>
  </header>
)

const ProductCard = ({ p, onInquire }) => (
  <div className="product-card">
    <div className="product-img">
      <img src={p.imageUrl} alt={p.name} />
    </div>
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
  const [products, setProducts] = useState([])
  const [team, setTeam] = useState([])
  const [faqs, setFaqs] = useState([])
  const [openFaq, setOpenFaq] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalProduct, setModalProduct] = useState(null)

  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then(setProducts).catch(() => {})
    fetch('/api/team').then((r) => r.json()).then(setTeam).catch(() => {})
    fetch('/api/faqs').then((r) => r.json()).then(setFaqs).catch(() => {})
  }, [])

  const openInquiry = useCallback((p) => {
    setModalProduct(p || null)
    setModalOpen(true)
  }, [])

  const tierProducts = products.filter((p) => p.tier === active)

  return (
    <div className="page">
      <div className="ambient-glow" />
      <Header />

      <main className="container">
        {active !== 'super' && (
          <section className="hero">
            <h1 className="gold-text">DERMATICS</h1>
            <p className="sub">The Art & Science of Bespoke Skincare</p>
          </section>
        )}

        <div className="switcher-wrap">
          <div className="switcher">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={active === t.key ? 'active' : ''}
                onClick={() => { setActive(t.key); setOpenFaq(null) }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {active === 'premium' || active === 'ultra' ? (
          <section className="view" key={active}>
            <div className="section-intro">
              <h2 className="gold-text">{INTROS[active].title}</h2>
              <p>{INTROS[active].text}</p>
            </div>
            <div className="product-grid">
              {tierProducts.map((p) => (
                <ProductCard key={p.id} p={p} onInquire={openInquiry} />
              ))}
            </div>
          </section>
        ) : (
          <section className="view" key="super">
            {/* Flagship hero */}
            <div className="flagship-hero">
              <h1 className="gold-text">MY SKIN<br />MY FORMULATION</h1>
              <p className="sub">Customise Skin Care Solution For Skin Lovers</p>
            </div>

            {/* Article blocks */}
            <div className="article-blocks">
              <div className="article-block">
                <h3 className="gold-text">What is My Skin My Formulation?</h3>
                <p>My Skin My Formulation is our flagship bespoke service where your skincare is created entirely around you. Instead of choosing from ready-made products, you receive a formulation designed from your own dermatological diagnosis \u2014 a single, precise solution compounded to match your skin\u2019s exact needs, concerns and goals.</p>
              </div>
              <div className="article-block">
                <h3 className="gold-text">Why My Skin My Formulation?</h3>
                <p>Because no two skins are the same. Generic products treat an average; a bespoke formulation treats you. By uniting dermatology, cosmetic chemistry and longevity science, we craft a ritual that evolves with your skin \u2014 delivering results that mass-market luxury simply cannot promise.</p>
              </div>
            </div>

            {/* Process */}
            <h2 className="block-heading gold-text">How It Works</h2>
            <div className="process-grid">
              {PROCESS.map((s) => (
                <div className="process-step" key={s.n}>
                  <span className="process-num">{s.n}</span>
                  <h4>{s.title}</h4>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>

            {/* Feedback banner */}
            <div className="feedback-banner">
              <h3 className="gold-text">Infinite Perfection Guarantee</h3>
              <p>Aapki skin ki journey humari zimmedari hai. Agar aapko apni formulation perfect na lage, toh hum aapki feedback lekar use baar-baar refine karenge \u2014 bina kisi extra cost ke. Kyunki perfection ek destination nahi, ek continuous feedback loop hai, aur hum tab tak nahi rukte jab tak aapki skin bilkul perfect na ho jaaye.</p>
            </div>

            {/* Team */}
            <h2 className="block-heading gold-text">The Master Minds</h2>
            <div className="team-grid">
              {team.map((m) => (
                <div className="team-member" key={m.id}>
                  <div className="team-photo">
                    <img src={m.imageUrl} alt={m.name} />
                  </div>
                  <h4>{m.name}</h4>
                  <div className="team-role">{m.role}</div>
                  <p className="team-bio">{m.bio}</p>
                </div>
              ))}
            </div>

            {/* FAQ */}
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

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <h2 className="gold-text">Ready For Your Bespoke Formulation?</h2>
          <p>Speak with our concierge and begin a skincare ritual designed entirely around you.</p>
          <a className="btn-pill solid" href="tel:+919876543210">Book Phone Consultation: +91 98765 43210</a>
          <div className="copyright">&copy; {new Date().getFullYear()} DERMATICS. All Rights Reserved. Crafted for Skin Lovers.</div>
        </div>
      </footer>

      <ConsultationModal open={modalOpen} onClose={() => setModalOpen(false)} product={modalProduct} />
    </div>
  )
}

export default App
