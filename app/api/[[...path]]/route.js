import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { hashPassword, verifyPassword, signToken, getAuthUser, cookieOptions } from '@/lib/auth'
import fs from 'fs/promises'
import nodePath from 'path'

// NOTE: Secure file storage fallback.
// The verified playbook recommends a PRIVATE AWS S3 bucket with presigned URLs.
// Since AWS credentials were not provided, sensitive files (medical reports / face
// photos) are stored on the server's private disk (outside /public) and streamed
// ONLY to authenticated admins (acts like a signed URL gate). Swap to S3 for
// production. FLAGGED FOR DATA-PROTECTION REVIEW before going live with health data.
const UPLOAD_DIR = nodePath.join(process.cwd(), 'uploads')
const TMP_DIR = nodePath.join(UPLOAD_DIR, 'tmp')
const EXT_BY_TYPE = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }

let dbPromise
let seedPromise

async function connectToMongo() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const c = new MongoClient(process.env.MONGO_URL)
      await c.connect()
      return c.db(process.env.DB_NAME)
    })()
  }
  return dbPromise
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// ---------------- SEED DATA ----------------
const PRODUCTS = [
  { id: uuidv4(), tier: 'premium', tag: 'The Universal Essentials', name: 'Luminous Cellular Dew', description: 'A weightless hydrating essence that revives dull skin with a dewy, lit-from-within radiance.', price: 140, imageUrl: 'https://images.pexels.com/photos/29642374/pexels-photo-29642374.jpeg' },
  { id: uuidv4(), tier: 'premium', tag: 'The Universal Essentials', name: 'Velvet Barrier Cream', description: 'A rich, restorative moisturiser that fortifies the skin barrier and locks in lasting comfort.', price: 195, imageUrl: 'https://images.pexels.com/photos/29240451/pexels-photo-29240451.jpeg' },
  { id: uuidv4(), tier: 'premium', tag: 'The Universal Essentials', name: 'Pure Nectar Essence', description: 'A silky botanical essence that preps and balances the complexion for deeper absorption.', price: 165, imageUrl: 'https://images.unsplash.com/photo-1613803745799-ba6c10aace85' },
  { id: uuidv4(), tier: 'ultra', tag: 'Precision Longevity', name: 'Telomere Matrix Serum', description: 'A cellular longevity serum engineered to defend against biological ageing at its source.', price: 380, imageUrl: 'https://images.unsplash.com/photo-1631390179406-0bfe17e9f89d' },
  { id: uuidv4(), tier: 'ultra', tag: 'Precision Longevity', name: 'Platinum Neuro-Infusion', description: 'A neuro-active infusion that calms reactivity while visibly firming and refining texture.', price: 450, imageUrl: 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19' },
  { id: uuidv4(), tier: 'ultra', tag: 'Precision Longevity', name: 'Chronobiology Night Balm', description: 'A time-released overnight balm synchronised to the skin\u2019s nocturnal repair rhythm.', price: 420, imageUrl: 'https://images.unsplash.com/photo-1545936761-c64b78657cb1' },
]

const TEAM = [
  { id: uuidv4(), order: 1, name: 'Aarav Mehta', role: 'Founder', bio: 'Visionary behind DERMATICS, redefining luxury skincare through science, craft and deep personalisation.', imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=srgb&fm=jpg&q=85' },
  { id: uuidv4(), order: 2, name: 'Dr. Isabella Rossi', role: 'Chief Dermatologist', bio: 'Board-certified dermatologist with two decades diagnosing and designing bespoke clinical protocols.', imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?crop=entropy&cs=srgb&fm=jpg&q=85' },
  { id: uuidv4(), order: 3, name: 'Rohan Kapoor', role: 'Lead Cosmetic Chemist', bio: 'Master formulator translating each diagnosis into a stable, elegant, high-performance compound.', imageUrl: 'https://images.pexels.com/photos/37148308/pexels-photo-37148308.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940' },
  { id: uuidv4(), order: 4, name: 'Dr. Naomi Chen', role: 'Chief Scientist', bio: 'Leads the scientific board, validating every formulation against the latest longevity research.', imageUrl: 'https://images.pexels.com/photos/27086922/pexels-photo-27086922.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940' },
]

const FAQS = [
  { id: uuidv4(), order: 1, question: 'My Skin My Formulation kaise kaam karta hai?', answer: 'Sabse pehle aap hamare dermatologist ke saath consultation book karte hain. Aapki skin ka poora analysis hota hai \u2014 skin type, concerns aur goals. Uske baad hamara scientific board aapke liye ek custom formula design karta hai, jo lab mein specially compound hota hai. Ye ek personalised solution hai, na ki koi ready-made product.' },
  { id: uuidv4(), order: 2, question: 'Custom formulation ready hone mein kitna time lagta hai?', answer: 'Consultation ke baad, scientific board review aur custom compounding mein aam taur par 7 se 10 working days lagte hain. Har batch haath se, chhote quantities mein banaya jaata hai taaki freshness aur potency maximum rahe. Ready hote hi aapke ghar tak safely deliver kiya jaata hai.' },
  { id: uuidv4(), order: 3, question: 'Agar formulation mujhe suit nahi karti toh?', answer: 'Bilkul tension mat lijiye \u2014 hamari Infinite Perfection Guarantee aapke saath hai. Agar result perfect nahi lage, toh hamari team aapki feedback lekar formula ko dobara refine karti hai, bina kisi extra cost ke. Perfection ek continuous loop hai, aur hum tab tak refine karte hain jab tak aap poori tarah satisfied na ho jaayein.' },
]

const CATEGORIES = [
  { id: uuidv4(), key: 'premium', order: 1, label: 'Premium', introTitle: 'The Universal Essentials', introText: 'A refined foundation of everyday luxuries \u2014 timeless formulations crafted to hydrate, protect and reveal the skin\u2019s natural brilliance.' },
  { id: uuidv4(), key: 'ultra', order: 2, label: 'Ultra Premium', introTitle: 'Precision Longevity', introText: 'Advanced, science-led actives engineered to defend against ageing at the cellular level \u2014 for those who demand more from their ritual.' },
  { id: uuidv4(), key: 'super', order: 3, label: 'Super Ultra Premium Luxury', introTitle: 'My Skin My Formulation', introText: 'Customise Skin Care Solution For Skin Lovers' },
]

const CONTENT = {
  key: 'site',
  heroTitle: 'DERMATICS',
  heroSub: 'The Art & Science of Bespoke Skincare',
  flagshipTitle: 'MY SKIN MY FORMULATION',
  flagshipSub: 'Customise Skin Care Solution For Skin Lovers',
  whatTitle: 'What is My Skin My Formulation?',
  whatText: 'My Skin My Formulation is our flagship bespoke service where your skincare is created entirely around you. Instead of choosing from ready-made products, you receive a formulation designed from your own dermatological diagnosis \u2014 a single, precise solution compounded to match your skin\u2019s exact needs, concerns and goals.',
  whyTitle: 'Why My Skin My Formulation?',
  whyText: 'Because no two skins are the same. Generic products treat an average; a bespoke formulation treats you. By uniting dermatology, cosmetic chemistry and longevity science, we craft a ritual that evolves with your skin \u2014 delivering results that mass-market luxury simply cannot promise.',
  process: [
    { n: '01', title: 'Book Dermatologist Consultation', text: 'A one-on-one session where our dermatologist maps your skin type, concerns and goals in detail.' },
    { n: '02', title: 'Scientific Board Review', text: 'Our scientific board reviews your diagnosis and architects a formula tailored precisely to your skin.' },
    { n: '03', title: 'Custom Compounding & Approval', text: 'Your bespoke formula is hand-compounded in small batches and approved for potency and safety.' },
    { n: '04', title: 'Home Delivery & Evaluation', text: 'Delivered to your door, followed by a structured evaluation to refine and perfect your results.' },
  ],
  feedbackTitle: 'Infinite Perfection Guarantee',
  feedbackText: 'Aapki skin ki journey humari zimmedari hai. Agar aapko apni formulation perfect na lage, toh hum aapki feedback lekar use baar-baar refine karenge \u2014 bina kisi extra cost ke. Kyunki perfection ek destination nahi, ek continuous feedback loop hai, aur hum tab tak nahi rukte jab tak aapki skin bilkul perfect na ho jaaye.',
  footerHeading: 'Ready For Your Bespoke Formulation?',
  footerText: 'Speak with our concierge and begin a skincare ritual designed entirely around you.',
  phone: '+91 98765 43210',
}

const PACKAGES = [
  { id: uuidv4(), order: 1, name: 'Essential Formulation', price: 1200, description: 'The perfect entry into bespoke skincare \u2014 a single custom formula built around your primary skin concern.', recommended: false, features: ['1 Dermatologist Consultation', '1 Reformulation Iteration', 'Quarterly Delivery', 'Personalized Skin Diagnostic Report', 'Email Support'] },
  { id: uuidv4(), order: 2, name: 'Advanced Formulation', price: 2800, description: 'A complete, evolving ritual \u2014 multiple formulas refined together as your skin transforms through the seasons.', recommended: true, features: ['3 Dermatologist Consultations', '3 Reformulation Iterations', 'Monthly Delivery', 'Advanced Diagnostic Report', 'Priority Concierge Support', 'Seasonal Formula Adjustments'] },
  { id: uuidv4(), order: 3, name: 'Elite Formulation', price: 5500, description: 'The pinnacle of personalisation \u2014 unlimited refinement, a dedicated scientific team, and white-glove care.', recommended: false, features: ['Unlimited Consultations', 'Unlimited Reformulations', 'Bi-Weekly Delivery', 'Comprehensive Longevity Report', '24/7 Dedicated Concierge', 'Dedicated Scientific Board', 'Annual In-Person Skin Review'] },
]

// Demo variants applied to specific products (Premium & Ultra tiers)
const VARIANT_DEMO = {
  'Velvet Barrier Cream': [
    { label: '50 ml', price: 195 },
    { label: '100 ml', price: 320 },
  ],
  'Luminous Cellular Dew': [
    { label: '30 ml', price: 140 },
    { label: '50 ml', price: 210 },
  ],
  'Platinum Neuro-Infusion': [
    { label: '15 ml', price: 450 },
    { label: '30 ml', price: 820 },
  ],
}
const SUNSCREEN = { tier: 'premium', tag: 'The Universal Essentials', name: 'Solar Veil Mineral Fluid', description: 'A weightless mineral sunscreen that shields, primes and perfects \u2014 available across protection levels.', imageUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?crop=entropy&cs=srgb&fm=jpg&q=85', basePrice: 95, variants: [{ label: 'SPF 30', price: 95 }, { label: 'SPF 50', price: 115 }, { label: 'SPF 50+ PA++++', price: 140 }] }

async function ensureUploadDirs() {
  await fs.mkdir(TMP_DIR, { recursive: true })
  await fs.mkdir(nodePath.join(UPLOAD_DIR, 'files'), { recursive: true })
}

async function seedIfEmpty(db) {
  if (await db.collection('products').countDocuments() === 0) {
    await db.collection('products').insertMany(PRODUCTS.map(p => ({ ...p })))
  }
  if (await db.collection('team').countDocuments() === 0) {
    await db.collection('team').insertMany(TEAM.map(t => ({ ...t })))
  }
  if (await db.collection('faqs').countDocuments() === 0) {
    await db.collection('faqs').insertMany(FAQS.map(f => ({ ...f })))
  }
  if (await db.collection('categories').countDocuments() === 0) {
    await db.collection('categories').insertMany(CATEGORIES.map(c => ({ ...c })))
  }
  if (await db.collection('content').countDocuments() === 0) {
    await db.collection('content').insertOne({ ...CONTENT })
  }
  if (await db.collection('packages').countDocuments() === 0) {
    await db.collection('packages').insertMany(PACKAGES.map(p => ({ ...p })))
  }
  // Ensure demo variants exist on specific products (idempotent)
  for (const [name, variants] of Object.entries(VARIANT_DEMO)) {
    await db.collection('products').updateOne(
      { name, variants: { $exists: false } },
      { $set: { variants } }
    )
  }
  // Ensure the SPF sunscreen demo product exists
  const hasSunscreen = await db.collection('products').findOne({ name: SUNSCREEN.name })
  if (!hasSunscreen) {
    await db.collection('products').insertOne({ id: uuidv4(), tier: SUNSCREEN.tier, tag: SUNSCREEN.tag, name: SUNSCREEN.name, description: SUNSCREEN.description, price: SUNSCREEN.basePrice, imageUrl: SUNSCREEN.imageUrl, variants: SUNSCREEN.variants })
  }
  await ensureUploadDirs()
  // seed admin
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@dermatics.com').toLowerCase()
  const existing = await db.collection('users').findOne({ email: adminEmail })
  if (!existing) {
    const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD || 'admin123')
    await db.collection('users').insertOne({ id: uuidv4(), email: adminEmail, name: 'Admin', role: 'admin', passwordHash, active: true, createdAt: new Date() })
  }
}

function clean(doc) {
  if (!doc) return doc
  const { _id, passwordHash, ...rest } = doc
  return rest
}

async function readBody(request) {
  try { return await request.json() } catch { return {} }
}

// ---------------- ROUTE HANDLER ----------------
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()
    if (!seedPromise) seedPromise = seedIfEmpty(db)
    await seedPromise

    // ---------- PUBLIC ----------
    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'DERMATICS API' }))
    }

    // ----- AUTH -----
    if (route === '/auth/register' && method === 'POST') {
      const body = await readBody(request)
      const email = (body.email || '').toLowerCase().trim()
      if (!email || !body.password || !body.name) {
        return handleCORS(NextResponse.json({ error: 'name, email and password are required' }, { status: 400 }))
      }
      const exists = await db.collection('users').findOne({ email })
      if (exists) return handleCORS(NextResponse.json({ error: 'Email already registered' }, { status: 409 }))
      const passwordHash = await hashPassword(body.password)
      const user = { id: uuidv4(), email, name: body.name, role: 'user', passwordHash, active: true, createdAt: new Date() }
      await db.collection('users').insertOne(user)
      const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name })
      await db.collection('analytics_events').insertOne({ id: uuidv4(), event_type: 'signup', page: '/signup', metadata: {}, session_id: body.session_id || null, user_id: user.id, timestamp: new Date() })
      const res = NextResponse.json({ user: clean(user) })
      res.cookies.set('access_token', token, cookieOptions())
      return handleCORS(res)
    }

    if (route === '/auth/login' && method === 'POST') {
      const body = await readBody(request)
      const email = (body.email || '').toLowerCase().trim()
      const user = await db.collection('users').findOne({ email })
      if (!user || !(await verifyPassword(body.password || '', user.passwordHash))) {
        return handleCORS(NextResponse.json({ error: 'Invalid email or password' }, { status: 401 }))
      }
      if (user.active === false) {
        return handleCORS(NextResponse.json({ error: 'Account is deactivated' }, { status: 403 }))
      }
      const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name })
      await db.collection('analytics_events').insertOne({ id: uuidv4(), event_type: 'login', page: '/login', metadata: {}, session_id: body.session_id || null, user_id: user.id, timestamp: new Date() })
      const res = NextResponse.json({ user: clean(user) })
      res.cookies.set('access_token', token, cookieOptions())
      return handleCORS(res)
    }

    if (route === '/auth/logout' && method === 'POST') {
      const res = NextResponse.json({ success: true })
      res.cookies.set('access_token', '', { ...cookieOptions(), maxAge: 0 })
      return handleCORS(res)
    }

    if (route === '/auth/me' && method === 'GET') {
      const auth = await getAuthUser(request)
      if (!auth) return handleCORS(NextResponse.json({ user: null }, { status: 200 }))
      const user = await db.collection('users').findOne({ id: auth.id })
      return handleCORS(NextResponse.json({ user: clean(user) }))
    }

    // ----- CONTENT / CATEGORIES (public GET) -----
    if (route === '/categories' && method === 'GET') {
      const cats = await db.collection('categories').find({}).sort({ order: 1 }).toArray()
      return handleCORS(NextResponse.json(cats.map(clean)))
    }
    if (route === '/content' && method === 'GET') {
      const doc = await db.collection('content').findOne({ key: 'site' })
      return handleCORS(NextResponse.json(clean(doc)))
    }

    // ----- PRODUCTS (public GET) -----
    if (route === '/products' && method === 'GET') {
      const { searchParams } = new URL(request.url)
      const tier = searchParams.get('tier')
      const query = tier ? { tier } : {}
      const products = await db.collection('products').find(query).toArray()
      return handleCORS(NextResponse.json(products.map(clean)))
    }

    // ----- TEAM / FAQ (public GET) -----
    if (route === '/team' && method === 'GET') {
      const team = await db.collection('team').find({}).sort({ order: 1 }).toArray()
      return handleCORS(NextResponse.json(team.map(clean)))
    }
    if (route === '/faqs' && method === 'GET') {
      const faqs = await db.collection('faqs').find({}).sort({ order: 1 }).toArray()
      return handleCORS(NextResponse.json(faqs.map(clean)))
    }

    // ----- CONSULTATION -----
    if (route === '/consultation' && method === 'POST') {
      const body = await readBody(request)
      if (!body.name || !body.phone) {
        return handleCORS(NextResponse.json({ error: 'name and phone are required' }, { status: 400 }))
      }
      const submission = { id: uuidv4(), name: body.name, phone: body.phone, email: body.email || '', tier: body.tier || '', message: body.message || '', createdAt: new Date() }
      await db.collection('consultations').insertOne(submission)
      return handleCORS(NextResponse.json({ success: true, submission: clean(submission) }))
    }

    // ----- ANALYTICS event (public POST) -----
    if (route === '/analytics/event' && method === 'POST') {
      const body = await readBody(request)
      const auth = await getAuthUser(request)
      const evt = {
        id: uuidv4(),
        event_type: body.event_type || 'page_view',
        page: body.page || '/',
        metadata: body.metadata || {},
        session_id: body.session_id || null,
        user_id: auth ? auth.id : (body.user_id || null),
        referrer: body.referrer || '',
        device: body.device || '',
        timestamp: new Date(),
      }
      await db.collection('analytics_events').insertOne(evt)
      return handleCORS(NextResponse.json({ success: true }))
    }

    // ----- PACKAGES (public GET) -----
    if (route === '/packages' && method === 'GET') {
      const pkgs = await db.collection('packages').find({}).sort({ order: 1 }).toArray()
      return handleCORS(NextResponse.json(pkgs.map(clean)))
    }

    // ----- SECURE FILE UPLOAD (chunked, to bypass proxy body limits) -----
    // POST /api/upload/chunk  { uploadId, index, total, data(base64), fileName, contentType }
    if (route === '/upload/chunk' && method === 'POST') {
      const b = await readBody(request)
      if (!b.uploadId || b.index === undefined || !b.data) {
        return handleCORS(NextResponse.json({ error: 'uploadId, index and data required' }, { status: 400 }))
      }
      if (!/^[a-zA-Z0-9\-]+$/.test(b.uploadId)) {
        return handleCORS(NextResponse.json({ error: 'invalid uploadId' }, { status: 400 }))
      }
      await ensureUploadDirs()
      const dir = nodePath.join(TMP_DIR, b.uploadId)
      await fs.mkdir(dir, { recursive: true })
      const buf = Buffer.from(b.data, 'base64')
      await fs.writeFile(nodePath.join(dir, String(b.index).padStart(6, '0')), buf)
      return handleCORS(NextResponse.json({ success: true, index: b.index }))
    }

    // POST /api/upload/complete  { uploadId, fileName, contentType }
    if (route === '/upload/complete' && method === 'POST') {
      const b = await readBody(request)
      if (!b.uploadId || !/^[a-zA-Z0-9\-]+$/.test(b.uploadId)) {
        return handleCORS(NextResponse.json({ error: 'invalid uploadId' }, { status: 400 }))
      }
      const ext = EXT_BY_TYPE[b.contentType] || 'bin'
      const dir = nodePath.join(TMP_DIR, b.uploadId)
      let chunks
      try { chunks = (await fs.readdir(dir)).sort() } catch { return handleCORS(NextResponse.json({ error: 'no chunks found' }, { status: 400 })) }
      const fileId = uuidv4()
      const finalPath = nodePath.join(UPLOAD_DIR, 'files', `${fileId}.${ext}`)
      const parts = []
      for (const c of chunks) parts.push(await fs.readFile(nodePath.join(dir, c)))
      const full = Buffer.concat(parts)
      await fs.writeFile(finalPath, full)
      await fs.rm(dir, { recursive: true, force: true })
      const meta = { id: fileId, originalName: b.fileName || 'file', contentType: b.contentType || 'application/octet-stream', ext, size: full.length, path: finalPath, createdAt: new Date() }
      await db.collection('secure_files').insertOne(meta)
      return handleCORS(NextResponse.json({ fileId, size: full.length }))
    }

    // ----- DIAGNOSTIC CONSULTATION (intake form; sensitive) -----
    // POST /api/diagnostic-consultation  (public/user submit)
    if (route === '/diagnostic-consultation' && method === 'POST') {
      const b = await readBody(request)
      if (!b.fullName || !b.phone || !b.consent) {
        return handleCORS(NextResponse.json({ error: 'fullName, phone and consent are required' }, { status: 400 }))
      }
      const authUser = await getAuthUser(request)
      const submission = {
        id: uuidv4(),
        fullName: b.fullName,
        email: b.email || '',
        phone: b.phone,
        address: b.address || '',
        bloodGroup: b.bloodGroup || '',
        allergies: b.allergies || '',
        currentRoutine: b.currentRoutine || '',
        reportFileIds: Array.isArray(b.reportFileIds) ? b.reportFileIds : [],
        facePhotoFileIds: Array.isArray(b.facePhotoFileIds) ? b.facePhotoFileIds : [],
        consent: true,
        status: 'New',
        userId: authUser ? authUser.id : null,
        createdAt: new Date(),
      }
      await db.collection('diagnostic_consultations').insertOne(submission)
      // Return only a confirmation id (do NOT echo sensitive data publicly)
      return handleCORS(NextResponse.json({ success: true, id: submission.id }))
    }

    // ================= ADMIN-PROTECTED =================
    const auth = await getAuthUser(request)
    const isAdmin = auth && auth.role === 'admin'
    const requireAdmin = () => handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    // Products CRUD
    if (route === '/admin/products' && method === 'POST') {
      if (!isAdmin) return requireAdmin()
      const b = await readBody(request)
      const product = { id: uuidv4(), tier: b.tier || 'premium', tag: b.tag || '', name: b.name || '', description: b.description || '', price: Number(b.price) || 0, imageUrl: b.imageUrl || '', variants: Array.isArray(b.variants) ? b.variants.map(v => ({ label: v.label || '', price: Number(v.price) || 0, imageUrl: v.imageUrl || '' })) : [] }
      await db.collection('products').insertOne(product)
      return handleCORS(NextResponse.json(clean(product)))
    }
    if (route.startsWith('/admin/products/') && method === 'PUT') {
      if (!isAdmin) return requireAdmin()
      const id = path[2]
      const b = await readBody(request)
      const update = { tier: b.tier, tag: b.tag, name: b.name, description: b.description, price: Number(b.price), imageUrl: b.imageUrl }
      if (Array.isArray(b.variants)) update.variants = b.variants.map(v => ({ label: v.label || '', price: Number(v.price) || 0, imageUrl: v.imageUrl || '' }))
      Object.keys(update).forEach(k => update[k] === undefined && delete update[k])
      await db.collection('products').updateOne({ id }, { $set: update })
      const doc = await db.collection('products').findOne({ id })
      return handleCORS(NextResponse.json(clean(doc)))
    }
    if (route.startsWith('/admin/products/') && method === 'DELETE') {
      if (!isAdmin) return requireAdmin()
      const id = path[2]
      await db.collection('products').deleteOne({ id })
      return handleCORS(NextResponse.json({ success: true }))
    }

    // Categories update
    if (route.startsWith('/admin/categories/') && method === 'PUT') {
      if (!isAdmin) return requireAdmin()
      const id = path[2]
      const b = await readBody(request)
      const update = { label: b.label, introTitle: b.introTitle, introText: b.introText }
      Object.keys(update).forEach(k => update[k] === undefined && delete update[k])
      await db.collection('categories').updateOne({ id }, { $set: update })
      const doc = await db.collection('categories').findOne({ id })
      return handleCORS(NextResponse.json(clean(doc)))
    }

    // Content update
    if (route === '/admin/content' && method === 'PUT') {
      if (!isAdmin) return requireAdmin()
      const b = await readBody(request)
      const { _id, key, ...fields } = b
      await db.collection('content').updateOne({ key: 'site' }, { $set: fields }, { upsert: true })
      const doc = await db.collection('content').findOne({ key: 'site' })
      return handleCORS(NextResponse.json(clean(doc)))
    }

    // Team CRUD
    if (route === '/admin/team' && method === 'POST') {
      if (!isAdmin) return requireAdmin()
      const b = await readBody(request)
      const m = { id: uuidv4(), order: Number(b.order) || 99, name: b.name || '', role: b.role || '', bio: b.bio || '', imageUrl: b.imageUrl || '' }
      await db.collection('team').insertOne(m)
      return handleCORS(NextResponse.json(clean(m)))
    }
    if (route.startsWith('/admin/team/') && method === 'PUT') {
      if (!isAdmin) return requireAdmin()
      const id = path[2]
      const b = await readBody(request)
      const update = { order: b.order !== undefined ? Number(b.order) : undefined, name: b.name, role: b.role, bio: b.bio, imageUrl: b.imageUrl }
      Object.keys(update).forEach(k => update[k] === undefined && delete update[k])
      await db.collection('team').updateOne({ id }, { $set: update })
      const doc = await db.collection('team').findOne({ id })
      return handleCORS(NextResponse.json(clean(doc)))
    }
    if (route.startsWith('/admin/team/') && method === 'DELETE') {
      if (!isAdmin) return requireAdmin()
      await db.collection('team').deleteOne({ id: path[2] })
      return handleCORS(NextResponse.json({ success: true }))
    }

    // FAQ CRUD
    if (route === '/admin/faqs' && method === 'POST') {
      if (!isAdmin) return requireAdmin()
      const b = await readBody(request)
      const f = { id: uuidv4(), order: Number(b.order) || 99, question: b.question || '', answer: b.answer || '' }
      await db.collection('faqs').insertOne(f)
      return handleCORS(NextResponse.json(clean(f)))
    }
    if (route.startsWith('/admin/faqs/') && method === 'PUT') {
      if (!isAdmin) return requireAdmin()
      const id = path[2]
      const b = await readBody(request)
      const update = { order: b.order !== undefined ? Number(b.order) : undefined, question: b.question, answer: b.answer }
      Object.keys(update).forEach(k => update[k] === undefined && delete update[k])
      await db.collection('faqs').updateOne({ id }, { $set: update })
      const doc = await db.collection('faqs').findOne({ id })
      return handleCORS(NextResponse.json(clean(doc)))
    }
    if (route.startsWith('/admin/faqs/') && method === 'DELETE') {
      if (!isAdmin) return requireAdmin()
      await db.collection('faqs').deleteOne({ id: path[2] })
      return handleCORS(NextResponse.json({ success: true }))
    }

    // Packages CRUD
    if (route === '/admin/packages' && method === 'POST') {
      if (!isAdmin) return requireAdmin()
      const b = await readBody(request)
      const pkg = { id: uuidv4(), order: Number(b.order) || 99, name: b.name || '', price: Number(b.price) || 0, description: b.description || '', recommended: !!b.recommended, features: Array.isArray(b.features) ? b.features : [] }
      await db.collection('packages').insertOne(pkg)
      return handleCORS(NextResponse.json(clean(pkg)))
    }
    if (route.startsWith('/admin/packages/') && method === 'PUT') {
      if (!isAdmin) return requireAdmin()
      const id = path[2]
      const b = await readBody(request)
      const update = { order: b.order !== undefined ? Number(b.order) : undefined, name: b.name, price: b.price !== undefined ? Number(b.price) : undefined, description: b.description, recommended: b.recommended, features: Array.isArray(b.features) ? b.features : undefined }
      Object.keys(update).forEach(k => update[k] === undefined && delete update[k])
      await db.collection('packages').updateOne({ id }, { $set: update })
      const doc = await db.collection('packages').findOne({ id })
      return handleCORS(NextResponse.json(clean(doc)))
    }
    if (route.startsWith('/admin/packages/') && method === 'DELETE') {
      if (!isAdmin) return requireAdmin()
      await db.collection('packages').deleteOne({ id: path[2] })
      return handleCORS(NextResponse.json({ success: true }))
    }

    // Diagnostic consultations (ADMIN ONLY — sensitive medical data)
    if (route === '/admin/diagnostic-consultations' && method === 'GET') {
      if (!isAdmin) return requireAdmin()
      const items = await db.collection('diagnostic_consultations').find({}).sort({ createdAt: -1 }).limit(500).toArray()
      return handleCORS(NextResponse.json(items.map(clean)))
    }
    if (route.startsWith('/admin/diagnostic-consultations/') && method === 'PUT') {
      if (!isAdmin) return requireAdmin()
      const id = path[2]
      const b = await readBody(request)
      await db.collection('diagnostic_consultations').updateOne({ id }, { $set: { status: b.status } })
      const doc = await db.collection('diagnostic_consultations').findOne({ id })
      return handleCORS(NextResponse.json(clean(doc)))
    }

    // Secure file stream (ADMIN ONLY — acts as the gated "signed URL")
    if (route.startsWith('/admin/secure-file/') && method === 'GET') {
      if (!isAdmin) return requireAdmin()
      const fileId = path[2]
      const meta = await db.collection('secure_files').findOne({ id: fileId })
      if (!meta) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      let data
      try { data = await fs.readFile(meta.path) } catch { return handleCORS(NextResponse.json({ error: 'File missing' }, { status: 404 })) }
      const res = new NextResponse(data, { status: 200 })
      res.headers.set('Content-Type', meta.contentType)
      res.headers.set('Content-Disposition', `inline; filename="${meta.originalName}"`)
      res.headers.set('Cache-Control', 'private, no-store')
      return handleCORS(res)
    }

    // Users list + deactivate
    if (route === '/admin/users' && method === 'GET') {
      if (!isAdmin) return requireAdmin()
      const users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray()
      return handleCORS(NextResponse.json(users.map(clean)))
    }
    if (route.startsWith('/admin/users/') && method === 'PUT') {
      if (!isAdmin) return requireAdmin()
      const id = path[2]
      const b = await readBody(request)
      await db.collection('users').updateOne({ id }, { $set: { active: b.active } })
      const doc = await db.collection('users').findOne({ id })
      return handleCORS(NextResponse.json(clean(doc)))
    }

    // Consultations list (admin)
    if (route === '/admin/consultations' && method === 'GET') {
      if (!isAdmin) return requireAdmin()
      const items = await db.collection('consultations').find({}).sort({ createdAt: -1 }).limit(500).toArray()
      return handleCORS(NextResponse.json(items.map(clean)))
    }

    // Analytics overview (admin)
    if (route === '/admin/analytics/overview' && method === 'GET') {
      if (!isAdmin) return requireAdmin()
      const now = new Date()
      const days = 30
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const events = await db.collection('analytics_events').find({ timestamp: { $gte: start } }).toArray()

      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const pageViews = events.filter(e => e.event_type === 'page_view')
      const sessionsIn = (from) => new Set(pageViews.filter(e => e.timestamp >= from && e.session_id).map(e => e.session_id)).size

      const visitorsToday = sessionsIn(startOfToday)
      const visitorsWeek = sessionsIn(startOfWeek)
      const visitorsMonth = sessionsIn(startOfMonth)

      const totalUsers = await db.collection('users').countDocuments({ role: 'user' })
      const inquiries = events.filter(e => e.event_type === 'inquiry' || e.event_type === 'cta_click').length

      // visitors over time (last 7 days) unique sessions per day
      const byDay = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const key = d.toISOString().slice(0, 10)
        byDay[key] = new Set()
      }
      pageViews.forEach(e => {
        const key = new Date(e.timestamp).toISOString().slice(0, 10)
        if (byDay[key] && e.session_id) byDay[key].add(e.session_id)
      })
      const visitorsSeries = Object.keys(byDay).map(k => ({ date: k.slice(5), visitors: byDay[k].size }))

      // most viewed products (product_view + inquiry) grouped by name
      const prodCounts = {}
      events.filter(e => e.event_type === 'product_view' || e.event_type === 'inquiry').forEach(e => {
        const name = e.metadata?.name
        if (name) prodCounts[name] = (prodCounts[name] || 0) + 1
      })
      const topProducts = Object.entries(prodCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6)

      // tier interest (tab switches)
      const tierCounts = {}
      events.filter(e => e.event_type === 'tab_switch').forEach(e => {
        const t = e.metadata?.tier
        if (t) tierCounts[t] = (tierCounts[t] || 0) + 1
      })
      const tierInterest = Object.entries(tierCounts).map(([tier, count]) => ({ tier, count }))

      // funnel
      const funnel = {
        visits: pageViews.length,
        productViews: events.filter(e => e.event_type === 'product_view').length,
        inquiries,
      }

      return handleCORS(NextResponse.json({
        stats: { visitorsToday, visitorsWeek, visitorsMonth, totalUsers, inquiries },
        visitorsSeries,
        topProducts,
        tierInterest,
        funnel,
      }))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
