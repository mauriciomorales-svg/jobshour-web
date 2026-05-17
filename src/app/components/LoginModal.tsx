'use client'
import { feedbackCopy, surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'
import LegalSupportLinks from './LegalSupportLinks'

import { useState, useEffect } from 'react'
import { isCapacitor, openExternalBrowser } from '@/lib/capacitor'
import { apiUrl, JSON_REQUEST_HEADERS } from '@/lib/api'

type RecoverStep = 'email' | 'code' | 'password' | 'done'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: any, token: string) => void
  onSwitchToRegister: () => void
  onForgotPassword: () => void
}

export default function LoginModal({ isOpen, onClose, onSuccess, onSwitchToRegister }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recoverStep, setRecoverStep] = useState<RecoverStep | null>(null)
  const [recoverEmail, setRecoverEmail] = useState('')
  const [recoverCode, setRecoverCode] = useState('')
  const [recoverPassword, setRecoverPassword] = useState('')
  const [recoverMessage, setRecoverMessage] = useState<string | null>(null)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('saved_email')
      if (savedEmail) {
        setEmail(savedEmail)
        setRememberMe(true)
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setRecoverStep(null)
      setRecoverCode('')
      setRecoverPassword('')
      setRecoverMessage(null)
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: JSON_REQUEST_HEADERS,
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Credenciales incorrectas')
        setLoading(false)
        return
      }

      if (rememberMe) {
        localStorage.setItem('saved_email', email)
      } else {
        localStorage.removeItem('saved_email')
      }

      onSuccess(data.user, data.token)
      onClose()
    } catch {
      setError(feedbackCopy.networkErrorRetry)
      setLoading(false)
    }
  }

  const startRecover = () => {
    setRecoverEmail((email || '').trim())
    setRecoverStep('email')
    setRecoverMessage(null)
    setError(null)
  }

  const sendRecoverCode = async () => {
    const target = recoverEmail.trim()
    if (!target) {
      setRecoverMessage('Ingresá tu correo.')
      return
    }
    setRecovering(true)
    setRecoverMessage(null)
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: JSON_REQUEST_HEADERS,
        body: JSON.stringify({ email: target }),
      })
      const d = await r.json().catch(() => ({}))
      setRecoverMessage(d.message || 'Si el correo existe, te enviamos un código.')
      setRecoverStep('code')
    } catch {
      setRecoverMessage(feedbackCopy.networkError)
    } finally {
      setRecovering(false)
    }
  }

  const submitNewPassword = async () => {
    const code = recoverCode.trim()
    if (code.length < 4) {
      setRecoverMessage('Ingresá el código de 6 dígitos.')
      return
    }
    if (!recoverPassword || recoverPassword.length < 8) {
      setRecoverMessage('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setRecovering(true)
    setRecoverMessage(null)
    try {
      const rr = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: JSON_REQUEST_HEADERS,
        body: JSON.stringify({
          email: recoverEmail.trim(),
          code,
          password: recoverPassword,
        }),
      })
      const rd = await rr.json().catch(() => ({}))
      if (!rr.ok) {
        setRecoverMessage(rd.message || 'No se pudo restablecer la contraseña.')
        return
      }
      setRecoverMessage(rd.message || 'Contraseña actualizada. Ya podés iniciar sesión.')
      setEmail(recoverEmail.trim())
      setPassword('')
      setRecoverStep('done')
    } catch {
      setRecoverMessage(feedbackCopy.networkError)
    } finally {
      setRecovering(false)
    }
  }

  const handleOAuth = async (e: React.MouseEvent, provider: 'google') => {
    e.preventDefault()
    e.stopPropagation()
    const authUrl = apiUrl(`/api/auth/${provider}?mobile=true`)
    await openExternalBrowser(authUrl)
  }

  useEffect(() => {
    if (!isCapacitor()) return

    const handleDeepLink = (url: string) => {
      try {
        const urlObj = new URL(url)
        const token = urlObj.searchParams.get('token')
        const user = urlObj.searchParams.get('user')
        const oauthError = urlObj.searchParams.get('error')

        if (oauthError) {
          setError(feedbackCopy.oauthGoogleFailed)
          return
        }

        if (token && user) {
          const userData = JSON.parse(decodeURIComponent(user))
          onSuccess(userData, token)
          onClose()
        }
      } catch (e) {
        console.error('Error handling deep link:', e)
      }
    }

    let removeListener: () => void = () => {}
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', (data: { url: string }) => {
        handleDeepLink(data.url)
      }).then((listener) => {
        removeListener = listener.remove
      })
    })

    return () => removeListener()
  }, [onSuccess, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto py-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl w-[90%] max-w-md mx-4 overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className={uiTone.authHeader}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
          <button
            type="button"
            onClick={onClose}
            aria-label={surfaceCopy.close}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition z-10"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-white text-2xl font-black text-center">
              {recoverStep ? 'Recuperar contraseña' : surfaceCopy.loginWelcome}
            </h3>
            <p className="text-white/80 text-sm text-center mt-1">
              {recoverStep ? 'Te guiamos paso a paso' : surfaceCopy.loginContinueSubtitle}
            </p>
          </div>
        </div>

        <div className="p-6">
          {error && !recoverStep && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
              <p className="text-red-400 text-sm font-semibold">{error}</p>
            </div>
          )}

          {recoverMessage && (
            <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3 mb-4">
              <p className="text-teal-300 text-sm">{recoverMessage}</p>
            </div>
          )}

          {recoverStep ? (
            <div className="space-y-4">
              {recoverStep === 'email' && (
                <>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Correo</label>
                  <input
                    type="email"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 text-white rounded-xl outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    disabled={recovering}
                    onClick={sendRecoverCode}
                    className={uiTone.ctaFormSaveWide}
                  >
                    {recovering ? 'Enviando…' : 'Enviar código'}
                  </button>
                </>
              )}

              {recoverStep === 'code' && (
                <>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Código (6 dígitos)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={recoverCode}
                    onChange={(e) => setRecoverCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 text-white rounded-xl outline-none focus:border-amber-500 tracking-widest text-center text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setRecoverStep('password')}
                    disabled={recoverCode.trim().length < 4}
                    className={uiTone.ctaFormSaveWide}
                  >
                    Siguiente
                  </button>
                  <button
                    type="button"
                    onClick={sendRecoverCode}
                    disabled={recovering}
                    className="w-full text-sm text-amber-400 font-semibold"
                  >
                    Reenviar código
                  </button>
                </>
              )}

              {recoverStep === 'password' && (
                <>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Nueva contraseña</label>
                  <input
                    type="password"
                    value={recoverPassword}
                    onChange={(e) => setRecoverPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 text-white rounded-xl outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    disabled={recovering}
                    onClick={submitNewPassword}
                    className={uiTone.ctaFormSaveWide}
                  >
                    {recovering ? 'Guardando…' : 'Guardar contraseña'}
                  </button>
                </>
              )}

              {recoverStep === 'done' && (
                <button
                  type="button"
                  onClick={() => setRecoverStep(null)}
                  className={uiTone.ctaFormSaveWide}
                >
                  Volver a iniciar sesión
                </button>
              )}

              {recoverStep !== 'done' && (
                <button
                  type="button"
                  onClick={() => setRecoverStep(null)}
                  className="w-full text-sm text-slate-400 hover:text-white"
                >
                  ← Volver al login
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 text-white rounded-xl outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-11 bg-slate-800 border-2 border-slate-700 text-white rounded-xl outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-slate-600 bg-slate-800"
                />
                <label htmlFor="remember" className="text-sm text-slate-400">
                  {surfaceCopy.rememberMe}
                </label>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={startRecover}
                  className="text-sm text-amber-400 hover:text-amber-300 font-semibold"
                >
                  {surfaceCopy.forgotPassword}
                </button>
              </div>

              <button type="submit" disabled={loading} className={uiTone.ctaFormSaveWide}>
                {loading ? surfaceCopy.loginSigningIn : surfaceCopy.loginSubmit}
              </button>
            </form>
          )}

          {!recoverStep && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-900 px-3 text-slate-500 font-semibold">{surfaceCopy.oauthOrContinue}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => handleOAuth(e, 'google')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 font-semibold"
              >
                Google
              </button>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                  {surfaceCopy.registerPrompt}{' '}
                  <button type="button" onClick={onSwitchToRegister} className="text-amber-400 font-bold">
                    {surfaceCopy.registerHere}
                  </button>
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-700/80">
                <LegalSupportLinks variant="dark" className="text-center text-[11px]" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
