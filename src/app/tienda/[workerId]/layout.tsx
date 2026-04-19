import type { ReactNode } from 'react'

/**
 * Placeholder para `output: export` / build Android (Capacitor).
 * Las rutas reales siguen resolviéndose en cliente; URL remota en capacitor.config.
 */
export function generateStaticParams() {
  return [{ workerId: '0' }]
}

export default function TiendaWorkerLayout({ children }: { children: ReactNode }) {
  return children
}
