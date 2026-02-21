'use client'

import { useState, useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: OnboardingData) => void
  userToken: string
  userName: string
  userAvatar?: string | null
}

interface OnboardingData {
  location: { lat: number; lng: number; address: string }
  hourly_rate: number
  category_id?: number
  skills: string[]
  bio: string
}

interface ApiCategory {
  id: number
  name: string
  icon: string
}

const MOTIVATIONAL = [
  'Tu talento merece ser visto',
  'Cada habilidad tiene valor',
  'Estás a un paso de conectar con tu comunidad',
  'Miles de personas buscan lo que tú sabes hacer',
]

export default function OnboardingWizard({ isOpen, onClose, onComplete, userToken, userName, userAvatar }: Props) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    location: { lat: 0, lng: 0, address: '' },
    hourly_rate: 15000,
    skills: [],
    bio: '',
  })
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [customSkill, setCustomSkill] = useState('')
  const [error, setError] = useState('')

  const motivational = MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]

  // Usar ubicación guardada si ya existe
  useEffect(() => {
    const savedLat = localStorage.getItem('user_lat')
    const savedLng = localStorage.getItem('user_lng')
    if (savedLat && savedLng) {
      const lat = parseFloat(savedLat)
      const lng = parseFloat(savedLng)
      setData(prev => ({ ...prev, location: { lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` } }))
    }
  }, [])

  // Fetch categories
  useEffect(() => {
    fetch('/api/v1/categories')
      .then(r => r.json())
      .then(d => setCategories(d.data || d || []))
      .catch(() => {})
  }, [])

  const handleLocationSelect = () => {
    if (!('geolocation' in navigator)) {
      setError('Tu navegador no soporta geolocalización')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setData(prev => ({
          ...prev,
          location: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          }
        }))
        setLocating(false)
      },
      () => {
        setError('No pudimos obtener tu ubicación. Activa el GPS e intenta de nuevo.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const toggleSkill = (skill: string) => {
    setData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }))
  }

  const addCustomSkill = () => {
    if (customSkill.trim() && !data.skills.includes(customSkill.trim())) {
      setData(prev => ({ ...prev, skills: [...prev.skills, customSkill.trim()] }))
      setCustomSkill('')
    }
  }

  const canProceed = () => {
    if (step === 1) return data.location.lat !== 0
    if (step === 2) return selectedCategory !== null
    if (step === 3) return data.hourly_rate >= 5000
    return true
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/worker/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          latitude: data.location.lat,
          longitude: data.location.lng,
          hourly_rate: data.hourly_rate,
          category_id: selectedCategory,
          skills: data.skills,
          bio: data.bio,
        }),
      })

      if (res.ok) {
        localStorage.setItem(`onboarding_done_${userName}`, 'true')
        onComplete({ ...data, category_id: selectedCategory || undefined })
      } else {
        setError('Error al guardar. Intenta nuevamente.')
      }
    } catch {
      setError('Sin conexión. Revisa tu internet.')
    }
    setLoading(false)
  }

  if (!isOpen) return null

  const totalSteps = 4
  const firstName = userName.split(' ')[0]

  // Mini clock component for loading states
  const MiniClock = () => (
    <div className="relative inline-flex h-5 w-5 items-center justify-center">
      <div className="absolute inset-0 rounded-full border-[2px] border-teal-400"></div>
      <div className="absolute h-1/2 w-[2px] origin-bottom rounded-full bg-gradient-to-t from-teal-400 to-amber-300" style={{ bottom: '50%', animation: 'spin 2s linear infinite' }}></div>
      <div className="z-10 h-[3px] w-[3px] rounded-full bg-amber-400"></div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 rounded-3xl shadow-2xl w-[92%] max-w-lg mx-4 overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto border border-slate-700/50">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-6 relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-10">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-[3px] border-teal-400"></div>
              <div className="absolute h-1/2 w-[3px] origin-bottom rounded-full bg-gradient-to-t from-teal-400 to-amber-300" style={{ bottom: '50%', animation: 'spin 6s linear infinite' }}></div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            {userAvatar ? (
              <img src={userAvatar} className="w-14 h-14 rounded-full object-cover border-2 border-teal-400/50" alt={firstName} />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xl font-black border-2 border-teal-400/50">
                {firstName.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="text-white text-xl font-black">Hola, {firstName}</h3>
              <p className="text-amber-400/80 text-xs font-semibold italic">{motivational}</p>
            </div>
          </div>
          
          {/* Progress */}
          <div className="flex items-center gap-2">
            <p className="text-slate-400 text-xs font-bold">Paso {step} de {totalSteps}</p>
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-400 to-amber-400 transition-all duration-500 rounded-full"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Minimum data notice */}
          <p className="text-slate-500 text-[10px] mt-2">
            Este formulario aparecerá hasta completar ubicación, categoría y tarifa
          </p>
        </div>

        {/* Body */}
        <div className="p-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
              <p className="text-red-400 text-xs font-semibold">{error}</p>
            </div>
          )}

          {/* Step 1: Ubicación */}
          {step === 1 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h4 className="text-lg font-black text-white mb-1">Tu Ubicación</h4>
                <p className="text-sm text-slate-400">Veremos qué oportunidades hay cerca de ti</p>
              </div>

              <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                {data.location.lat !== 0 ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-teal-400 text-sm font-bold">Ubicación obtenida</p>
                    <p className="text-slate-500 text-xs mt-1">{data.location.address}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="w-14 h-14 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-slate-500 text-sm">Aún no tenemos tu ubicación</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleLocationSelect}
                disabled={locating}
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3.5 rounded-xl font-bold text-sm hover:from-teal-600 hover:to-teal-700 transition shadow-lg shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {locating ? (
                  <><MiniClock /> <span>Obteniendo ubicación...</span></>
                ) : (
                  <><span>📍</span> <span>Compartir mi ubicación</span></>
                )}
              </button>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                <p className="text-slate-400 text-xs">
                  🔒 Tu ubicación exacta nunca se muestra. Los clientes solo ven la distancia aproximada.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Categoría */}
          {step === 2 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h4 className="text-lg font-black text-white mb-1">¿Qué servicio ofreces?</h4>
                <p className="text-sm text-slate-400">Elige tu categoría principal</p>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-left transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-teal-500/20 border-2 border-teal-400 text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.15)]'
                        : 'bg-slate-800 border-2 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-lg">{cat.icon || '📌'}</span>
                    <span className="text-xs font-bold leading-tight">{cat.name}</span>
                  </button>
                ))}
              </div>

              {selectedCategory && (
                <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3">
                  <p className="text-teal-400 text-xs font-semibold">
                    ✅ Podrás agregar más categorías después en tu perfil
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Tarifa */}
          {step === 3 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h4 className="text-lg font-black text-white mb-1">Tu Tarifa Base</h4>
                <p className="text-sm text-slate-400">Un valor de referencia inicial — lo puedes ajustar después</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <div className="text-center mb-5">
                  <p className="text-xs text-slate-500 mb-1">Tarifa por hora</p>
                  <p className="text-4xl font-black bg-gradient-to-r from-teal-300 to-amber-300 bg-clip-text text-transparent">
                    ${data.hourly_rate.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1">CLP / hora</p>
                </div>

                <input
                  type="range"
                  min="3000"
                  max="80000"
                  step="1000"
                  value={data.hourly_rate}
                  onChange={(e) => setData(prev => ({ ...prev, hourly_rate: parseInt(e.target.value) }))}
                  className="w-full accent-teal-400"
                />

                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>$3.000</span>
                  <span>$80.000</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[8000, 12000, 18000, 25000].map(price => (
                  <button
                    key={price}
                    onClick={() => setData(prev => ({ ...prev, hourly_rate: price }))}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      data.hourly_rate === price
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    ${(price/1000)}k
                  </button>
                ))}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-amber-400 text-xs">
                  💡 Esta tarifa es solo una referencia. Cada trabajo puede tener un precio diferente.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Extras opcionales (skills + bio) */}
          {step === 4 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h4 className="text-lg font-black text-white mb-1">Toque final</h4>
                <p className="text-sm text-slate-400">Opcional — mejora tu visibilidad</p>
              </div>

              {/* Skills */}
              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">Habilidades</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Instalación', 'Reparación', 'Pintura', 'Electricidad', 'Gasfitería', 'Carpintería', 'Jardinería', 'Limpieza', 'Mudanzas', 'Delivery', 'Cocina', 'Cuidado'].map(skill => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                        data.skills.includes(skill)
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomSkill()}
                    placeholder="Otra habilidad..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-teal-500 placeholder:text-slate-600"
                  />
                  <button onClick={addCustomSkill} className="px-3 py-2 bg-teal-500 text-white rounded-lg font-bold text-sm">+</button>
                </div>
              </div>

              {/* Bio */}
              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">Sobre ti (opcional)</p>
                <textarea
                  value={data.bio}
                  onChange={(e) => setData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Ej: Tengo experiencia en gasfitería, trabajo limpio y garantizado..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 outline-none resize-none focus:border-teal-500 placeholder:text-slate-600"
                />
              </div>

              <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3">
                <p className="text-teal-400 text-xs font-semibold">
                  🎉 ¡Ya casi! Con estos datos empezarás a aparecer en el mapa
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-5">
            {step > 1 && (
              <button
                onClick={() => { setStep(step - 1); setError('') }}
                className="flex-1 bg-slate-800 text-slate-400 py-3 rounded-xl font-bold text-sm hover:bg-slate-700 transition border border-slate-700"
              >
                Atrás
              </button>
            )}
            {step < totalSteps ? (
              <button
                onClick={() => { if (canProceed()) { setStep(step + 1); setError('') } }}
                disabled={!canProceed()}
                className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-teal-500/20 disabled:opacity-30 disabled:shadow-none"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 py-3 rounded-xl font-black text-sm transition shadow-lg shadow-amber-400/20 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <MiniClock />
                    <span>Guardando...</span>
                  </div>
                ) : (
                  'Completar Perfil'
                )}
              </button>
            )}
          </div>

          {step === 1 && (
            <button
              onClick={onClose}
              className="w-full mt-3 text-xs text-slate-600 hover:text-slate-400 font-semibold transition"
            >
              Lo haré después
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
