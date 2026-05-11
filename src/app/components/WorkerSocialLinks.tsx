'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'

export interface SocialLink {
  platform: string
  label: string
  url: string
}

const PLATFORMS: { id: string; name: string; placeholder: string; icon: string }[] = [
  { id: 'tiktok',    name: 'TikTok',     placeholder: 'https://tiktok.com/@tu_usuario',    icon: '📱' },
  { id: 'youtube',   name: 'YouTube',    placeholder: 'https://youtube.com/@tu_canal',     icon: '▶️' },
  { id: 'instagram', name: 'Instagram',  placeholder: 'https://instagram.com/tu_usuario',  icon: '📸' },
  { id: 'linkedin',  name: 'LinkedIn',   placeholder: 'https://linkedin.com/in/tu_perfil', icon: '💼' },
  { id: 'portfolio', name: 'Portfolio',  placeholder: 'https://mi-sitio.com',              icon: '🌐' },
  { id: 'otro',      name: 'Otro link',  placeholder: 'https://...',                       icon: '🔗' },
]

function getPlatformMeta(platform: string) {
  return PLATFORMS.find(p => p.id === platform) ?? PLATFORMS[5]
}

interface Props {
  initialLinks?: SocialLink[]
  /** Si true muestra solo los links (modo lectura para perfil público) */
  readonly?: boolean
}

export default function WorkerSocialLinks({ initialLinks = [], readonly = false }: Props) {
  const [links, setLinks] = useState<SocialLink[]>(initialLinks)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newLink, setNewLink] = useState<SocialLink>({ platform: 'tiktok', label: '', url: '' })

  const save = async (updated: SocialLink[]) => {
    setSaving(true)
    setError(null)
    try {
      const res = await apiFetch('/api/v1/worker/social-links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: updated }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Error al guardar')
      setLinks(data.links ?? updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  const addLink = () => {
    if (!newLink.url.trim()) return
    const updated = [...links, { ...newLink }]
    setLinks(updated)
    setAdding(false)
    setNewLink({ platform: 'tiktok', label: '', url: '' })
    save(updated)
  }

  const removeLink = (idx: number) => {
    const updated = links.filter((_, i) => i !== idx)
    setLinks(updated)
    save(updated)
  }

  /* ── Modo lectura (perfil público) ─────────────────────────────── */
  if (readonly) {
    if (links.length === 0) return null
    return (
      <div className="space-y-2">
        {links.map((link, i) => {
          const meta = getPlatformMeta(link.platform)
          return (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition group"
            >
              <span className="text-lg">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold group-hover:text-teal-300 transition truncate">
                  {link.label || meta.name}
                </p>
                <p className="text-white/40 text-xs truncate">{link.url}</p>
              </div>
              <svg className="w-4 h-4 text-white/30 group-hover:text-teal-400 transition flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )
        })}
      </div>
    )
  }

  /* ── Modo edición ───────────────────────────────────────────────── */
  return (
    <div className="space-y-3">
      {/* Links existentes */}
      {links.map((link, i) => {
        const meta = getPlatformMeta(link.platform)
        return (
          <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-800/60 border border-white/10 rounded-xl">
            <span className="text-lg flex-shrink-0">{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{link.label || meta.name}</p>
              <p className="text-white/40 text-xs truncate">{link.url}</p>
            </div>
            <button
              onClick={() => removeLink(i)}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 transition text-xs font-bold"
              title="Eliminar"
            >
              ✕
            </button>
          </div>
        )
      })}

      {/* Formulario para agregar */}
      {adding ? (
        <div className="p-4 bg-slate-800/80 border border-white/15 rounded-xl space-y-3">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Nuevo link</p>

          {/* Selector de plataforma */}
          <div className="grid grid-cols-3 gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setNewLink(n => ({ ...n, platform: p.id }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition
                  ${newLink.platform === p.id
                    ? 'bg-teal-500/30 border border-teal-400/60 text-teal-200'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                  }`}
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>

          {/* Label opcional */}
          <input
            type="text"
            placeholder="Descripción (ej: &quot;Trabajos de pintura&quot;) — opcional"
            value={newLink.label}
            onChange={e => setNewLink(n => ({ ...n, label: e.target.value }))}
            maxLength={60}
            className="w-full px-3 py-2.5 bg-slate-700/60 border border-white/15 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-teal-400/60"
          />

          {/* URL */}
          <input
            type="url"
            placeholder={getPlatformMeta(newLink.platform).placeholder}
            value={newLink.url}
            onChange={e => setNewLink(n => ({ ...n, url: e.target.value }))}
            className="w-full px-3 py-2.5 bg-slate-700/60 border border-white/15 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-teal-400/60"
          />

          <div className="flex gap-2">
            <button
              onClick={addLink}
              disabled={!newLink.url.trim() || saving}
              className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm font-black rounded-lg transition"
            >
              {saving ? 'Guardando…' : 'Agregar link'}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white/70 text-sm rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        links.length < 8 && (
          <button
            onClick={() => setAdding(true)}
            className="w-full py-3 border border-dashed border-white/20 hover:border-teal-400/50 text-white/50 hover:text-teal-300 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
          >
            <span className="text-base">+</span>
            Agregar link (TikTok, YouTube, Instagram…)
          </button>
        )
      )}

      {error && (
        <p className="text-red-400 text-xs px-1">{error}</p>
      )}
      {saved && (
        <p className="text-teal-400 text-xs px-1 font-semibold">Links guardados correctamente</p>
      )}
    </div>
  )
}
