'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SLIDES = [
  {
    emoji: '🗺️',
    title: 'Encuentra expertos cerca',
    body: 'El mapa muestra trabajadores disponibles en tiempo real. Toca cualquier pin para ver su perfil y solicitar el servicio.',
    color: 'from-teal-500 to-emerald-600',
  },
  {
    emoji: '📋',
    title: 'Publica lo que necesitas',
    body: 'Describe tu necesidad, fija un precio y en minutos recibirás respuestas de trabajadores cercanos.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    emoji: '💬',
    title: 'Coordina por chat',
    body: 'Habla directamente con el trabajador, comparte fotos y llega a un acuerdo antes de comenzar.',
    color: 'from-blue-500 to-indigo-600',
  },
]

interface Props {
  onDone: () => void
}

export default function OnboardingSlides({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const slide = SLIDES[step]

  const next = () => {
    if (step < SLIDES.length - 1) setStep(step + 1)
    else onDone()
  }

  return (
    <div className="fixed inset-0 z-[500] bg-slate-950 flex flex-col items-center justify-between p-8 pb-12">
      {/* Skip */}
      <div className="w-full flex justify-end">
        <button onClick={onDone} className="text-slate-500 text-sm font-semibold hover:text-slate-300 transition">
          Saltar
        </button>
      </div>

      {/* Slide */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center gap-6 flex-1 justify-center"
        >
          <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${slide.color} flex items-center justify-center shadow-2xl`}>
            <span className="text-6xl">{slide.emoji}</span>
          </div>
          <div>
            <h2 className="text-white text-2xl font-black mb-3">{slide.title}</h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-xs">{slide.body}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots + Button */}
      <div className="w-full flex flex-col items-center gap-6">
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step ? 'w-6 h-2 bg-teal-400' : 'w-2 h-2 bg-slate-700'
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className={`w-full max-w-xs py-4 rounded-2xl font-black text-white text-base bg-gradient-to-r ${slide.color} shadow-lg active:scale-95 transition`}
        >
          {step < SLIDES.length - 1 ? 'Siguiente →' : '¡Empezar!'}
        </button>
      </div>
    </div>
  )
}
