'use client'

import { Info } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import { surfaceCopy } from '@/lib/userFacingCopy'
import StorePublicHostPanel from '@/app/components/StorePublicHostPanel'

export type TiendaCheckoutMode = 'purchase' | 'quote'

type Categoria = { idcategoria: number; nombre: string }

type Props = {
  workerId: number
  storeUrl: string
  categorias: Categoria[]
  ownerToolsOpen: boolean
  onToggleOwnerTools: () => void
  onQuickPublish: () => void
  onAdvancedMode: () => void
  showAddStoreCategory: boolean
  onShowAddStoreCategory: (show: boolean) => void
  newStoreCategory: string
  onNewStoreCategoryChange: (value: string) => void
  savingStoreCategory: boolean
  onAddStoreCategory: () => void
  checkoutMode: TiendaCheckoutMode
  onCheckoutModeChange: (mode: TiendaCheckoutMode) => void
  tab: 'catalogo' | 'stats'
  onTabCatalogo: () => void
  onTabStats: () => void
}

export default function TiendaOwnerPanel({
  workerId,
  storeUrl,
  categorias,
  ownerToolsOpen,
  onToggleOwnerTools,
  onQuickPublish,
  onAdvancedMode,
  showAddStoreCategory,
  onShowAddStoreCategory,
  newStoreCategory,
  onNewStoreCategoryChange,
  savingStoreCategory,
  onAddStoreCategory,
  checkoutMode,
  onCheckoutModeChange,
  tab,
  onTabCatalogo,
  onTabStats,
}: Props) {
  return (
    <div className="rounded-xl border border-orange-200 bg-white max-w-2xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-orange-50 border-b border-orange-100">
        <p className="text-xs font-bold text-orange-800">Panel de vendedor</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onQuickPublish}
            className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 px-3 py-1.5 rounded-lg transition"
          >
            + Publicar producto
          </button>
          <button
            type="button"
            onClick={onToggleOwnerTools}
            className="text-xs font-bold text-orange-700 bg-white border border-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition"
          >
            {ownerToolsOpen ? 'Ocultar opciones' : 'Más opciones'}
          </button>
        </div>
      </div>
      {ownerToolsOpen && (
        <div className="p-3 space-y-3 border-b border-orange-100">
          <div className="rounded-xl border border-orange-200 bg-orange-50/90 p-3">
            <p className="text-xs font-bold text-orange-700">Categorías de tienda</p>
            <p className="text-[11px] text-orange-700/80 mt-1">
              Estas categorías organizan tus productos. Tus categorías de servicios se configuran en Mi Perfil.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {categorias.map((c) => (
                <span
                  key={c.idcategoria}
                  className="px-2 py-0.5 bg-white text-orange-700 border border-orange-200 rounded-full text-xs font-semibold"
                >
                  {c.nombre}
                </span>
              ))}
              {categorias.length === 0 && (
                <span className="text-xs text-orange-700/70">Sin categorías de tienda aún.</span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              {!showAddStoreCategory ? (
                <button
                  type="button"
                  onClick={() => onShowAddStoreCategory(true)}
                  className="text-xs font-bold text-orange-700 bg-white border border-orange-300 px-2.5 py-1 rounded-lg hover:bg-orange-100 transition"
                >
                  + Agregar categoría de tienda
                </button>
              ) : (
                <>
                  <input
                    value={newStoreCategory}
                    onChange={(e) => onNewStoreCategoryChange(e.target.value)}
                    placeholder="Ej: Herramientas, Usados, Ferretería..."
                    className="flex-1 min-w-[240px] bg-white border border-orange-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <button
                    type="button"
                    onClick={onAddStoreCategory}
                    disabled={savingStoreCategory || !newStoreCategory.trim()}
                    className="text-xs font-bold text-white bg-orange-500 px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {savingStoreCategory ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onShowAddStoreCategory(false)
                      onNewStoreCategoryChange('')
                    }}
                    className="text-xs font-bold text-orange-700 bg-white border border-orange-300 px-2.5 py-1.5 rounded-lg"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="text-xs font-bold text-orange-500 px-1">✏️ Toca un producto para editarlo</p>
          <StorePublicHostPanel storeUrl={storeUrl} />
          <div className="space-y-2">
            <button
              type="button"
              onClick={onAdvancedMode}
              className="text-xs font-bold text-teal-700 bg-white border border-teal-300 px-3 py-1.5 rounded-lg transition hover:bg-teal-100"
            >
              Modo avanzado (formulario completo)
            </button>
            <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1 w-fit">
              <button
                type="button"
                onClick={() => {
                  onCheckoutModeChange('purchase')
                  trackEvent('tienda_owner_mode', { mode: 'purchase', worker_id: workerId })
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${checkoutMode === 'purchase' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Catálogo normal
              </button>
              <button
                type="button"
                onClick={() => {
                  onCheckoutModeChange('quote')
                  trackEvent('tienda_owner_mode', { mode: 'quote', worker_id: workerId })
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${checkoutMode === 'quote' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                🧺 {surfaceCopy.tiendaModeLoteListo}
              </button>
            </div>
            {checkoutMode === 'quote' && (
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-left text-xs text-amber-950 leading-relaxed max-w-lg">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
                <p>
                  <span className="font-bold">{surfaceCopy.tiendaLoteListoHintTitle}:</span>{' '}
                  {surfaceCopy.tiendaLoteListoHintBody}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="px-3 py-2.5">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            type="button"
            onClick={onTabCatalogo}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${tab === 'catalogo' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            🛍️ Catálogo
          </button>
          <button
            type="button"
            onClick={onTabStats}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${tab === 'stats' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📊 Estadísticas
          </button>
        </div>
      </div>
    </div>
  )
}
