'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * TRAVEL MODE MODAL - Interfaz Transparente
 * 
 * El worker no siente que está activando un "módulo de transporte".
 * Simplemente le dice a JobsHour: "Voy de Renaico a Angol".
 * La app se da cuenta y hace el match proactivo.
 */

interface TravelModeModalProps {
  user: {
    name: string
    token: string
  }
  onClose: () => void
  onActivated: (route: any) => void
}

export default function TravelModeModal({ user, onClose, onActivated }: TravelModeModalProps) {
  const [step, setStep] = useState<'input' | 'loading' | 'matches'>('input')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [availableSeats, setAvailableSeats] = useState(3)
  const [cargoSpace, setCargoSpace] = useState<'sobre' | 'paquete' | 'bulto' | null>(null)
  const [routeType, setRouteType] = useState<'personal' | 'comercial' | 'mixto'>('personal')
  const [originCoords, setOriginCoords] = useState<{lat: number, lng: number} | null>(null)
  const [destCoords, setDestCoords] = useState<{lat: number, lng: number} | null>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [error, setError] = useState('')

  // Obtener ubicación actual como origen por defecto
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setOriginCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setOrigin('Mi ubicación actual')
        },
        (error) => {
          console.error('Error getting location:', error)
          // Si falla la geolocalización, usar coordenadas por defecto (Renaico)
          setOriginCoords({ lat: -37.6672, lng: -72.5730 })
          setOrigin('Renaico')
        }
      )
    } else {
      // Si no hay soporte de geolocalización, usar coordenadas por defecto
      setOriginCoords({ lat: -37.6672, lng: -72.5730 })
      setOrigin('Renaico')
    }
  }, [])

  const handleActivate = async () => {
    if (!origin || !destination || !departureTime) {
      setError('Por favor completa todos los campos')
      return
    }

    if (!originCoords || !destCoords) {
      setError('Por favor selecciona ubicaciones válidas')
      return
    }

    // Validar que la fecha de salida sea en el futuro
    const departureDate = new Date(departureTime)
    if (departureDate <= new Date()) {
      setError('La hora de salida debe ser en el futuro')
      return
    }

    setStep('loading')
    setError('')

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No estás autenticado. Por favor inicia sesión.')
        setStep('input')
        return
      }

      // Convertir datetime-local a formato ISO para el backend
      const departureTimeISO = new Date(departureTime).toISOString()

      const response = await fetch('/api/v1/worker/travel-mode/activate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin_lat: originCoords.lat,
          origin_lng: originCoords.lng,
          origin_address: origin,
          destination_lat: destCoords.lat,
          destination_lng: destCoords.lng,
          destination_address: destination,
          departure_time: departureTimeISO,
          available_seats: availableSeats,
          cargo_space: cargoSpace || null,
          route_type: routeType,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMatches(data.data?.matches || [])
        setStep('matches')
        onActivated(data.data?.active_route)
      } else {
        // Mostrar mensaje de error más específico
        let errorMessage = 'Error al activar modo viaje'
        
        if (data.message) {
          errorMessage = data.message
        } else if (data.errors) {
          // Si hay errores de validación, mostrar el primero
          const firstError = Object.values(data.errors)[0]
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0]
          } else if (typeof firstError === 'string') {
            errorMessage = firstError
          }
        } else if (response.status === 404) {
          errorMessage = 'No tienes un perfil de trabajador. Completa tu perfil primero.'
        } else if (response.status === 401) {
          errorMessage = 'Sesión expirada. Por favor inicia sesión nuevamente.'
        }
        
        setError(errorMessage)
        setStep('input')
      }
    } catch (err) {
      console.error('Error activating travel mode:', err)
      setError('Error de conexión. Verifica tu internet e intenta nuevamente.')
      setStep('input')
    }
  }

  // Geocoding simple (en producción usar Google Places API)
  const handleDestinationChange = (value: string) => {
    setDestination(value)
    
    // Coordenadas hardcoded para demo (Renaico → Angol)
    const lowerValue = value.toLowerCase().trim()
    if (lowerValue.includes('angol') || lowerValue.includes('angor')) {
      setDestCoords({ lat: -37.80, lng: -72.71 })
    } else if (lowerValue.includes('collipulli')) {
      setDestCoords({ lat: -37.95, lng: -72.43 })
    } else if (lowerValue.includes('los angeles') || lowerValue.includes('losángeles')) {
      setDestCoords({ lat: -37.47, lng: -72.35 })
    } else if (lowerValue.includes('renaico')) {
      setDestCoords({ lat: -37.67, lng: -72.57 })
    } else if (lowerValue.includes('temuco')) {
      setDestCoords({ lat: -38.73, lng: -72.60 })
    } else if (lowerValue.includes('concepción') || lowerValue.includes('concepcion')) {
      setDestCoords({ lat: -36.82, lng: -73.05 })
    }
    // Si no coincide con ninguna ciudad conocida, no establecer coordenadas
    // El usuario deberá escribir una ciudad válida o el sistema mostrará error
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl">🚗</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">¿A dónde vas?</h2>
              <p className="text-sm text-white/90">Aprovecha tu viaje para ayudar a otros</p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <AnimatePresence mode="wait">
            {step === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Origen */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📍 Desde
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Ej: Mi casa, Renaico"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 outline-none transition"
                  />
                </div>

                {/* Destino */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    🎯 Hacia
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => handleDestinationChange(e.target.value)}
                    placeholder="Ej: Angol, Collipulli, Los Ángeles"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 outline-none transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Escribe: Angol, Collipulli o Los Ángeles
                  </p>
                </div>

                {/* Hora de salida */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ⏰ Hora de salida
                  </label>
                  <input
                    type="datetime-local"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 outline-none transition"
                  />
                </div>

                {/* Capacidad */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-4">
                  <p className="text-sm font-bold text-gray-700 mb-3">
                    ¿Qué puedes llevar en tu viaje?
                  </p>
                  
                  {/* Asientos */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">👥 Pasajeros</span>
                      <span className="text-lg font-bold text-blue-600">{availableSeats}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      value={availableSeats}
                      onChange={(e) => setAvailableSeats(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Carga */}
                  <div>
                    <p className="text-sm text-gray-700 mb-2">📦 Espacio de carga</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'sobre', label: 'Sobre', icon: '📄' },
                        { value: 'paquete', label: 'Paquete', icon: '📦' },
                        { value: 'bulto', label: 'Bulto', icon: '📦' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setCargoSpace(cargoSpace === option.value ? null : option.value as any)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                            cargoSpace === option.value
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-600 border-2 border-gray-200'
                          }`}
                        >
                          {option.icon} {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tipo de viaje */}
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2">Tipo de viaje</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'personal', label: 'Personal' },
                      { value: 'comercial', label: 'Comercial' },
                      { value: 'mixto', label: 'Mixto' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setRouteType(option.value as any)}
                        className={`px-3 py-2 rounded-lg text-sm font-bold transition ${
                          routeType === option.value
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                )}

                {/* Botón activar */}
                <button
                  onClick={handleActivate}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white font-black rounded-xl shadow-lg hover:shadow-xl transition text-lg"
                >
                  🚗 Activar Modo Viaje
                </button>

                <p className="text-xs text-center text-gray-500">
                  Te notificaremos si alguien necesita ir en tu dirección
                </p>
              </motion.div>
            )}

            {step === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center"
              >
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <span className="text-4xl">🚗</span>
                </div>
                <p className="text-lg font-bold text-gray-800">Buscando necesidades en tu ruta...</p>
                <p className="text-sm text-gray-600 mt-2">Esto tomará solo unos segundos</p>
              </motion.div>
            )}

            {step === 'matches' && (
              <motion.div
                key="matches"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-green-900">¡Modo Viaje Activado!</p>
                      <p className="text-sm text-green-700">
                        {matches.length > 0 
                          ? `Encontramos ${matches.length} ${matches.length === 1 ? 'persona que necesita' : 'personas que necesitan'} ir en tu dirección`
                          : 'Te avisaremos si alguien necesita ir en tu dirección'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {matches.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-gray-700">Personas que te quedan de camino:</p>
                    {matches.map((match: any, index: number) => (
                      <div key={index} className="bg-white border-2 border-blue-200 rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-gray-800">{match.client_name}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              📍 {match.pickup_address}
                            </p>
                            <p className="text-sm text-gray-600">
                              🎯 {match.delivery_address}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                                +{match.pickup_detour_km?.toFixed(1)}km desvío
                              </span>
                              {match.offered_price && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                                  ${match.offered_price.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                >
                  Cerrar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
