'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface StoreCartItem {
  idproducto: number
  nombre: string
  precio: number
  imagen_url: string | null
  cantidad: number
  stock: number
  workerId: number
  storeName: string
}

interface StoreCartContextType {
  items: StoreCartItem[]
  addToCart: (product: Omit<StoreCartItem, 'cantidad'>) => void
  removeFromCart: (id: number) => void
  updateQuantity: (id: number, cantidad: number) => void
  clearCart: () => void
  total: number
  count: number
  workerId: number | null
}

const StoreCartContext = createContext<StoreCartContextType | undefined>(undefined)

export function StoreCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<StoreCartItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem('store_cart')
      if (saved) setItems(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    if (mounted) localStorage.setItem('store_cart', JSON.stringify(items))
  }, [items, mounted])

  const addToCart = (product: Omit<StoreCartItem, 'cantidad'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.idproducto === product.idproducto)
      if (existing) {
        return prev.map(i =>
          i.idproducto === product.idproducto
            ? { ...i, cantidad: Math.min(i.cantidad + 1, product.stock) }
            : i
        )
      }
      return [...prev, { ...product, cantidad: 1 }]
    })
  }

  const removeFromCart = (id: number) => setItems(prev => prev.filter(i => i.idproducto !== id))

  const updateQuantity = (id: number, cantidad: number) => {
    if (cantidad <= 0) { removeFromCart(id); return }
    setItems(prev => prev.map(i => i.idproducto === id ? { ...i, cantidad: Math.min(cantidad, i.stock) } : i))
  }

  const clearCart = () => setItems([])

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)
  const count = items.reduce((sum, i) => sum + i.cantidad, 0)
  const workerId = items.length > 0 ? items[0].workerId : null

  return (
    <StoreCartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total, count, workerId }}>
      {children}
    </StoreCartContext.Provider>
  )
}

export function useStoreCart() {
  const ctx = useContext(StoreCartContext)
  if (!ctx) throw new Error('useStoreCart must be used within StoreCartProvider')
  return ctx
}
