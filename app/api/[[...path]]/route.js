import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
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
  // Premium
  { id: uuidv4(), tier: 'premium', tag: 'The Universal Essentials', name: 'Luminous Cellular Dew', description: 'A weightless hydrating essence that revives dull skin with a dewy, lit-from-within radiance.', price: 140, imageUrl: 'https://images.pexels.com/photos/29642374/pexels-photo-29642374.jpeg' },
  { id: uuidv4(), tier: 'premium', tag: 'The Universal Essentials', name: 'Velvet Barrier Cream', description: 'A rich, restorative moisturiser that fortifies the skin barrier and locks in lasting comfort.', price: 195, imageUrl: 'https://images.pexels.com/photos/29240451/pexels-photo-29240451.jpeg' },
  { id: uuidv4(), tier: 'premium', tag: 'The Universal Essentials', name: 'Pure Nectar Essence', description: 'A silky botanical essence that preps and balances the complexion for deeper absorption.', price: 165, imageUrl: 'https://images.unsplash.com/photo-1613803745799-ba6c10aace85' },
  // Ultra Premium
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

async function seedIfEmpty(db) {
  const count = await db.collection('products').countDocuments()
  if (count === 0) {
    await db.collection('products').insertMany(PRODUCTS.map(p => ({ ...p })))
    await db.collection('team').insertMany(TEAM.map(t => ({ ...t })))
    await db.collection('faqs').insertMany(FAQS.map(f => ({ ...f })))
  }
}

async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()
    await seedIfEmpty(db)

    if ((route === '/' || route === '/root') && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'DERMATICS API' }))
    }

    // GET /api/products  or  /api/products?tier=premium
    if (route === '/products' && method === 'GET') {
      const { searchParams } = new URL(request.url)
      const tier = searchParams.get('tier')
      const query = tier ? { tier } : {}
      const products = await db.collection('products').find(query).toArray()
      const cleaned = products.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // GET /api/team
    if (route === '/team' && method === 'GET') {
      const team = await db.collection('team').find({}).sort({ order: 1 }).toArray()
      const cleaned = team.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // GET /api/faqs
    if (route === '/faqs' && method === 'GET') {
      const faqs = await db.collection('faqs').find({}).sort({ order: 1 }).toArray()
      const cleaned = faqs.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
    }

    // POST /api/consultation
    if (route === '/consultation' && method === 'POST') {
      const body = await request.json()
      if (!body.name || !body.phone) {
        return handleCORS(NextResponse.json({ error: 'name and phone are required' }, { status: 400 }))
      }
      const submission = {
        id: uuidv4(),
        name: body.name,
        phone: body.phone,
        email: body.email || '',
        tier: body.tier || '',
        message: body.message || '',
        createdAt: new Date(),
      }
      await db.collection('consultations').insertOne(submission)
      const { _id, ...clean } = submission
      return handleCORS(NextResponse.json({ success: true, submission: clean }))
    }

    // GET /api/consultation (admin view)
    if (route === '/consultation' && method === 'GET') {
      const items = await db.collection('consultations').find({}).sort({ createdAt: -1 }).limit(500).toArray()
      const cleaned = items.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleaned))
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
