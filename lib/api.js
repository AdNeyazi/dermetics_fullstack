function resolveApiBase() {
  const raw = process.env.NEXT_PUBLIC_API_URL
  if (raw === undefined || raw === null) return 'http://localhost:3001'
  const trimmed = String(raw).trim()
  if (trimmed === '' || trimmed === 'same-origin') return ''
  return trimmed.replace(/\/$/, '')
}

export const API_BASE = resolveApiBase()

/** @param {string} path - e.g. `/api/products` */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}

export async function apiFetch(path, options = {}) {
  const { headers, ...rest } = options
  return fetch(apiUrl(path), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    ...rest,
  })
}
