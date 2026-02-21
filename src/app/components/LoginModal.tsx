'use client'

import { useState, useEffect } from 'react'
import { isCapacitor, openExternalBrowser, onAppResume } from '@/lib/capacitor'
import { apiUrl } from '@/lib/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: any, token: string) => void
  onSwitchToRegister: () => void
  onForgotPassword: () => void
}

export default function LoginModal({ isOpen, onClose, onSuccess, onSwitchToRegister, onForgotPassword }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar credenciales guardadas al abrir
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('saved_email')
      const savedPassword = localStorage.getItem('saved_password')
      if (savedEmail) {
        setEmail(savedEmail)
        setRememberMe(true)
      }
      if (savedPassword) {
        setPassword(savedPassword)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Credenciales incorrectas')
        setLoading(false)
        return
      }

      // Guardar credenciales si "Recordarme" está activo
      if (rememberMe) {
        localStorage.setItem('saved_email', email)
        localStorage.setItem('saved_password', password)
      } else {
        localStorage.removeItem('saved_email')
        localStorage.removeItem('saved_password')
      }

      onSuccess(data.user, data.token)
      onClose()
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.')
      setLoading(false)
    }
  }

  const handleOAuth = async (e: React.MouseEvent, provider: 'google' | 'facebook') => {
    e.preventDefault()
    e.stopPropagation()
    alert('handleOAuth ejecutado: ' + provider)
    const authUrl = `https://api.jobshour.dondemorales.cl/api/auth/${provider}?mobile=true`
    await openExternalBrowser(authUrl)
  }

  // Escuchar retorno de OAuth en Capacitor via deep link
  useEffect(() => {
    if (!isCapacitor()) return

    const handleDeepLink = (url: string) => {
      try {
        const urlObj = new URL(url)
        const token = urlObj.searchParams.get('token')
        const user = urlObj.searchParams.get('user')
        const error = urlObj.searchParams.get('error')

        if (error) {
          setError('Error al autenticar con Google')
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

    // Escuchar appUrlOpen (deep link jobshour://auth?token=...)
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

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto py-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl w-[90%] max-w-md mx-4 overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
          <button
            onClick={onClose}
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
            <h3 className="text-white text-2xl font-black text-center">Bienvenido</h3>
            <p className="text-white/80 text-sm text-center mt-1">Inicia sesión para continuar</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 animate-slide-up">
              <p className="text-red-400 text-sm font-semibold flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full px-4 py-3 pl-11 bg-slate-800 border-2 border-slate-700 text-white placeholder-slate-500 rounded-xl outline-none transition-all focus:border-blue-500"
                />
                <svg className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pl-11 pr-11 bg-slate-800 border-2 border-slate-700 text-white placeholder-slate-500 rounded-xl outline-none transition-all focus:border-blue-500"
                />
                <svg className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded border-slate-600 bg-slate-800 focus:ring-blue-500"
              />
              <label htmlFor="remember" className="text-sm text-slate-400">
                Recordarme
              </label>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-blue-400 hover:text-blue-300 font-semibold transition"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:from-blue-600 hover:to-indigo-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-3 text-slate-500 font-semibold">O continúa con</span>
            </div>
          </div>

          {/* OAuth */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={(e) => handleOAuth(e, 'google')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 font-semibold transition"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleOAuth(e, 'facebook')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-700 bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 font-semibold transition"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Facebook</span>
            </button>
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              ¿No tienes cuenta?{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-blue-400 hover:text-blue-300 font-bold transition"
              >
                Regístrate aquí
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
