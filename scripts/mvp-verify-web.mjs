/**
 * Comprueba variables públicas mínimas para build/deploy MVP (Next.js).
 * Lee .env.local si existe (no commitear secretos); process.env tiene prioridad.
 * Uso: npm run mvp:verify
 * CI: exportar NEXT_PUBLIC_API_URL antes de ejecutar.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function parseDotEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[m[1]] = v
  }
  return out
}

function loadLocalEnv() {
  const p = path.join(root, '.env.local')
  if (!fs.existsSync(p)) return {}
  try {
    return parseDotEnv(fs.readFileSync(p, 'utf8'))
  } catch {
    return {}
  }
}

const fileEnv = loadLocalEnv()
const apiUrl = process.env.NEXT_PUBLIC_API_URL || fileEnv.NEXT_PUBLIC_API_URL || ''
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || fileEnv.NEXT_PUBLIC_SITE_URL || ''

let errors = 0
const warn = (m) => console.warn('mvp:verify (web) —', m)
const err = (m) => {
  console.error('mvp:verify (web) — ERROR:', m)
  errors++
}

console.log('mvp:verify (web) — comprobando NEXT_PUBLIC_* …')

if (!apiUrl.trim()) {
  err('NEXT_PUBLIC_API_URL vacío. Define en .env.local o en el entorno (CI).')
} else if (!/^https?:\/\//i.test(apiUrl.trim())) {
  err('NEXT_PUBLIC_API_URL debe empezar por http:// o https://')
} else {
  console.log('  NEXT_PUBLIC_API_URL:', apiUrl.trim())
}

if (siteUrl.trim() && !/^https?:\/\//i.test(siteUrl.trim())) {
  err('NEXT_PUBLIC_SITE_URL debe empezar por http:// o https://')
} else if (siteUrl.trim()) {
  console.log('  NEXT_PUBLIC_SITE_URL:', siteUrl.trim())
}

if (errors > 0) {
  console.error('\nmvp:verify (web): falló. Corrige .env.local o las variables del pipeline.')
  process.exit(1)
}

console.log('\nmvp:verify (web): OK.')
