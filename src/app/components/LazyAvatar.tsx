'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  src: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  fallbackText?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-20 h-20 text-xl',
}

export default function LazyAvatar({ src, alt, size = 'md', className = '', fallbackText }: Props) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!imgRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: '50px' }
    )

    observer.observe(imgRef.current)

    return () => observer.disconnect()
  }, [])

  const sizeClass = sizeClasses[size]
  const initials = fallbackText || alt.charAt(0).toUpperCase()

  return (
    <div
      ref={imgRef}
      className={`${sizeClass} rounded-full overflow-hidden relative ${className}`}
    >
      {/* Shimmer loading state */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer" />
      )}

      {/* Fallback / Error state */}
      {(error || !src) && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
          <span className="text-white font-bold">{initials}</span>
        </div>
      )}

      {/* Actual image */}
      {src && isInView && !error && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      )}
    </div>
  )
}
