'use client'

import Link from 'next/link'
import { surfaceCopy } from '@/lib/userFacingCopy'

type Variant = 'dark' | 'light'

const tone: Record<Variant, { nav: string; link: string }> = {
  dark: {
    nav: 'text-slate-400',
    link: 'text-teal-400 hover:text-teal-300 underline font-semibold',
  },
  light: {
    nav: 'text-slate-600',
    link: 'text-teal-700 hover:text-teal-800 underline font-semibold',
  },
}

/** Enlaces a términos, privacidad y correo de soporte (MVP confianza). */
export default function LegalSupportLinks({
  className = '',
  variant = 'light',
  showHelpLink = true,
}: {
  className?: string
  variant?: Variant
  /** En /ayuda no hace falta enlazar de nuevo al centro de ayuda */
  showHelpLink?: boolean
}) {
  const t = tone[variant]
  const mail = surfaceCopy.supportContactEmail
  return (
    <nav
      className={`inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-1 ${t.nav} ${className}`}
      aria-label={surfaceCopy.mvpLegalNavAriaLabel}
    >
      {showHelpLink ? (
        <>
          <Link href="/ayuda" className={t.link}>
            {surfaceCopy.mvpHelpCenter}
          </Link>
          <span className="mx-0.5 opacity-50" aria-hidden>
            ·
          </span>
        </>
      ) : null}
      <Link href="/terminos" className={t.link}>
        {surfaceCopy.mvpLegalTerms}
      </Link>
      <span className="mx-1.5 opacity-50" aria-hidden>
        ·
      </span>
      <Link href="/privacidad" className={t.link}>
        {surfaceCopy.mvpLegalPrivacy}
      </Link>
      <span className="mx-1.5 opacity-50" aria-hidden>
        ·
      </span>
      <a href={`mailto:${mail}`} className={t.link}>
        {surfaceCopy.mvpLegalSupportMailto}
      </a>
    </nav>
  )
}
