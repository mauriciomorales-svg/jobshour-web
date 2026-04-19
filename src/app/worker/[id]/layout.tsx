import type { ReactNode } from 'react'

/** Ver `tienda/[workerId]/layout.tsx` — placeholder estático para export Capacitor. */
export function generateStaticParams() {
  return [{ id: '0' }]
}

export default function WorkerPublicLayout({ children }: { children: ReactNode }) {
  return children
}
