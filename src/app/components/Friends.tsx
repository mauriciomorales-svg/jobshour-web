'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { API_BASE_URL } from '../lib/api'
import { QRCodeSVG } from 'qrcode.react'

interface FriendsProps {
  user: {
    name: string
    firstName: string
    avatarUrl: string | null
    token: string
  }
  onClose: () => void
}

interface Friend {
  friendship_id: number
  user_id: number
  name: string
  nickname: string
  avatar_url: string
  skills: string[]
  accepted_at: string
  distance_km?: number
  is_active?: boolean
}

interface PendingRequest {
  id: number
  requester: {
    id: number
    name: string
  }
  created_at: string
}

export default function Friends({ user, onClose }: FriendsProps) {
  const [activeTab, setActiveTab] = useState<'friends' | 'find' | 'qr'>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [qrCode, setQrCode] = useState('')
  const [scanCode, setScanCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filterActive, setFilterActive] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)

  useEffect(() => {
    loadData()
    generateQR()
    getUserLocation()
  }, [user.token])

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => console.error('Error getting location:', error)
      )
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Cargar amigos
      const friendsResponse = await fetch(`${API_BASE_URL}/friends/list`, {
        headers: { 'Authorization': `Bearer ${user.token}` },
      })
      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json()
        setFriends(friendsData.friends || [])
      }
      
      // Cargar solicitudes pendientes
      const pendingResponse = await fetch(`${API_BASE_URL}/friends/pending`, {
        headers: { 'Authorization': `Bearer ${user.token}` },
      })
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json()
        setPendingRequests(pendingData.requests || [])
      }
    } catch (error) {
      console.error('Error loading friends:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQR = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/friends/qr`, {
        headers: { 'Authorization': `Bearer ${user.token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setQrCode(data.qr_url)
      }
    } catch (error) {
      console.error('Error generating QR:', error)
    }
  }

  const handleSearch = async () => {
    if (searchQuery.length < 2) return
    
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        ...(userLocation && { lat: userLocation.lat.toString(), lng: userLocation.lng.toString() }),
        ...(filterActive && { active_only: 'true' }),
        max_radius_km: '10'
      })
      
      const response = await fetch(`${API_BASE_URL}/friends/search?${params}`, {
        headers: { 'Authorization': `Bearer ${user.token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.workers || [])
      }
    } catch (error) {
      console.error('Error searching:', error)
    }
  }

  const sendRequest = async (userId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/friends/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      })
      
      if (response.ok) {
        alert('Solicitud enviada!')
        setSearchResults(searchResults.filter(w => w.user_id !== userId))
      } else {
        alert('Error al enviar solicitud')
      }
    } catch (error) {
      console.error('Error sending request:', error)
    }
  }

  const handleScanQR = async () => {
    if (!scanCode) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/friends/qr/${scanCode}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
      })
      
      const data = await response.json()
      if (response.ok) {
        alert('Solicitud enviada!')
        setScanCode('')
      } else {
        alert(data.message || 'QR no válido')
      }
    } catch (error) {
      console.error('Error scanning QR:', error)
    }
  }

  const acceptRequest = async (friendshipId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/friends/accept/${friendshipId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
      })
      
      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Error accepting:', error)
    }
  }

  const rejectRequest = async (friendshipId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/friends/reject/${friendshipId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
      })
      
      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Error rejecting:', error)
    }
  }

  const syncContacts = async () => {
    // Simulación - en producción accedería a los contactos del teléfono
    setSyncing(true)
    try {
      const mockContacts = ['user1@email.com', 'user2@email.com', '+56912345678']
      
      const response = await fetch(`${API_BASE_URL}/friends/sync-contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contacts: mockContacts }),
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(`${data.matches_found} contactos encontrados en JobsHours!`)
        loadData()
      }
    } catch (error) {
      console.error('Error syncing:', error)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 flex justify-between items-center">
          <h2 className="text-xl font-black italic text-white">👥 Mis Amigos</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: 'friends', label: 'Amigos', icon: '👥' },
            { id: 'find', label: 'Buscar', icon: '🔍' },
            { id: 'qr', label: 'QR', icon: '📱' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 text-sm font-bold ${activeTab === tab.id ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50' : 'text-gray-500'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === 'friends' && (
            <div className="space-y-4">
              {/* Solicitudes pendientes */}
              {pendingRequests.length > 0 && (
                <div className="bg-yellow-50 rounded-xl p-3">
                  <h3 className="text-sm font-bold text-yellow-800 mb-2">Solicitudes pendientes ({pendingRequests.length})</h3>
                  {pendingRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between bg-white rounded-lg p-2 mb-2">
                      <span className="text-sm font-medium">{req.requester.name}</span>
                      <div className="flex gap-1">
                        <button onClick={() => acceptRequest(req.id)} className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg">Aceptar</button>
                        <button onClick={() => rejectRequest(req.id)} className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-lg">Rechazar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sync Contacts Button */}
              <button 
                onClick={syncContacts}
                disabled={syncing}
                className="w-full py-3 bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold rounded-xl shadow hover:shadow-lg transition disabled:opacity-50"
              >
                {syncing ? 'Sincronizando...' : '📞 Sincronizar Agenda de Contactos'}
              </button>

              {/* Lista de amigos */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-700">Tus amigos ({friends.length})</h3>
                {loading ? (
                  <p className="text-center text-gray-500">Cargando...</p>
                ) : friends.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 text-center space-y-4"
                  >
                    <div className="text-5xl mb-2">👥</div>
                    <h3 className="text-lg font-black text-gray-800">¡Aún no tienes compañeros en JobsHours!</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Conecta con otros trabajadores de <span className="font-bold text-orange-600">Renaico y alrededores</span>: jóvenes que empiezan, personas con experiencia que buscan nuevas oportunidades, o compañeros para cubrir jobs grandes juntos.
                    </p>
                    <div className="bg-white/60 rounded-xl p-4 text-left space-y-2">
                      <p className="text-xs font-bold text-gray-600">Ejemplos de colaboración:</p>
                      <ul className="text-xs text-gray-700 space-y-1">
                        <li>• "Ayuda con mudanza" (2-3 personas)</li>
                        <li>• "Electricista para equipo" (maestro + ayudante)</li>
                        <li>• "Entregas rápidas" (cobertura en equipo)</li>
                      </ul>
                    </div>
                    <button
                      onClick={() => setActiveTab('find')}
                      className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black rounded-xl shadow-lg hover:shadow-xl transition text-base"
                    >
                      🔍 Buscar compañeros ahora
                    </button>
                  </motion.div>
                ) : (
                  friends.map(friend => (
                    <motion.div 
                      key={friend.friendship_id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-white to-gray-50 rounded-xl border-2 border-gray-100 hover:border-orange-300 transition relative"
                    >
                      {friend.is_active && (
                        <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg relative">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt={friend.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          friend.name.charAt(0).toUpperCase()
                        )}
                        {friend.is_active && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">{friend.name}</p>
                          {friend.distance_km !== undefined && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                              {friend.distance_km < 1 ? '<1km' : `${friend.distance_km.toFixed(1)}km`}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">@{friend.nickname}</p>
                        {friend.skills?.length > 0 && (
                          <p className="text-xs text-orange-500 mt-1">{friend.skills.slice(0, 3).join(', ')}</p>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'find' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-gray-700">🔍 Encuentra compañeros cercanos</p>
                <p className="text-xs text-gray-600 mt-1">Busca por nombre, habilidad o ciudad</p>
              </div>

              {/* Filtro rápido */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterActive(!filterActive)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                    filterActive 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {filterActive ? '🟢 Activos ahora' : '⚪ Todos'}
                </button>
              </div>

              {/* Buscador */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar por nombre, habilidad o ciudad..."
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 outline-none"
                />
                <button 
                  onClick={handleSearch}
                  className="px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg transition"
                >
                  🔍
                </button>
              </div>

              {/* Resultados */}
              <div className="space-y-3">
                {searchResults.length === 0 && searchQuery.length > 0 && (
                  <p className="text-center text-gray-400 py-4 text-sm">No se encontraron resultados</p>
                )}
                {searchResults.map(worker => (
                  <motion.div 
                    key={worker.id} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-orange-300 transition shadow-sm"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold overflow-hidden">
                          {worker.avatar_url ? (
                            <img src={worker.avatar_url} alt={worker.nickname} className="w-full h-full object-cover" />
                          ) : (
                            worker.nickname?.charAt(0).toUpperCase()
                          )}
                        </div>
                        {worker.is_active && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">{worker.name || `@${worker.nickname}`}</p>
                          {worker.distance_km !== undefined && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                              {worker.distance_km < 1 ? '<1km' : `${worker.distance_km.toFixed(1)}km`}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">@{worker.nickname}</p>
                        {worker.skills && worker.skills.length > 0 && (
                          <p className="text-xs text-orange-500 mt-1">{worker.skills.slice(0, 2).join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => sendRequest(worker.user_id)}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold rounded-lg hover:shadow-lg transition flex items-center gap-1"
                    >
                      <span>+</span>
                      <span className="hidden sm:inline">Agregar</span>
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="space-y-6 text-center">
              {/* Mi QR */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-200"
              >
                <h3 className="text-lg font-black text-gray-800 mb-2">📱 Tu código QR</h3>
                <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                  Comparte este QR con <span className="font-bold text-orange-600">clientes habituales</span> o grupos de WhatsApp.<br/>
                  <span className="text-xs text-gray-600">¡Así te encuentran rápido para trabajos futuros!</span>
                </p>
                {qrCode && (
                  <div className="bg-white rounded-xl p-4 inline-block shadow-lg">
                    <QRCodeSVG value={qrCode} size={200} level="H" />
                  </div>
                )}
                <button
                  onClick={() => {
                    const profileUrl = qrCode || `https://jobshour.dondemorales.cl/worker/${user.token.split('|')[0]}`
                    const whatsappText = `¿Necesitas ayuda con algo? En JobsHours encontrarás personas con habilidades reales cerca de ti 📍\nMira este perfil: ${profileUrl}`
                    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, '_blank')
                  }}
                  className="mt-4 w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Compartir por WhatsApp
                </button>
              </motion.div>

              {/* Escanear QR */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Escanear código</h3>
                <p className="text-sm text-gray-600 mb-4">Ingresa el código QR de un amigo</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value.toUpperCase())}
                    placeholder="JHXXXXXXXX"
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 outline-none text-center font-mono text-lg tracking-wider"
                  />
                  <button 
                    onClick={handleScanQR}
                    className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl"
                  >
                    📷
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
