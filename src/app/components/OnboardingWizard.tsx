'use client'

import { useState, useRef } from 'react'
import { compressImageToWebP } from '@/lib/imageCompression'

interface Props {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: OnboardingData) => void
  userToken: string
  userName: string
}

interface OnboardingData {
  avatar?: File
  location: { lat: number; lng: number; address: string }
  hourly_rate: number
  skills: string[]
  bio: string
  availability: string[]
}

export default function OnboardingWizard({ isOpen, onClose, onComplete, userToken, userName }: Props) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    location: { lat: -33.4489, lng: -70.6693, address: 'Santiago, Chile' },
    hourly_rate: 15000,
    skills: [],
    bio: '',
    availability: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [customSkill, setCustomSkill] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const commonSkills = [
    'Instalación', 'Reparación', 'Mantenimiento', 'Pintura',
    'Electricidad', 'Gasfitería', 'Carpintería', 'Albañilería',
    'Jardinería', 'Limpieza', 'Mudanzas', 'Delivery',
  ]

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const compressed = await compressImageToWebP(file)
      const blob = new Blob([compressed], { type: 'image/webp' })
      const webpFile = new File([blob], 'avatar.webp', { type: 'image/webp' })
      
      setData({ ...data, avatar: webpFile })
      setAvatarPreview(URL.createObjectURL(blob))
    } catch (err) {
      console.error('Error compressing image:', err)
    }
  }

  const handleLocationSelect = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setData({
            ...data,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: 'Ubicación actual',
            }
          })
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }

  const toggleSkill = (skill: string) => {
    if (data.skills.includes(skill)) {
      setData({ ...data, skills: data.skills.filter(s => s !== skill) })
    } else {
      setData({ ...data, skills: [...data.skills, skill] })
    }
  }

  const addCustomSkill = () => {
    if (customSkill.trim() && !data.skills.includes(customSkill.trim())) {
      setData({ ...data, skills: [...data.skills, customSkill.trim()] })
      setCustomSkill('')
    }
  }

  const toggleDay = (day: string) => {
    if (data.availability.includes(day)) {
      setData({ ...data, availability: data.availability.filter(d => d !== day) })
    } else {
      setData({ ...data, availability: [...data.availability, day] })
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    
    // Upload avatar if exists
    if (data.avatar) {
      const formData = new FormData()
      formData.append('avatar', data.avatar)
      
      try {
        await fetch('/api/workers/upload-avatar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${userToken}` },
          body: formData,
        })
      } catch (err) {
        console.error('Error uploading avatar:', err)
      }
    }

    // Update worker profile
    try {
      await fetch('/api/workers/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          latitude: data.location.lat,
          longitude: data.location.lng,
          hourly_rate: data.hourly_rate,
          skills: data.skills,
          bio: data.bio,
          availability: data.availability,
        }),
      })
    } catch (err) {
      console.error('Error updating profile:', err)
    }

    setLoading(false)
    onComplete(data)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-[90%] max-w-lg mx-4 overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-500 via-pink-600 to-rose-700 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
          <div className="relative z-10">
            <h3 className="text-white text-2xl font-black text-center">¡Bienvenido, {userName.split(' ')[0]}!</h3>
            <p className="text-white/80 text-sm text-center mt-1">Paso {step} de 5</p>
          </div>
          
          {/* Progress bar */}
          <div className="relative z-10 mt-4">
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Step 1: Foto de perfil */}
          {step === 1 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h4 className="text-xl font-black text-slate-800 mb-2">Foto de Perfil</h4>
                <p className="text-sm text-slate-600">Una buena foto genera confianza</p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-4xl font-bold">{userName.charAt(0)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg hover:bg-purple-700 transition"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 w-full">
                  <p className="text-purple-900 text-xs font-semibold mb-1">💡 Consejos</p>
                  <ul className="text-purple-700 text-xs space-y-1">
                    <li>• Usa una foto clara de tu rostro</li>
                    <li>• Evita filtros o lentes oscuros</li>
                    <li>• Sonríe, genera confianza</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Ubicación */}
          {step === 2 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h4 className="text-xl font-black text-slate-800 mb-2">Tu Ubicación</h4>
                <p className="text-sm text-slate-600">¿Dónde ofreces tus servicios?</p>
              </div>

              <div className="bg-slate-100 rounded-2xl p-4 h-48 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-slate-600 text-sm font-semibold">{data.location.address}</p>
                </div>
              </div>

              <button
                onClick={handleLocationSelect}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-bold text-sm hover:from-purple-600 hover:to-pink-700 transition shadow-lg"
              >
                📍 Usar mi ubicación actual
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-900 text-xs font-semibold mb-1">🔒 Privacidad</p>
                <p className="text-blue-700 text-xs">
                  Tu ubicación exacta nunca se muestra. Los clientes solo ven tu ciudad y distancia aproximada.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Tarifa */}
          {step === 3 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h4 className="text-xl font-black text-slate-800 mb-2">Tarifa por Hora</h4>
                <p className="text-sm text-slate-600">¿Cuánto cobras por tu trabajo?</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
                <div className="text-center mb-4">
                  <p className="text-sm text-slate-600 mb-2">Tu tarifa</p>
                  <p className="text-5xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    ${data.hourly_rate.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">por hora</p>
                </div>

                <input
                  type="range"
                  min="5000"
                  max="50000"
                  step="1000"
                  value={data.hourly_rate}
                  onChange={(e) => setData({ ...data, hourly_rate: parseInt(e.target.value) })}
                  className="w-full"
                />

                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>$5.000</span>
                  <span>$50.000</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[10000, 15000, 20000].map(price => (
                  <button
                    key={price}
                    onClick={() => setData({ ...data, hourly_rate: price })}
                    className={`py-2 rounded-lg text-sm font-bold transition ${
                      data.hourly_rate === price
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    ${price.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-900 text-xs font-semibold mb-1">💰 Tip</p>
                <p className="text-amber-700 text-xs">
                  Puedes cambiar tu tarifa en cualquier momento. Empieza con un precio competitivo.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Skills */}
          {step === 4 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h4 className="text-xl font-black text-slate-800 mb-2">Especialidades</h4>
                <p className="text-sm text-slate-600">¿Qué sabes hacer?</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {commonSkills.map(skill => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                      data.skills.includes(skill)
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
                  placeholder="Agregar otra especialidad..."
                  className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-500"
                />
                <button
                  onClick={addCustomSkill}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
                >
                  +
                </button>
              </div>

              {data.skills.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-purple-900 text-xs font-semibold mb-2">
                    ✅ Seleccionadas ({data.skills.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.skills.map(skill => (
                      <span key={skill} className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Bio y Disponibilidad */}
          {step === 5 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h4 className="text-xl font-black text-slate-800 mb-2">Cuéntanos sobre ti</h4>
                <p className="text-sm text-slate-600">Describe tu experiencia</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Biografía
                </label>
                <textarea
                  value={data.bio}
                  onChange={(e) => setData({ ...data, bio: e.target.value })}
                  placeholder="Ej: Tengo 10 años de experiencia en gasfitería. Trabajo rápido y limpio. Garantía en todos mis trabajos."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl outline-none resize-none focus:border-purple-500 focus:bg-purple-50/30"
                />
                <p className="text-xs text-slate-500 mt-1">{data.bio.length}/500 caracteres</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Disponibilidad
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(day => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`py-2 rounded-lg text-sm font-semibold capitalize transition ${
                        data.availability.includes(day)
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-green-900 text-xs font-semibold mb-1">🎉 ¡Último paso!</p>
                <p className="text-green-700 text-xs">
                  Tu perfil estará listo para recibir solicitudes de trabajo.
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
            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-bold text-sm hover:from-purple-600 hover:to-pink-700 transition shadow-lg hover:shadow-xl"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </div>
                ) : (
                  '✨ Completar Perfil'
                )}
              </button>
            )}
          </div>

          {step === 1 && (
            <button
              onClick={onClose}
              className="w-full mt-3 text-sm text-slate-500 hover:text-slate-700 font-semibold"
            >
              Saltar por ahora
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
