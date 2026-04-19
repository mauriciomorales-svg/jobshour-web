'use client'
import { feedbackCopy, surfaceCopy } from '@/lib/userFacingCopy'
import { uiTone } from '@/lib/uiTone'

import { useState, useRef } from 'react'
import { compressImageToWebP } from '@/lib/imageCompression'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userToken: string
  currentUser: {
    name: string
    email: string
    phone: string | null
    avatar: string | null
  }
}

export default function EditProfileModal({ isOpen, onClose, onSuccess, userToken, currentUser }: Props) {
  const [tab, setTab] = useState<'profile' | 'password'>('profile')
  const [formData, setFormData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone || '',
  })
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatar)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const compressed = await compressImageToWebP(file)
      const blob = new Blob([compressed], { type: 'image/webp' })
      const webpFile = new File([blob], 'avatar.webp', { type: 'image/webp' })
      
      setAvatarFile(webpFile)
      setAvatarPreview(URL.createObjectURL(blob))
    } catch (err) {
      setError('Error al procesar la imagen')
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Update profile data
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Error al actualizar perfil')
        setLoading(false)
        return
      }

      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData()
        formData.append('avatar', avatarFile)
        
        await fetch('/api/auth/upload-avatar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${userToken}` },
          body: formData,
        })
      }

      setSuccess('✅ Perfil actualizado correctamente')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      setError(feedbackCopy.networkError)
    }
    setLoading(false)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (passwordData.new_password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Error al cambiar contraseña')
        setLoading(false)
        return
      }

      setSuccess('✅ Contraseña actualizada correctamente')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err) {
      setError(feedbackCopy.networkError)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-[90%] max-w-lg mx-4 overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={uiTone.authHeader}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
          <button
            type="button"
            onClick={onClose}
            aria-label={surfaceCopy.close}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition z-10"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-white text-2xl font-black text-center">{surfaceCopy.editProfileTitle}</h3>
            <p className="text-white/80 text-sm text-center mt-1">{surfaceCopy.editProfileSubtitle}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`flex-1 py-3 text-sm font-bold transition ${
              tab === 'profile'
                ? 'text-amber-700 border-b-2 border-amber-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {surfaceCopy.profileTabLabel}
          </button>
          <button
            type="button"
            onClick={() => setTab('password')}
            className={`flex-1 py-3 text-sm font-bold transition ${
              tab === 'password'
                ? 'text-amber-700 border-b-2 border-amber-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {surfaceCopy.passwordTabLabel}
          </button>
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

          {success && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-4 animate-slide-up">
              <p className="text-teal-800 text-sm font-semibold flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {success}
              </p>
            </div>
          )}

          {/* Profile Tab */}
          {tab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4 animate-slide-up">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="relative">
                  <div className={`w-24 h-24 rounded-full overflow-hidden ${uiTone.avatarPlaceholderRing}`}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                        {currentUser.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={uiTone.avatarEditFab}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <p className="text-xs text-slate-500">{surfaceCopy.editProfileAvatarHint}</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className={`w-full px-4 py-3 border-2 border-slate-200 rounded-xl ${uiTone.inputFocusBrand}`}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className={`w-full px-4 py-3 border-2 border-slate-200 rounded-xl ${uiTone.inputFocusBrand}`}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+56912345678"
                  className={`w-full px-4 py-3 border-2 border-slate-200 rounded-xl ${uiTone.inputFocusBrand}`}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={uiTone.ctaFormSaveWide}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{surfaceCopy.saving}</span>
                  </div>
                ) : (
                  surfaceCopy.saveChanges
                )}
              </button>
            </form>
          )}

          {/* Password Tab */}
          {tab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4 animate-slide-up">
              <div className={`${uiTone.surfaceInfoAmber} mb-4`}>
                <p className="text-amber-950 text-xs font-semibold mb-1">🔒 Seguridad</p>
                <p className="text-amber-900 text-xs">
                  Tu contraseña debe tener al menos 8 caracteres. Usa una combinación de letras, números y símbolos.
                </p>
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  required
                  className={`w-full px-4 py-3 border-2 border-slate-200 rounded-xl ${uiTone.inputFocusBrand}`}
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  required
                  minLength={8}
                  className={`w-full px-4 py-3 border-2 border-slate-200 rounded-xl ${uiTone.inputFocusBrand}`}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  required
                  className={`w-full px-4 py-3 border-2 border-slate-200 rounded-xl ${uiTone.inputFocusBrand}`}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={uiTone.ctaFormSaveWide}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{surfaceCopy.passwordUpdating}</span>
                  </div>
                ) : (
                  surfaceCopy.passwordChangeCta
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
