import type { ReactNode } from 'react'

/** Ver `tienda/[workerId]/layout.tsx` — placeholder estático para export Capacitor. */
export function generateStaticParams() {
  return [{ token: '_' }]
}

export default function CotizacionLayout({ children }: { children: ReactNode }) {
  return children
}
