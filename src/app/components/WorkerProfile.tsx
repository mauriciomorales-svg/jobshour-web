'use client'

import { useState, useCallback, useEffect } from 'react'
import { API_BASE_URL } from '../lib/api'

interface WorkerProfileProps {
  user: {
    name: string
    firstName: string
    avatarUrl: string | null
    provider: string
    token: string
  }
  onClose: () => void
}

interface Skill {
  id: number
  name: string
  active: boolean
}

export default function WorkerProfile({ user, onClose }: WorkerProfileProps) {
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvUrl, setCvUrl] = useState<string | null>(null)
  const [cvFilename, setCvFilename] = useState<string | null>(null)
  const [skills, setSkills] = useState<Skill[]>([
    { id: 1, name: 'Gasfitería', active: true },
    { id: 2, name: 'Electricidad', active: false },
    { id: 3, name: 'Carpintería', active: true },
    { id: 4, name: 'Pintura', active: false },
    { id: 5, name: 'Jardinería', active: true },
  ])
  const [showcaseVideo, setShowcaseVideo] = useState<string>('')
  const [videoId, setVideoId] = useState<number | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUploading, setVideoUploading] = useState(false)
  const [status, setStatus] = useState<'active' | 'intermediate' | 'inactive'>('active')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ranking, setRanking] = useState<{ position: number; total: number; category: string } | null>(null)
  const [validatedFriends, setValidatedFriends] = useState<number>(0)

  // Cargar datos del perfil al montar
  useEffect(() => {
    loadProfile()
  }, [user.token])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/worker/profile`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        if (data.skills) setSkills(data.skills)
        if (data.cv_url) {
          setCvUrl(data.cv_url)
          setCvFilename(data.cv_filename)
        }
        if (data.showcase_video) {
          setShowcaseVideo(data.showcase_video.url)
        }
        if (data.ranking) {
          setRanking(data.ranking)
        }
        if (data.validated_friends !== undefined) {
          setValidatedFriends(data.validated_friends)
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSkill = async (id: number) => {
    const updatedSkills = skills.map(s => s.id === id ? { ...s, active: !s.active } : s)
    setSkills(updatedSkills)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf' && file.size <= 5 * 1024 * 1024) {
      handleFileUpload(file)
    } else {
      alert('Solo archivos PDF de máximo 5MB')
    }
  }, [user.token])

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf' && file.size <= 5 * 1024 * 1024) {
      handleFileUpload(file)
    } else {
      alert('Solo archivos PDF de máximo 5MB')
    }
  }

  const handleFileUpload = async (file: File) => {
    setCvFile(file)

    const formData = new FormData()
    formData.append('cv', file)

    try {
      const response = await fetch(`${API_BASE_URL}/worker/cv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setCvUrl(data.cv_url)
        setCvFilename(data.cv_filename)
      } else {
        alert('Error al subir el CV')
        setCvFile(null)
      }
    } catch (error) {
      console.error('Error uploading CV:', error)
      alert('Error de conexión')
      setCvFile(null)
    }
  }

  const handleDeleteCv = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/worker/cv`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })

      if (response.ok) {
        setCvFile(null)
        setCvUrl(null)
        setCvFilename(null)
      }
    } catch (error) {
      console.error('Error deleting CV:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/worker/skills`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skills }),
      })

      if (response.ok) {
        alert('Cambios guardados exitosamente')
      } else {
        alert('Error al guardar los cambios')
      }
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.type === 'video/mp4' || file.type === 'video/quicktime' || file.type === 'video/avi')) {
      if (file.size <= 30 * 1024 * 1024) {
        handleVideoUpload(file)
      } else {
        alert('El video no debe superar los 30MB')
      }
    } else {
      alert('Solo archivos MP4, MOV o AVI')
    }
  }

  const handleVideoUpload = async (file: File) => {
    setVideoFile(file)
    setVideoUploading(true)

    const formData = new FormData()
    formData.append('video', file)
    formData.append('type', 'showcase')

    try {
      const response = await fetch(`${API_BASE_URL}/worker/video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setShowcaseVideo(data.video.url)
        setVideoId(data.video.id)
      } else {
        alert('Error al subir el video')
        setVideoFile(null)
      }
    } catch (error) {
      console.error('Error uploading video:', error)
      alert('Error de conexión')
      setVideoFile(null)
    } finally {
      setVideoUploading(false)
    }
  }

  const handleDeleteVideo = async () => {
    if (!videoId) return
    try {
      const response = await fetch(`${API_BASE_URL}/worker/video/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })

      if (response.ok) {
        setShowcaseVideo('')
        setVideoId(null)
        setVideoFile(null)
      }
    } catch (error) {
      console.error('Error deleting video:', error)
    }
  }

  const statusColors = {
    active: 'bg-green-500',
    intermediate: 'bg-yellow-500',
    inactive: 'bg-gray-500' // PLOMO/Gris, no rojo
  }

  const statusText = {
    active: 'Disponible ahora',
    intermediate: 'Semi-disponible',
    inactive: 'No disponible'
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[250] flex items-end justify-center">
      <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        {/* Header con Banner Mango + Avatar + Anillo Estado */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div className="flex flex-col items-center">
            <div className="relative mb-3">
              <div className="absolute -inset-2 bg-white/30 rounded-full blur-md"></div>
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  className="relative w-20 h-20 rounded-full border-4 border-white object-cover shadow-lg" 
                  alt={user.firstName} 
                />
              ) : (
                <div className="relative w-20 h-20 rounded-full border-4 border-white bg-white/30 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {user.firstName.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Anillo de estado */}
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${statusColors[status]} border-3 border-white rounded-full shadow-md`}></div>
            </div>
            <h2 className="text-xl font-black italic text-white">{user.name}</h2>
            <p className="text-sm text-white/90 font-medium">{statusText[status]}</p>
            
            {/* Ranking Badge */}
            {ranking && ranking.position && (
              <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                <p className="text-xs font-bold text-white">
                  🏆 #{ranking.position} de {ranking.total} en {ranking.category}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Ranking Card Expandido */}
          {ranking && ranking.position && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200/50">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                  {ranking.position === 1 ? '🥇' : ranking.position === 2 ? '🥈' : ranking.position === 3 ? '🥉' : '🏆'}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-600">Tu Posición Competitiva</p>
                  <p className="text-lg font-black text-slate-800">
                    #{ranking.position} de {ranking.total}
                  </p>
                  <p className="text-[10px] text-slate-500">{ranking.category}</p>
                </div>
              </div>
              {ranking.position <= 3 && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <p className="text-xs text-purple-700 font-semibold">
                    ⭐ Estás en el top 3 de tu categoría
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Validated Friends Badge */}
          {validatedFriends > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200/50">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                  🤝
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-600">Red de Confianza</p>
                  <p className="text-lg font-black text-slate-800">
                    {validatedFriends} colega{validatedFriends > 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] text-slate-500">respaldan tu experiencia</p>
                </div>
              </div>
            </div>
          )}
          {/* Módulo de CV - Drag & Drop */}
          <div>
            <h3 className="text-sm font-black italic text-gray-800 mb-3">📄 Mi Currículum</h3>
            {!cvUrl && !cvFile ? (
              <div 
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-400 hover:bg-orange-50 transition cursor-pointer"
              >
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={onFileSelect}
                  className="hidden" 
                  id="cv-upload"
                />
                <label htmlFor="cv-upload" className="cursor-pointer">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  </div>
                  <p className="text-sm font-bold text-gray-700">Arrastra tu CV aquí</p>
                  <p className="text-xs text-gray-500 mt-1">PDF máximo 5MB</p>
                </label>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 truncate">{cvFilename || cvFile?.name}</p>
                  <p className="text-xs text-green-600 font-medium">✓ Subido correctamente</p>
                </div>
                <button 
                  onClick={handleDeleteCv}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
          </div>

          {/* Portafolio de Habilidades - Tags Toggleables */}
          <div>
            <h3 className="text-sm font-black italic text-gray-800 mb-3">🛠️ Mis Habilidades</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map(skill => (
                <button
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    skill.active 
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {skill.active ? '✓ ' : ''}{skill.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Haz clic para activar/desactivar habilidades</p>
          </div>

          {/* Video Showcase */}
          <div>
            <h3 className="text-sm font-black italic text-gray-800 mb-3">🎥 Video Currículum</h3>
            {!showcaseVideo ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-400 hover:bg-orange-50 transition cursor-pointer">
                <input 
                  type="file" 
                  accept="video/mp4,video/quicktime,video/avi" 
                  onChange={handleVideoSelect}
                  className="hidden" 
                  id="video-upload"
                  disabled={videoUploading}
                />
                <label htmlFor="video-upload" className={`cursor-pointer ${videoUploading ? 'opacity-50' : ''}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                    {videoUploading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-700">
                    {videoUploading ? 'Subiendo video...' : 'Sube tu video currículum'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">MP4/MOV/AVI máximo 30MB</p>
                  <p className="text-xs text-gray-400 mt-1">30 segundos para destacar tus servicios</p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <div className="bg-gray-900 rounded-xl overflow-hidden">
                  <video 
                    src={showcaseVideo}
                    controls
                    className="w-full aspect-video"
                    poster="/video-poster.jpg"
                  >
                    Tu navegador no soporta videos.
                  </video>
                </div>
                <button 
                  onClick={handleDeleteVideo}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition"
                  title="Eliminar video"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
          </div>

          {/* Botón Guardar */}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black italic py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
