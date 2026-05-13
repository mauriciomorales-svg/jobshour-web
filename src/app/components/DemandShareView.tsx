'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, Share2, MapPin } from 'lucide-react'
import { getPublicApiBase } from '@/lib/api'
import { trackEvent } from '@/lib/analytics'
import { openWhatsAppWithText, publicDemandUrl, whatsAppDemandShareText, withShareUtm } from '@/lib/marketingShare'

type DemandData = {
  id: number
  client: { name: string; avatar: string | null }
  category: { name: string; color: string }
  description: string
  offered_price: number
  urgency?: string
  pickup_address?: string | null
}

function formatCLP(n: number) {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

export default function DemandShareView({ demandId }: { demandId: number }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DemandData | null>(null)
  const [error, setError] = useState('')

  const publicUrl = useMemo(() => publicDemandUrl(demandId), [demandId])

  useEffect(() => {
    if (!demandId) return
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`${getPublicApiBase()}/api/v1/demand/${demandId}`, {
          headers: { Accept: 'application/json' },
        })
        const json = (await res.json().catch(() => null)) as {
          status?: string
          message?: string
          data?: DemandData
        } | null
        if (!active) return
        if (!res.ok || json?.status !== 'success' || !json.data) {
          setData(null)
          setError(typeof json?.message === 'string' ? json.message : 'Esta demanda ya no está disponible')
          trackEvent('demand_view_shared', { demandId, found: false })
          return
        }
        setData(json.data)
        setError('')
        trackEvent('demand_view_shared', { demandId, found: true })
      } catch {
        if (active) {
          setData(null)
          setError('No se pudo cargar la demanda')
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [demandId])

  const price = data ? formatCLP(Number(data.offered_price) || 0) : ''
  const summaryLine = data?.description?.trim() || (data ? `Solicitud en ${data.category?.name || 'JobsHours'}` : '')
  const mapHref = `/?rid=${demandId}`

  const handleNativeShare = async () => {
    if (!data) return
    const url = withShareUtm(publicUrl, 'demand_share')
    trackEvent('demand_share_click', { demandId, channel: 'native' })
    const text = `${data.category?.name || 'Demanda'} · ${price}\n${summaryLine.slice(0, 160)}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Demanda en JobsHours', text, url })
      } catch {
        /* cancelado */
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      alert('Link copiado para compartir')
    } catch {
      /* */
    }
  }

  const handleWhatsApp = () => {
    if (!data) return
    trackEvent('demand_share_click', { demandId, channel: 'whatsapp' })
    openWhatsAppWithText(
      whatsAppDemandShareText({
        categoryLabel: data.category?.name || 'Demanda',
        summary: summaryLine.slice(0, 220),
        priceFormatted: price,
        demandUrl: publicUrl,
      }),
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto w-full max-w-xl px-4 py-5 space-y-4">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-300 text-sm">
          <ArrowLeft className="w-4 h-4" /> Ir al mapa
        </Link>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 text-center text-slate-400">
            Cargando demanda…
          </div>
        ) : error || !data ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-6 text-center space-y-3">
            <p className="text-4xl">📍</p>
            <h1 className="text-lg font-black text-white">Demanda no disponible</h1>
            <p className="text-sm text-slate-300">{error || 'Puede haber sido tomada o expiró.'}</p>
            <Link
              href="/"
              className="inline-block w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-2.5 rounded-xl transition"
            >
              Explorar JobsHours
            </Link>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-orange-500/35 bg-gradient-to-br from-orange-500/15 to-slate-900/90 p-4 space-y-2 shadow-xl shadow-orange-900/20">
              <p className="text-[11px] font-bold tracking-wide text-orange-200 uppercase">Demanda en JobsHours</p>
              <div className="flex items-start gap-3">
                {data.client.avatar ? (
                  <img
                    src={data.client.avatar}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border-2 border-white/30 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-lg font-black border border-white/25 shrink-0">
                    {data.client.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">{data.client.name}</p>
                  <span
                    className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: data.category?.color || '#f97316' }}
                  >
                    {data.category?.name || 'Servicio'}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-black text-orange-300">{price}</p>
                  <p className="text-[10px] text-white/50">oferta</p>
                </div>
              </div>
              {(data.urgency === 'high' || data.urgency === 'urgent') && (
                <p className="text-xs font-black text-red-300">🔥 Urgente</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 space-y-3">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Detalle</h2>
              <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
                {data.description?.trim() || 'Sin descripción adicional.'}
              </p>
              {data.pickup_address && (
                <p className="text-xs text-slate-400 flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 text-orange-300 mt-0.5" />
                  {data.pickup_address}
                </p>
              )}
            </section>

            <Link
              href={mapHref}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-3 text-sm font-black hover:bg-orange-400 transition"
            >
              Abrir en la app (mapa y feed)
            </Link>

            <section className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleNativeShare()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-3 py-2.5 text-sm font-bold hover:bg-slate-600 transition"
              >
                <Share2 className="w-4 h-4" /> Compartir
              </button>
              <button
                type="button"
                onClick={handleWhatsApp}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold hover:bg-emerald-500 transition"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
            </section>

            <p className="text-[11px] text-slate-500 text-center leading-snug">
              Las coordenadas exactas se muestran a socios con sesión iniciada. Este enlace sirve para difundir la
              oportunidad.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
