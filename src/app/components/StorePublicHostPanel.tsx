'use client'

import { useCallback, useState } from 'react'
import { Check, ChevronDown, Copy, Link2, Loader2, ShieldCheck } from 'lucide-react'
import { displayPublicUrl } from '@/lib/marketingShare'

type StoreHostData = {
  public_store_host: string | null
  verified: boolean
  verify_token: string | null
  txt_fqdn: string | null
}

type Props = {
  /** Link principal incluido (jobshours.com/tienda/...) */
  storeUrl: string
}

export default function StorePublicHostPanel({ storeUrl }: Props) {
  const [copied, setCopied] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [hostInput, setHostInput] = useState('')
  const [data, setData] = useState<StoreHostData | null>(null)
  const [advancedLoaded, setAdvancedLoaded] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const r = await fetch(`${window.location.origin}/api/worker/store-host`, {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const j = await r.json().catch(() => null)
      if (!r.ok) {
        setError(
          typeof j?.message === 'string' && !j.message.includes('could not be found')
            ? j.message
            : 'Dominio propio: pedilo a soporte JobsHours y te lo configuramos.'
        )
        setData(null)
        return
      }
      const d = j?.data as StoreHostData
      setData(d)
      setHostInput(d?.public_store_host || '')
      if (d?.verified && d.public_store_host) {
        setAdvancedOpen(true)
      }
    } catch {
      setError('No pudimos cargar dominio propio. Probá más tarde o escribinos a soporte.')
      setData(null)
    } finally {
      setLoading(false)
      setAdvancedLoaded(true)
    }
  }, [])

  const openAdvanced = () => {
    const next = !advancedOpen
    setAdvancedOpen(next)
    if (next && !advancedLoaded) void load()
  }

  const saveHost = async () => {
    const host = hostInput.trim().toLowerCase().replace(/\.$/, '')
    if (!host) {
      setError('Escribí tu dominio completo, por ejemplo: tienda.mimarca.cl')
      return
    }
    if (!host.includes('.')) {
      setError('Falta la parte final del dominio (.cl, .com, etc.). Ejemplo: feria.mitienda.cl')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const r = await fetch(`${window.location.origin}/api/worker/store-host`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ host }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok) {
        setError(j?.message || j?.errors?.host?.[0] || 'No se pudo guardar')
        return
      }
      const d = j?.data
      setData({
        public_store_host: d?.public_store_host ?? host,
        verified: false,
        verify_token: d?.verify_token ?? null,
        txt_fqdn: d?.txt_fqdn ?? `_jobshours-challenge.${host}`,
      })
      setMessage('Guardado. Si no manejás DNS vos mismo, pedí ayuda a soporte JobsHours.')
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const verify = async () => {
    setVerifying(true)
    setError('')
    setMessage('')
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const r = await fetch(`${window.location.origin}/api/worker/store-host/verify`, {
        method: 'POST',
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const j = await r.json().catch(() => null)
      if (!r.ok) {
        setError(
          j?.message ||
            'Aún no detectamos la configuración. Si no sabés de DNS, contactá a soporte JobsHours.'
        )
        return
      }
      const d = j?.data
      setData({
        public_store_host: d?.public_store_host ?? data?.public_store_host ?? null,
        verified: true,
        verify_token: null,
        txt_fqdn: null,
      })
      setMessage('¡Listo! Tu dominio propio quedó activo.')
    } catch {
      setError('Error de conexión')
    } finally {
      setVerifying(false)
    }
  }

  const verified = data?.verified
  const pending = data?.public_store_host && !verified
  const token = data?.verify_token
  const txtFqdn = data?.txt_fqdn
  const customUrl =
    verified && data?.public_store_host
      ? `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//${data.public_store_host}/`
      : null

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 max-w-2xl space-y-3">
      <div>
        <p className="text-sm font-black text-emerald-900">Link de tu tienda</p>
        <p className="text-[11px] text-emerald-800/90 mt-1 leading-snug">
          Este es el enlace que compartís por WhatsApp o redes. <strong>No necesitás comprar dominio</strong> ni
          configurar nada técnico.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <p className="flex-1 min-w-0 text-xs font-mono bg-white border border-emerald-200 rounded-lg px-3 py-2.5 text-gray-800 truncate">
          {displayPublicUrl(storeUrl)}
        </p>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado' : 'Copiar link'}
        </button>
      </div>

      {customUrl && (
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 bg-white border border-emerald-200 rounded-lg px-3 py-2">
          <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden />
          También con tu dominio: {displayPublicUrl(customUrl)}
        </div>
      )}

      <button
        type="button"
        onClick={openAdvanced}
        className="w-full flex items-center justify-between gap-2 text-left text-xs font-bold text-gray-600 hover:text-gray-800 py-1"
      >
        <span className="inline-flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" aria-hidden />
          ¿Ya tenés tu propio dominio? (opcional)
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition ${advancedOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {advancedOpen && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-3 text-sm">
          <p className="text-[11px] text-gray-600 leading-snug">
            Solo si <strong>ya compraste</strong> un dominio (ej. <em>mitienda.cl</em>) y querés que abra tu catálogo
            ahí. Si no sabés de DNS, ignorá esto o pedinos ayuda — te armamos la tienda sin dominio propio.
          </p>

          {loading && (
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Cargando…
            </div>
          )}

          {!loading && (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={hostInput}
                  onChange={e => setHostInput(e.target.value)}
                  placeholder="ej. tienda.mimarca.cl"
                  disabled={Boolean(verified)}
                  className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => void saveHost()}
                  disabled={saving || verified}
                  className="shrink-0 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>

              {pending && token && txtFqdn && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs space-y-2 text-amber-950">
                  <p className="font-bold">Paso para técnicos o tu proveedor web</p>
                  <p className="leading-snug">
                    Pediles que agreguen un registro <strong>TXT</strong> con estos datos (o contactá a soporte
                    JobsHours y lo hacemos por vos):
                  </p>
                  <p>
                    <span className="font-semibold">Nombre:</span>{' '}
                    <code className="break-all bg-white px-1 rounded">{txtFqdn}</code>
                  </p>
                  <p>
                    <span className="font-semibold">Valor:</span>{' '}
                    <code className="break-all bg-white px-1 rounded select-all">{token}</code>
                  </p>
                  <button
                    type="button"
                    onClick={() => void verify()}
                    disabled={verifying}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs"
                  >
                    {verifying ? 'Comprobando…' : 'Ya lo configuraron — comprobar'}
                  </button>
                </div>
              )}

              {error && <p className="text-xs text-red-700 font-medium">{error}</p>}
              {message && !error && <p className="text-xs text-emerald-800 font-medium">{message}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
