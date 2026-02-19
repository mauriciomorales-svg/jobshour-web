'use client'

import { useState, useEffect } from 'react'

interface Category {
  id: number
  slug: string
  name: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
}

const ICON_OPTIONS = [
  { value: 'wrench', label: '🔧 Herramientas' },
  { value: 'zap', label: '⚡ Electricidad' },
  { value: 'paintbrush', label: '🎨 Pintura' },
  { value: 'sparkles', label: '🧹 Limpieza' },
  { value: 'hammer', label: '🪵 Carpintería' },
  { value: 'leaf', label: '🌿 Jardinería' },
  { value: 'key', label: '🔑 Cerrajería' },
  { value: 'building', label: '🧱 Construcción' },
  { value: 'scissors', label: '🧵 Costura' },
  { value: 'paw-print', label: '🐾 Mascotas' },
  { value: 'shopping-bag', label: '🛍️ Compras' },
  { value: 'truck', label: '🚚 Transporte' },
  { value: 'package', label: '📦 Recados' },
]

export default function CategoryManagement({ onClose }: { onClose: () => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Formulario
  const [formData, setFormData] = useState({
    slug: '',
    display_name: '',
    icon: 'wrench',
    color: '#3b82f6',
    sort_order: 0,
    is_active: true,
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const res = await fetch('/api/v1/categories/all', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (data.status === 'success') {
        setCategories(data.data)
      }
    } catch (err) {
      console.error('Error cargando categorías:', err)
      setError('Error al cargar categorías')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const url = editingId 
        ? `/api/v1/categories/${editingId}`
        : '/api/v1/categories'
      
      const method = editingId ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: formData.slug,
          display_name: formData.display_name,
          icon: formData.icon,
          color: formData.color,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        }),
      })

      const data = await res.json()
      if (res.ok && data.status === 'success') {
        await loadCategories()
        setShowAddForm(false)
        setEditingId(null)
        setFormData({
          slug: '',
          display_name: '',
          icon: 'wrench',
          color: '#3b82f6',
          sort_order: 0,
          is_active: true,
        })
      } else {
        setError(data.message || 'Error al guardar categoría')
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id)
    setFormData({
      slug: cat.slug,
      display_name: cat.name,
      icon: cat.icon,
      color: cat.color,
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar esta categoría?')) return

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const res = await fetch(`/api/v1/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await res.json()
      if (res.ok && data.status === 'success') {
        await loadCategories()
      } else {
        alert(data.message || 'Error al eliminar categoría')
      }
    } catch (err) {
      alert('Error de conexión')
    }
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingId(null)
    setFormData({
      slug: '',
      display_name: '',
      icon: 'wrench',
      color: '#3b82f6',
      sort_order: 0,
      is_active: true,
    })
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6">
          <p>Cargando categorías...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Gestión de Categorías</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Botón Agregar */}
          {!showAddForm && (
            <button
              onClick={() => {
                setShowAddForm(true)
                setEditingId(null)
                setFormData({
                  slug: '',
                  display_name: '',
                  icon: 'wrench',
                  color: '#3b82f6',
                  sort_order: categories.length,
                  is_active: true,
                })
              }}
              className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold"
            >
              + Agregar Categoría
            </button>
          )}

          {/* Formulario */}
          {showAddForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-bold mb-4">
                {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Slug (URL)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="ej: gasfiteria"
                    disabled={!!editingId}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="ej: Gasfitería"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Icono</label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {ICON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-16 h-10 border rounded"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-lg"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Orden</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Activa</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.slug || !formData.display_name}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de Categorías */}
          <div className="space-y-2">
            {categories.map(cat => (
              <div
                key={cat.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  !cat.is_active ? 'bg-gray-100 opacity-60' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ICON_OPTIONS.find(i => i.value === cat.icon)?.label.split(' ')[0] || '📌'}</span>
                  <div>
                    <div className="font-bold">{cat.name}</div>
                    <div className="text-sm text-gray-500">{cat.slug}</div>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Orden: {cat.sort_order}</span>
                  {!cat.is_active && (
                    <span className="text-xs bg-gray-300 px-2 py-1 rounded">Inactiva</span>
                  )}
                  <button
                    onClick={() => handleEdit(cat)}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
