'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import ExperienceSelector from './ExperienceSelector'

const iconMap: Record<string, string> = {
  'wrench': '🔧', 'zap': '⚡', 'paintbrush': '🎨', 'sparkles': '✨',
  'hammer': '🔨', 'leaf': '🌿', 'key': '🔑', 'building': '🏗️',
  'scissors': '✂️', 'paw-print': '🐾', 'shopping-bag': '🛍️',
  'truck': '🚚', 'package': '📦', 'broom': '🧹', 'motorcycle': '🏍️',
  'bicycle': '🚲', 'car': '🚗', 'trees': '🌳', 'home': '🏠',
  'hard-hat': '👷', 'key-round': '🔑', 'droplet': '💧', 'droplets': '💧',
  'flame': '🔥', 'rabbit': '🐇', 'monitor': '💻', 'camera': '📷',
  'disc': '🎧', 'wifi': '📶', 'chef-hat': '👨‍🍳', 'utensils': '🍽️',
  'activity': '🏃', 'hand': '💆', 'music': '🎵', 'graduation-cap': '🎓',
  'dog': '🐕', 'heart-handshake': '🤝', 'baby': '👶', 'shopping-cart': '🛒',
  'shield': '🛡️', 'book': '📚', 'laptop': '💻', 'heart': '❤️',
  'paw': '🐾', 'ruler': '📐', 'tree': '🌳',
}

function InlineFeedback({ msg, type }: { msg: string; type: 'ok' | 'err' | 'info' }) {
  const colors = { ok: 'bg-green-50 border-green-300 text-green-800', err: 'bg-red-50 border-red-300 text-red-800', info: 'bg-blue-50 border-blue-300 text-blue-800' }
  const icons = { ok: '✅', err: '❌', info: 'ℹ️' }
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className={`mt-2 px-3 py-2 rounded-lg border text-sm flex items-center gap-2 ${colors[type]}`}>
      <span>{icons[type]}</span><span>{msg}</span>
    </motion.div>
  )
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
  const [showShareCard, setShowShareCard] = useState(false)
  const [isLoadingSkills, setIsLoadingSkills] = useState(true)
  const [bioTarjeta, setBioTarjeta] = useState('')
  const [experiences, setExperiences] = useState<any[]>([])
  const [showExperienceSelector, setShowExperienceSelector] = useState(false)
  const [feedback, setFeedback] = useState<{ msg: string; type: 'ok' | 'err' | 'info' } | null>(null)
  const [savingSkills, setSavingSkills] = useState(false)
  const [skillSearch, setSkillSearch] = useState('')
  
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
      const res = await apiFetch('/api/v1/worker/me', {
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
      const expRes = await apiFetch('/api/v1/worker/experiences', {
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
      const res = await apiFetch('/api/v1/categories')
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
      const res = await apiFetch('/api/v1/worker/cv', {
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
      const res = await apiFetch('/api/v1/worker/categories', {
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
              await apiFetch('/api/v1/worker/status', {
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
      await apiFetch('/api/v1/worker/bio-tarjeta', {
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
      const res = await apiFetch('/api/v1/worker/experiences', {
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
      await apiFetch(`/api/v1/worker/experiences/${experienceId}`, {
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
      const res = await apiFetch('/api/v1/worker/video', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      
      if (res.ok) {
        setFeedback({ msg: 'Video subido correctamente ✅', type: 'ok' })
        setTimeout(() => setFeedback(null), 3000)
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
      setFeedback({ msg: 'No se pudo acceder a la cámara. Verifica permisos.', type: 'err' })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const profileUrl = `https://jobshour.dondemorales.cl/worker/${user?.id}`
  const profileName = workerData?.name || user?.name || 'Mi Perfil'
  const profileAvatar = workerData?.avatar || user?.avatarUrl || null

  const completionSteps = [
    { label: 'Foto de perfil', done: !!profileAvatar },
    { label: 'Habilidades', done: selectedSkills.length > 0 },
    { label: 'Descripción', done: bioTarjeta.length > 10 },
    { label: 'CV o Video', done: cvUploaded || !!videoFile },
    { label: 'Experiencia', done: experiences.length > 0 },
  ]
  const completionPct = Math.round((completionSteps.filter(s => s.done).length / completionSteps.length) * 100)

  const handleShare = async () => {
    const text = `¿Necesitas ayuda con algo? Encuentra trabajadores verificados cerca de ti en JobsHour 👇\n${profileUrl}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: profileName, text, url: profileUrl }) } catch {}
    } else {
      setShowShareCard(true)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(profileUrl)
    setFeedback({ msg: 'Enlace copiado al portapapeles', type: 'ok' })
    setTimeout(() => setFeedback(null), 2500)
  }

  return (
    <div className="fixed inset-0 z-[200] bg-gray-50 overflow-y-auto">

      {/* ── HERO HEADER ── */}
      <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-500 pt-safe">
        <div className="relative px-4 pt-5 pb-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-black/20 rounded-full flex items-center justify-center text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-white/30 overflow-hidden border-2 border-white/60">
                {profileAvatar
                  ? <img src={profileAvatar} alt={profileName} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-white font-black text-3xl">{profileName.charAt(0)}</div>
                }
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white rounded-full" />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-white truncate">{profileName}</h1>
              <p className="text-sm text-white/80">
                {selectedSkills.length > 0
                  ? `${selectedSkills.length} habilidad${selectedSkills.length > 1 ? 'es' : ''} registrada${selectedSkills.length > 1 ? 's' : ''}`
                  : 'Completa tu perfil para aparecer en el mapa'}
              </p>
              {/* Completion pill */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${completionPct}%` }} />
                </div>
                <span className="text-xs text-white font-bold">{completionPct}%</span>
              </div>
            </div>
          </div>

          {/* Completion checklist compacto */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {completionSteps.map(s => (
              <span key={s.label} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.done ? 'bg-white/30 text-white' : 'bg-black/20 text-white/60'}`}>
                {s.done ? '✓' : '○'} {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Feedback global */}
        {feedback && (
          <div className="px-4 pb-3">
            <InlineFeedback msg={feedback.msg} type={feedback.type} />
          </div>
        )}
      </div>

      {/* ── TARJETA COMPARTIBLE ── */}
      <div className="px-4 -mt-1 pt-4 pb-2">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 shadow-xl">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 border border-white/20 shrink-0">
              {profileAvatar
                ? <img src={profileAvatar} alt={profileName} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white font-black text-xl">{profileName.charAt(0)}</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base truncate">{profileName}</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {availableCategories.filter(c => selectedSkills.includes(c.id)).slice(0, 2).map((c: any) => c.display_name).join(' · ') || 'Sin habilidades aún'}
              </p>
              {bioTarjeta && <p className="text-slate-300 text-xs mt-1 line-clamp-2">{bioTarjeta}</p>}
            </div>
            <div className="shrink-0">
              <QRCodeSVG value={profileUrl} size={48} level="L" bgColor="transparent" fgColor="white" />
            </div>
          </div>
          <div className="flex items-center gap-1 mb-3">
            <span className="text-xs text-slate-500">jobshour.dondemorales.cl</span>
          </div>
          {/* Share buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Compartir
            </button>
            <button
              onClick={() => {
                const text = `¡Hola! Soy ${profileName} y ofrezco mis servicios en JobsHour 🔧\nMírame aquí: ${profileUrl}`
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
              }}
              className="flex flex-col items-center gap-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition active:scale-95"
            >
              <span className="text-base leading-none">💬</span>
              WhatsApp
            </button>
            <button
              onClick={copyLink}
              className="flex flex-col items-center gap-1 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-xl text-xs font-bold transition active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Copiar link
            </button>
          </div>
        </div>
      </div>

      {/* ── SECCIONES ── */}
      <div className="px-4 pb-24 space-y-3 mt-2">
        
        {/* PASO 1: CV */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white rounded-2xl border-2 overflow-hidden ${cvUploaded ? 'border-green-300' : 'border-gray-100'}`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0 ${cvUploaded ? 'bg-green-500' : 'bg-gray-300'}`}>{cvUploaded ? '✓' : '1'}</div>
            <div>
              <h2 className="font-black text-gray-900 text-sm">Sube tu CV <span className="text-gray-400 font-normal">(opcional)</span></h2>
              <p className="text-xs text-gray-500">PDF hasta 5MB — si no tienes uno, ¡no importa!</p>
            </div>
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

        {/* PASO 2: Habilidades */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`bg-white rounded-2xl border-2 overflow-hidden ${selectedSkills.length > 0 ? 'border-orange-300' : 'border-gray-100'}`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0 ${selectedSkills.length > 0 ? 'bg-orange-500' : 'bg-gray-300'}`}>{selectedSkills.length > 0 ? '✓' : '2'}</div>
            <div>
              <h2 className="font-black text-gray-900 text-sm">¿Qué sabes hacer? <span className="text-orange-500 font-bold">{selectedSkills.length > 0 ? `${selectedSkills.length} elegida${selectedSkills.length > 1 ? 's' : ''}` : 'Elige al menos 1'}</span></h2>
              <p className="text-xs text-gray-500">Toca los servicios que ofreces — apareces en el mapa por esto</p>
            </div>
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
              <>
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="🔍 Buscar habilidad..."
                className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                {availableCategories.filter(c => c.display_name?.toLowerCase().includes(skillSearch.toLowerCase()) || c.name?.toLowerCase().includes(skillSearch.toLowerCase())).map((category) => {
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
                      <span className="text-sm font-bold whitespace-nowrap">{category.display_name || category.name || '?'}</span>
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
              </>
            )}
            
            {/* Botón Guardar cambios visible */}
            {selectedSkills.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('auth_token')
                      const res = await apiFetch('/api/v1/worker/categories', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ categories: selectedSkills })
                      })
                      
                      if (res.ok) {
                        setFeedback({ msg: 'Habilidades guardadas', type: 'ok' })
                        setTimeout(() => setFeedback(null), 3000)
                        onCategorySelected?.()
                      } else {
                        setFeedback({ msg: 'Error al guardar. Intenta de nuevo.', type: 'err' })
                      }
                    } catch (err) {
                      setFeedback({ msg: 'Error de conexión', type: 'err' })
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
                  📍 Después actívate en el mapa con el botón de estado
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* PASO 3: Video */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`bg-white rounded-2xl border-2 overflow-hidden ${videoFile ? 'border-green-300' : 'border-yellow-300'}`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0 ${videoFile ? 'bg-green-500' : 'bg-yellow-400'}`}>{videoFile ? '✓' : '3'}</div>
            <div>
              <h2 className="font-black text-gray-900 text-sm">Video de presentación <span className="text-yellow-600 font-normal text-xs">(recomendado)</span></h2>
              <p className="text-xs text-gray-500">30 segundos mostrando lo que haces — genera mucha más confianza que un CV</p>
            </div>
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

        {/* PASO 4: Bio */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`bg-white rounded-2xl border-2 overflow-hidden ${bioTarjeta.length > 10 ? 'border-blue-300' : 'border-gray-100'}`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0 ${bioTarjeta.length > 10 ? 'bg-blue-500' : 'bg-gray-300'}`}>{bioTarjeta.length > 10 ? '✓' : '4'}</div>
            <div>
              <h2 className="font-black text-gray-900 text-sm">Tu presentación en una frase</h2>
              <p className="text-xs text-gray-500">Aparece en tu tarjeta compartible — cuéntanos quién eres</p>
            </div>
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

        {/* PASO 5: Experiencias */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`bg-white rounded-2xl border-2 overflow-hidden ${experiences.length > 0 ? 'border-purple-300' : 'border-gray-100'}`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0 ${experiences.length > 0 ? 'bg-purple-500' : 'bg-gray-300'}`}>{experiences.length > 0 ? '✓' : '5'}</div>
            <div className="flex-1">
              <h2 className="font-black text-gray-900 text-sm">Tus trabajos anteriores <span className="text-gray-400 font-normal">(opcional)</span></h2>
              <p className="text-xs text-gray-500">Da más confianza mostrar qué has hecho antes</p>
            </div>
            <button
              onClick={() => setShowExperienceSelector(true)}
              className="shrink-0 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition"
            >
              + Agregar
            </button>
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

      {/* Barra inferior */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={handleShare}
            className="flex-1 bg-gradient-to-r from-orange-400 to-orange-500 text-white py-3.5 rounded-xl font-black text-sm shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Compartir mi tarjeta
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
