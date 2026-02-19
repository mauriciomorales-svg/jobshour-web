'use client'

import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (companyData: CompanyData) => void
}

interface CompanyData {
  is_company: boolean
  company_rut: string
  company_razon_social: string
  company_giro: string
}

export default function CompanyRegistrationModal({ isOpen, onClose, onSuccess }: Props) {
  const [isCompany, setIsCompany] = useState(false)
  const [rut, setRut] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [giro, setGiro] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const formatRUT = (value: string) => {
    const cleaned = value.replace(/[^0-9kK]/g, '')
    if (cleaned.length <= 1) return cleaned

    const body = cleaned.slice(0, -1)
    const dv = cleaned.slice(-1).toUpperCase()
    
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `${formatted}-${dv}`
  }

  const validateRUT = (rut: string): boolean => {
    const cleaned = rut.replace(/[^0-9kK]/g, '')
    if (cleaned.length < 2) return false

    const body = cleaned.slice(0, -1)
    const dv = cleaned.slice(-1).toUpperCase()

    let sum = 0
    let multiplier = 2

    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier
      multiplier = multiplier === 7 ? 2 : multiplier + 1
    }

    const expectedDV = 11 - (sum % 11)
    const calculatedDV = expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : String(expectedDV)

    return dv === calculatedDV
  }

  const handleRutChange = (value: string) => {
    const formatted = formatRUT(value)
    setRut(formatted)
    if (errors.rut) {
      setErrors(prev => ({ ...prev, rut: '' }))
    }
  }

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}

    if (isCompany) {
      if (!rut.trim()) {
        newErrors.rut = 'RUT es obligatorio'
      } else if (!validateRUT(rut)) {
        newErrors.rut = 'RUT inválido'
      }

      if (!razonSocial.trim()) {
        newErrors.razonSocial = 'Razón Social es obligatoria'
      }

      if (!giro.trim()) {
        newErrors.giro = 'Giro es obligatorio'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSuccess({
      is_company: isCompany,
      company_rut: isCompany ? rut : '',
      company_razon_social: isCompany ? razonSocial : '',
      company_giro: isCompany ? giro : '',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-[90%] max-w-md mx-4 overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header con gradiente empresarial */}
        <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-white text-xl font-black text-center">Tipo de Cuenta</h3>
            <p className="text-white/80 text-xs text-center mt-1">¿Eres empresa o particular?</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Toggle Empresa/Particular */}
          <div className="bg-slate-50 rounded-2xl p-4 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isCompany}
                  onChange={(e) => setIsCompany(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-slate-300 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-indigo-600 transition-all duration-300 shadow-inner" />
                <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 peer-checked:translate-x-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">Soy Empresa</p>
                <p className="text-slate-500 text-xs">Facturación y datos corporativos</p>
              </div>
            </label>
          </div>

          {isCompany && (
            <div className="space-y-4 animate-slide-up">
              {/* RUT */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  RUT Empresa <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={rut}
                    onChange={(e) => handleRutChange(e.target.value)}
                    placeholder="12.345.678-9"
                    maxLength={12}
                    className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all ${
                      errors.rut
                        ? 'border-red-300 bg-red-50 focus:border-red-500'
                        : 'border-slate-200 focus:border-blue-500 focus:bg-blue-50/30'
                    }`}
                  />
                  {rut && validateRUT(rut) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {errors.rut && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.rut}
                  </p>
                )}
              </div>

              {/* Razón Social */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={razonSocial}
                  onChange={(e) => {
                    setRazonSocial(e.target.value)
                    if (errors.razonSocial) setErrors(prev => ({ ...prev, razonSocial: '' }))
                  }}
                  placeholder="Constructora Los Andes SpA"
                  className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all ${
                    errors.razonSocial
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-slate-200 focus:border-blue-500 focus:bg-blue-50/30'
                  }`}
                />
                {errors.razonSocial && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.razonSocial}
                  </p>
                )}
              </div>

              {/* Giro */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Giro Comercial <span className="text-red-500">*</span>
                </label>
                <select
                  value={giro}
                  onChange={(e) => {
                    setGiro(e.target.value)
                    if (errors.giro) setErrors(prev => ({ ...prev, giro: '' }))
                  }}
                  className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all ${
                    errors.giro
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-slate-200 focus:border-blue-500 focus:bg-blue-50/30'
                  }`}
                >
                  <option value="">Selecciona un giro</option>
                  <option value="Construcción y obras civiles">Construcción y obras civiles</option>
                  <option value="Servicios de mantención">Servicios de mantención</option>
                  <option value="Transporte y logística">Transporte y logística</option>
                  <option value="Comercio al por mayor">Comercio al por mayor</option>
                  <option value="Comercio al por menor">Comercio al por menor</option>
                  <option value="Servicios profesionales">Servicios profesionales</option>
                  <option value="Agricultura y ganadería">Agricultura y ganadería</option>
                  <option value="Manufactura">Manufactura</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Otro">Otro</option>
                </select>
                {errors.giro && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.giro}
                  </p>
                )}
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-blue-900 font-bold text-xs mb-1">Beneficios Empresa</p>
                    <ul className="text-blue-700 text-xs space-y-1">
                      <li>• Facturación automática</li>
                      <li>• Gestión de múltiples trabajadores</li>
                      <li>• Reportes y estadísticas</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isCompany && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 animate-slide-up">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-slate-800 font-bold text-sm mb-1">Cuenta Personal</p>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Perfecta para uso individual. Podrás contratar servicios y gestionar tus solicitudes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-slate-700 to-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:from-slate-800 hover:to-black transition shadow-lg hover:shadow-xl"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
