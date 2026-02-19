'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import ExperienceSelector from './ExperienceSelector'

const iconMap: Record<string, string> = {
  'wrench': '🔧',
  'zap': '⚡',
  'paintbrush': '🎨',
  'sparkles': '✨',
  'hammer': '🔨',
  'leaf': '🌿',
  'key': '🔑',
  'building': '🏗️',
  'scissors': '✂️',
  'paw-print': '🐾',
  'shopping-bag': '🛍️',
  'truck': '🚚',
  'package': '📦',
}

interface Props {
  user: any
  onClose: () => void
  onCategorySelected?: () => void // Callback cuando se selecciona una categoría
}

export default function WorkerProfileHub({ user, onClose, onCategorySelected }: Props) {
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvUploaded, setCvUploaded] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [selectedSkills, setSelectedSkills] = useState<number[]>([])
  const [availableCategories, setAvailableCategories] = useState<any[]>([])
  const [workerData, setWorkerData] = useState<any>(null)
  const [showQR, setShowQR] = useState(false)
  const [isLoadingSkills, setIsLoadingSkills] = useState(true)
  const [bioTarjeta, setBioTarjeta] = useState('')
  const [experiences, setExperiences] = useState<any[]>([])
  const [showExperienceSelector, setShowExperienceSelector] = useState(false)
  
  const cvInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  // Cargar categorías y datos del worker al montar
  useEffect(() => {
    fetchWorkerData()
    fetchCategories()
  }, [])

  const fetchWorkerData = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/v1/worker/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setWorkerData(data.data)
        if (data.data?.categories) {
          setSelectedSkills(data.data.categories.map((c: any) => c.id))
        }
        if (data.data?.cv_path) {
          setCvUploaded(true)
        }
        if (data.data?.video_cv_path) {
          setVideoFile({ name: 'Video existente' } as File)
        }
        if (data.data?.bio_tarjeta) {
          setBioTarjeta(data.data.bio_tarjeta)
        }
      }
      
      // Cargar experiencias
      const expRes = await fetch('/api/v1/worker/experiences', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (expRes.ok) {
        const expData = await expRes.json()
        setExperiences(expData.data || [])
      }
    } catch (err) {
      console.error('Error fetching worker data:', err)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/categories')
      if (res.ok) {
        const data = await res.json()
        // La API puede devolver array directo o envuelto en data
        const categories = Array.isArray(data) ? data : (data.data || [])
        setAvailableCategories(categories)
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    } finally {
      setIsLoadingSkills(false)
    }
  }

  const handleCVDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      setCvFile(file)
      uploadCV(file)
    }
  }

  const handleCVSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCvFile(file)
      uploadCV(file)
    }
  }

  const uploadCV = async (file: File) => {
    const formData = new FormData()
    formData.append('cv', file)
    
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/v1/worker/cv', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      
      if (res.ok) {
        setCvUploaded(true)
      }
    } catch (err) {
      console.error('Error uploading CV:', err)
    }
  }

  const toggleSkill = async (categoryId: number) => {
    const wasEmpty = selectedSkills.length === 0
    const newSelection = selectedSkills.includes(categoryId)
      ? selectedSkills.filter(id => id !== categoryId)
      : [...selectedSkills, categoryId]
    
    setSelectedSkills(newSelection)
    
    // Sincronizar con backend
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/v1/worker/categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ categories: newSelection })
      })
      
      // Si se seleccionó la primera categoría (pasó de vacío a tener categorías), activar modo trabajo
      if (wasEmpty && newSelection.length > 0 && res.ok) {
        // Activar modo trabajo automáticamente
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            try {
              await fetch('/api/v1/worker/status', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  status: 'active',
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  categories: newSelection
                })
              })
              // Notificar al componente padre que se activó
              onCategorySelected?.()
            } catch (err) {
              console.error('Error activating worker mode:', err)
            }
          })
        }
      }
    } catch (err) {
      console.error('Error updating categories:', err)
    }
  }

  const saveBioTarjeta = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      await fetch('/api/v1/worker/bio-tarjeta', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bio_tarjeta: bioTarjeta })
      })
    } catch (err) {
      console.error('Error saving bio_tarjeta:', err)
    }
  }

  const handleAddExperience = async (experience: { title: string; description?: string; years?: number }) => {
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/v1/worker/experiences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(experience)
      })
      
      if (res.ok) {
        const data = await res.json()
        setExperiences([...experiences, data.data])
      }
    } catch (err) {
      console.error('Error adding experience:', err)
    }
  }

  const handleDeleteExperience = async (experienceId: number) => {
    try {
      const token = localStorage.getItem('auth_token')
      await fetch(`/api/v1/worker/experiences/${experienceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      setExperiences(experiences.filter(exp => exp.id !== experienceId))
    } catch (err) {
      console.error('Error deleting experience:', err)
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
      uploadVideo(file)
    }
  }

  const uploadVideo = async (file: File) => {
    const formData = new FormData()
    formData.append('video', file)
    
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/v1/worker/video', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      
      if (res.ok) {
        alert('Video subido exitosamente')
      }
    } catch (err) {
      console.error('Error uploading video:', err)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      })
      
      mediaRecorderRef.current = mediaRecorder
      recordedChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const file = new File([blob], `video-cv-${Date.now()}.webm`, { type: 'video/webm' })
        setVideoFile(file)
        uploadVideo(file)
        
        // Detener stream
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      // Timer de 30 segundos
      const interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopRecording()
            clearInterval(interval)
            return 30
          }
          return prev + 1
        })
      }, 1000)
      
    } catch (err) {
      console.error('Error accessing camera:', err)
      alert('No se pudo acceder a la cámara. Por favor verifica los permisos.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const shareProfile = () => {
    const profileUrl = `https://jobshour.dondemorales.cl/worker/${user.id}`
    const whatsappText = `¡Mira mi perfil profesional en JobsHour! ${profileUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-[200] bg-white overflow-y-auto">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
        >
          ✕
        </button>
        
        <div className="flex flex-col items-center">
          {/* Avatar con indicador online */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              )}
            </div>
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          
          <h1 className="text-2xl font-black text-white mt-3">{user.name}</h1>
          <p className="text-sm text-white/90">Disponible ahora</p>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-4 pb-24">
        
        {/* 1. Mi Currículum (Opcional) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📄</span>
              <h2 className="text-lg font-black text-gray-900">Mi Currículum</h2>
            </div>
            <p className="text-xs text-gray-600 mt-1">Opcional • PDF máximo 5MB</p>
          </div>
          
          <div className="p-4">
            {!cvUploaded ? (
              <div
                onDrop={handleCVDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-yellow-400 hover:bg-yellow-50/50 transition cursor-pointer"
                onClick={() => cvInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-700">Arrastra tu CV aquí</p>
                <p className="text-xs text-gray-500 mt-1">o haz clic para seleccionar</p>
                <input
                  ref={cvInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleCVSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-900">{cvFile?.name}</p>
                  <p className="text-xs text-green-700">CV subido exitosamente</p>
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-3 text-center italic">
              💡 No tienes CV? No hay problema. Tu video y habilidades son suficientes.
            </p>
          </div>
        </motion.div>

        {/* 2. Mis Habilidades */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚙️</span>
              <h2 className="text-lg font-black text-gray-900">Mis Habilidades</h2>
            </div>
            <p className="text-xs text-gray-600 mt-1">Haz clic para activar/desactivar habilidades</p>
          </div>
          
          <div className="p-4">
            {isLoadingSkills ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-yellow-500 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 mt-2">Cargando habilidades...</p>
              </div>
            ) : availableCategories.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-2 block">🔧</span>
                <p className="text-sm text-gray-500 mb-3">No hay habilidades disponibles</p>
                <p className="text-xs text-gray-400">Intenta recargar la página</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => {
                  const isSelected = selectedSkills.includes(category.id)
                  return (
                    <motion.button
                      key={category.id}
                      onClick={() => toggleSkill(category.id)}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        relative px-3 py-2 rounded-lg border-2 transition-all flex items-center gap-2
                        ${isSelected 
                          ? 'border-transparent shadow-md' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        }
                      `}
                      style={isSelected ? {
                        background: `linear-gradient(135deg, ${category.color || '#f59e0b'} 0%, ${category.color || '#f59e0b'}dd 100%)`,
                        color: 'white'
                      } : {
                        color: '#374151'
                      }}
                    >
                      <span className="text-xl">{iconMap[category.icon] || category.icon || '⚙️'}</span>
                      <span className="text-sm font-bold whitespace-nowrap">{category.display_name}</span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-4 h-4 bg-white rounded-full flex items-center justify-center ml-1"
                        >
                          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            )}
            
            {/* Botón Guardar cambios visible */}
            {selectedSkills.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('auth_token')
                      const res = await fetch('/api/v1/worker/categories', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ categories: selectedSkills })
                      })
                      
                      if (res.ok) {
                        alert('✅ Habilidades guardadas exitosamente')
                        onCategorySelected?.()
                      } else {
                        alert('❌ Error al guardar. Intenta nuevamente.')
                      }
                    } catch (err) {
                      alert('❌ Error de conexión')
                    }
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-black text-base shadow-lg hover:from-green-600 hover:to-green-700 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar {selectedSkills.length} habilidad{selectedSkills.length > 1 ? 'es' : ''}
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  También puedes activar modo trabajo desde el botón PLOMO en el mapa
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* 3. Video Currículum */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border-2 border-yellow-400 overflow-hidden shadow-lg"
        >
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 border-b border-yellow-500">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎥</span>
              <h2 className="text-lg font-black text-white">Video Currículum</h2>
            </div>
            <p className="text-xs text-white/90 mt-1">MP4/MOV/WEBM • 30MB máximo • 30 segundos para destacar tus servicios</p>
          </div>
          
          <div className="p-4">
            {!videoFile ? (
              <div className="bg-black rounded-xl aspect-video flex flex-col items-center justify-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <p className="text-white text-sm font-bold">Sube tu video currículum</p>
                <p className="text-white/70 text-xs mt-1">MP4/MOV/WEBM • 30MB máx</p>
              </div>
            ) : (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-900">Video subido</p>
                  <p className="text-xs text-green-700">{videoFile.name}</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={isRecording}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-bold text-sm hover:from-yellow-500 hover:to-orange-600 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Subir video
              </button>
              
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition shadow-md ${
                  isRecording 
                    ? 'bg-gray-600 hover:bg-gray-700' 
                    : 'bg-red-500 hover:bg-red-600'
                } text-white`}
              >
                {isRecording ? (
                  <>
                    <div className="w-5 h-5 bg-white rounded-sm animate-pulse"></div>
                    <span>{30 - recordingTime}s</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="white"/>
                      <circle cx="12" cy="12" r="4" fill="currentColor"/>
                    </svg>
                    Grabar ahora
                  </>
                )}
              </button>
            </div>
            
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleVideoSelect}
              className="hidden"
            />
            
            <p className="text-xs text-gray-600 mt-4 text-center italic">
              💡 No necesitas ser experto – graba cómo haces tu trabajo. Tu energía puede abrirte puertas sin importar edad o experiencia.
            </p>
          </div>
        </motion.div>

        {/* 4. Bio para Tarjeta */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💬</span>
              <h2 className="text-lg font-black text-gray-900">Texto para Mi Tarjeta</h2>
            </div>
            <p className="text-xs text-gray-600 mt-1">Preséntate en 150 caracteres</p>
          </div>
          
          <div className="p-4">
            <textarea
              value={bioTarjeta}
              onChange={(e) => setBioTarjeta(e.target.value)}
              onBlur={saveBioTarjeta}
              placeholder="Ej: Trabajador polimorfista con pasión por el servicio local. Siempre dispuesto a ayudar."
              maxLength={150}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-yellow-400 focus:outline-none text-sm resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">{bioTarjeta.length}/150 caracteres</p>
          </div>
        </motion.div>

        {/* 5. Mis Experiencias */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💼</span>
                <h2 className="text-lg font-black text-gray-900">Mis Experiencias</h2>
              </div>
              <button
                onClick={() => setShowExperienceSelector(true)}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:from-yellow-500 hover:to-orange-600 transition"
              >
                + Agregar
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">Muestra tu trayectoria profesional</p>
          </div>
          
          <div className="p-4">
            {experiences.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-2 block">📋</span>
                <p className="text-sm text-gray-500 mb-3">Aún no has agregado experiencias</p>
                <button
                  onClick={() => setShowExperienceSelector(true)}
                  className="text-sm text-yellow-600 font-bold hover:underline"
                >
                  Agregar mi primera experiencia
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {experiences.map((exp) => (
                  <div key={exp.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{exp.title}</p>
                        {exp.years && (
                          <p className="text-xs text-gray-600 mt-1">{exp.years} años de experiencia</p>
                        )}
                        {exp.description && (
                          <p className="text-xs text-gray-600 mt-2">{exp.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteExperience(exp.id)}
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

      </div>

      {/* Experience Selector Modal */}
      <ExperienceSelector
        isOpen={showExperienceSelector}
        onClose={() => setShowExperienceSelector(false)}
        onAdd={handleAddExperience}
        existingExperiences={experiences}
      />

      {/* Botón flotante: Guardar Cambios */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={shareProfile}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-black text-base shadow-lg hover:from-blue-600 hover:to-blue-700 transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Compartir Perfil
          </button>
          
          <button
            onClick={() => setShowQR(true)}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 px-6 rounded-xl font-black text-base shadow-lg hover:from-purple-600 hover:to-purple-700 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Modal QR */}
      {showQR && (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full"
          >
            <h3 className="text-xl font-black text-center mb-4">Tu Código QR</h3>
            <div className="bg-gray-100 rounded-2xl p-6 flex items-center justify-center mb-4">
              <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center p-4">
                <QRCodeSVG 
                  value={`https://jobshour.dondemorales.cl/worker/${user.id}`}
                  size={176}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>
            <p className="text-xs text-gray-600 text-center mb-4">
              Comparte este código para que tus clientes vean tu perfil
            </p>
            <button
              onClick={() => setShowQR(false)}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-3 rounded-xl font-bold"
            >
              Cerrar
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
