'use client'

import { useState } from 'react'
import CategoryPicker from './CategoryPicker'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: any, token: string) => void
  onSwitchToLogin: () => void
}

export default function RegisterModal({ isOpen, onClose, onSuccess, onSwitchToLogin }: Props) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    type: 'employer' as 'worker' | 'employer',
    category_id: 1,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])

  useState(() => {
    if (isOpen && categories.length === 0) {
      fetch('/api/v1/categories')
        .then(r => r.json())
        .then(data => setCategories(data.data || []))
        .catch(() => {})
    }
  })

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          type: formData.type,
          category_id: formData.category_id,
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Error al registrarse')
        setLoading(false)
        return
      }

      onSuccess(data.user, data.token)
      onClose()
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.')
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step === 1) {
      if (!formData.name.trim()) {
        setError('El nombre es obligatorio')
        return
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setError('Email inválido')
        return
      }
    }
    if (step === 2) {
      if (!formData.phone.trim()) {
        setError('El teléfono es obligatorio')
        return
      }
      if (formData.password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden')
        return
      }
    }
    setError(null)
    setStep(step + 1)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-[90%] max-w-md mx-4 overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 p-6 relative overflow-hidden">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h3 className="text-white text-2xl font-black text-center">Crear Cuenta</h3>
            <p className="text-white/80 text-sm text-center mt-1">Paso {step} de 3</p>
          </div>
          
          {/* Progress bar */}
          <div className="relative z-10 mt-4">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 animate-slide-up">
              <p className="text-red-600 text-sm font-semibold flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            </div>
          )}

          {/* Step 1: Datos básicos */}
          {step === 1 && (
            <div className="space-y-4 animate-slide-up">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Juan Pérez"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-green-500 focus:bg-green-50/30"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-green-500 focus:bg-green-50/30"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-900 text-xs font-semibold mb-1">💡 Tip</p>
                <p className="text-blue-700 text-xs">
                  Usa un email válido. Te enviaremos un código de verificación.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Contraseña y teléfono */}
          {step === 2 && (
            <div className="space-y-4 animate-slide-up">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+56912345678"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-green-500 focus:bg-green-50/30"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    className="w-full px-4 py-3 pr-11 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-green-500 focus:bg-green-50/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Confirmar contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repite tu contraseña"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none transition-all focus:border-green-500 focus:bg-green-50/30"
                />
              </div>
            </div>
          )}

          {/* Step 3: Tipo de cuenta */}
          {step === 3 && (
            <div className="space-y-4 animate-slide-up">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                  ¿Cómo usarás JobsHours?
                </label>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'employer' })}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      formData.type === 'employer'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.type === 'employer' ? 'border-green-500' : 'border-slate-300'
                      }`}>
                        {formData.type === 'employer' && (
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">Buscar trabajadores</p>
                        <p className="text-xs text-slate-500 mt-0.5">Necesito contratar servicios</p>
                      </div>
                      <span className="text-2xl">🔍</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'worker' })}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      formData.type === 'worker'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.type === 'worker' ? 'border-green-500' : 'border-slate-300'
                      }`}>
                        {formData.type === 'worker' && (
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">Ofrecer mis servicios</p>
                        <p className="text-xs text-slate-500 mt-0.5">Soy trabajador independiente</p>
                      </div>
                      <span className="text-2xl">🛠️</span>
                    </div>
                  </button>
                </div>
              </div>

              {formData.type === 'worker' && (
                <div className="animate-slide-up">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Categoría principal <span className="text-red-500">*</span>
                  </label>
                  <CategoryPicker
                    categories={categories}
                    selectedId={formData.category_id}
                    onSelect={(id) => setFormData({ ...formData, category_id: id })}
                    placeholder="Buscar tu oficio..."
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Podrás agregar más categorías después
                  </p>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-green-900 text-xs font-semibold mb-1">✅ Casi listo</p>
                <p className="text-green-700 text-xs">
                  {formData.type === 'worker' 
                    ? 'Después podrás completar tu perfil, agregar foto y configurar tu ubicación.'
                    : 'Podrás empezar a buscar trabajadores inmediatamente.'}
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
              >
                Atrás
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={nextStep}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition shadow-lg hover:shadow-xl"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creando cuenta...</span>
                  </div>
                ) : (
                  'Crear Cuenta'
                )}
              </button>
            )}
          </div>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              ¿Ya tienes cuenta?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-green-600 hover:text-green-700 font-bold"
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
