'use client'

import { useMemo } from 'react'

export interface ProfileStep {
  id: string
  label: string
  /** Descripción breve de qué agregar */
  hint: string
  /** ¿Está completado? */
  done: boolean
  /** Peso relativo en % (todos deben sumar 100) */
  weight: number
}

export interface ProfileCompleteness {
  score: number          // 0-100
  steps: ProfileStep[]
  pending: ProfileStep[] // pasos sin completar, ordenados por peso desc
  isComplete: boolean
}

/**
 * Calcula el nivel de completitud del perfil de un worker
 * a partir de los datos que ya carga `WorkerProfileHub`.
 *
 * `workerData` puede ser null mientras carga.
 */
export function useProfileCompleteness(
  workerData: any,
  selectedSkills: number[],
  experiences: any[],
): ProfileCompleteness {
  return useMemo(() => {
    const steps: ProfileStep[] = [
      {
        id: 'avatar',
        label: 'Foto de perfil',
        hint: 'Agrega tu foto para generar confianza',
        done: !!(workerData?.user?.avatar_url || workerData?.avatar_url),
        weight: 15,
      },
      {
        id: 'skills',
        label: 'Al menos 1 categoría',
        hint: 'Selecciona en qué servicios trabajas',
        done: selectedSkills.length > 0,
        weight: 25,
      },
      {
        id: 'bio',
        label: 'Bio / Presentación corta',
        hint: 'Cuéntale a los clientes quién eres (mínimo 20 caracteres)',
        done: typeof workerData?.bio_tarjeta === 'string' && workerData.bio_tarjeta.trim().length >= 20,
        weight: 20,
      },
      {
        id: 'experience',
        label: 'Experiencia o certificación',
        hint: 'Añade al menos un trabajo o logro anterior',
        done: experiences.length > 0,
        weight: 15,
      },
      {
        id: 'social',
        label: 'Link de red social o portfolio',
        hint: 'TikTok, Instagram o LinkedIn aumentan la confianza',
        done: Array.isArray(workerData?.social_links) && workerData.social_links.length > 0,
        weight: 10,
      },
      {
        id: 'cv_or_video',
        label: 'CV o video presentación',
        hint: 'Sube tu CV o graba un video corto',
        done: !!(workerData?.cv_url || workerData?.video_cv_url),
        weight: 15,
      },
    ]

    const totalWeight = steps.reduce((acc, s) => acc + s.weight, 0)
    const doneWeight = steps.filter((s) => s.done).reduce((acc, s) => acc + s.weight, 0)
    const score = Math.round((doneWeight / totalWeight) * 100)
    const pending = steps
      .filter((s) => !s.done)
      .sort((a, b) => b.weight - a.weight)

    return {
      score,
      steps,
      pending,
      isComplete: score === 100,
    }
  }, [workerData, selectedSkills, experiences])
}
