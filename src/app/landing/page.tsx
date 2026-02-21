'use client'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-6 pt-16 pb-20 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(45,212,191,0.15)_0%,_transparent_70%)]" />
        <div className="relative max-w-xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-2xl shadow-teal-500/30">
              <svg width="56" height="56" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="512" cy="512" r="480" fill="white" fillOpacity="0.15"/>
                <circle cx="512" cy="512" r="320" fill="none" stroke="white" strokeWidth="48" strokeDasharray="80 40"/>
                <circle cx="512" cy="512" r="60" fill="white"/>
                <line x1="512" y1="512" x2="512" y2="220" stroke="#fbbf24" strokeWidth="44" strokeLinecap="round"/>
                <line x1="512" y1="512" x2="680" y2="420" stroke="white" strokeWidth="32" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-3">
            <span className="text-teal-400">Jobs</span>Hour
          </h1>
          <p className="text-xl text-slate-300 font-semibold mb-2">Encuentra trabajo cerca de ti</p>
          <p className="text-slate-400 text-base mb-8 leading-relaxed">
            Conectamos a personas que necesitan un servicio con trabajadores de su misma comunidad, en tiempo real y sin intermediarios.
          </p>

          {/* Botón descarga */}
          <a
            href="/jobshour.apk"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-xl shadow-teal-500/30 transition active:scale-95"
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341a.75.75 0 01-.75.75H7.227a.75.75 0 010-1.5h9.546a.75.75 0 01.75.75zM6.17 6.232l1.521 1.521A5.25 5.25 0 0012 6.75a5.25 5.25 0 004.309 2.003l1.521-1.521a.75.75 0 011.06 1.06l-1.5 1.5a.75.75 0 01-.53.22A6.75 6.75 0 0112 8.25a6.75 6.75 0 01-4.86 2.762.75.75 0 01-.53-.22l-1.5-1.5a.75.75 0 011.06-1.06zM12 2.25a.75.75 0 01.75.75v6.19l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l1.72 1.72V3a.75.75 0 01.75-.75z"/></svg>
            Descargar para Android
          </a>
          <p className="text-slate-500 text-xs mt-3">Gratis · Sin registro previo · Android 8+</p>
        </div>
      </section>

      {/* PARA QUIÉN ES */}
      <section className="px-6 py-14 max-w-2xl mx-auto">
        <h2 className="text-2xl font-black text-center mb-8">¿Para quién es JobsHour?</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { emoji: '🔨', title: 'Maestros y técnicos', desc: 'Gasfiteros, electricistas, pintores, carpinteros' },
            { emoji: '🧹', title: 'Aseo y limpieza', desc: 'Limpieza de hogares, oficinas y locales' },
            { emoji: '🚚', title: 'Fletes y mudanzas', desc: 'Traslados, despachos y delivery local' },
            { emoji: '🌿', title: 'Jardín y campo', desc: 'Podas, siembras, mantención de terrenos' },
            { emoji: '📦', title: 'Mandados', desc: 'Compras en tiendas, recados y encargos' },
            { emoji: '🚗', title: 'Viajes compartidos', desc: 'Llevar o traer personas entre comunas' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
              <div className="text-3xl mb-2">{emoji}</div>
              <p className="font-black text-sm text-white">{title}</p>
              <p className="text-xs text-slate-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="bg-slate-900/50 px-6 py-14">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-8">¿Cómo funciona?</h2>
          <div className="space-y-5">
            {[
              { n: '1', icon: '📍', title: 'Abre la app y activa tu ubicación', desc: 'El mapa muestra trabajadores disponibles cerca de ti en tiempo real.' },
              { n: '2', icon: '👆', title: 'Toca un trabajador y solicita', desc: 'Envía una solicitud con descripción, foto de referencia y urgencia.' },
              { n: '3', icon: '⚡', title: 'El trabajador responde en minutos', desc: 'Si acepta, ves su teléfono y coordinas directamente.' },
              { n: '4', icon: '⭐', title: 'Califica el servicio', desc: 'Tu opinión ayuda a la comunidad a elegir mejor.' },
            ].map(({ n, icon, title, desc }) => (
              <div key={n} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-black text-sm shrink-0">{n}</div>
                <div>
                  <p className="font-black text-white text-sm">{icon} {title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARA TRABAJADORES */}
      <section className="px-6 py-14 max-w-2xl mx-auto">
        <h2 className="text-2xl font-black text-center mb-2">¿Eres trabajador?</h2>
        <p className="text-slate-400 text-center text-sm mb-8">Aparece en el mapa y recibe solicitudes de clientes cercanos</p>
        <div className="bg-gradient-to-br from-teal-900/40 to-slate-800 border border-teal-500/20 rounded-2xl p-6 space-y-4">
          {[
            '✅ Regístrate con Google en segundos',
            '✅ Elige tus especialidades (puedes tener varias)',
            '✅ Activa tu disponibilidad cuando quieras trabajar',
            '✅ Apareces en el mapa para clientes cercanos',
            '✅ Sin comisiones — cobras directo al cliente',
            '✅ Sube tu video currículum para generar más confianza',
          ].map(f => (
            <p key={f} className="text-sm text-slate-200">{f}</p>
          ))}
        </div>
      </section>

      {/* ZONAS */}
      <section className="bg-slate-900/50 px-6 py-14">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-black mb-2">Disponible en tu zona</h2>
          <p className="text-slate-400 text-sm mb-6">Actualmente operando en la región de La Araucanía y Biobío</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Renaico', 'Angol', 'Los Ángeles', 'Nacimiento', 'Tijeral', 'Temuco', 'Collipulli', 'Victoria'].map(c => (
              <span key={c} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-sm text-slate-300 font-semibold">📍 {c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-black mb-3">Empieza ahora</h2>
          <p className="text-slate-400 mb-8">Descarga la app gratis y únete a la comunidad de trabajadores de tu zona</p>
          <a
            href="/jobshour.apk"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-xl shadow-teal-500/30 transition active:scale-95 mb-4"
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341a.75.75 0 01-.75.75H7.227a.75.75 0 010-1.5h9.546a.75.75 0 01.75.75zM6.17 6.232l1.521 1.521A5.25 5.25 0 0012 6.75a5.25 5.25 0 004.309 2.003l1.521-1.521a.75.75 0 011.06 1.06l-1.5 1.5a.75.75 0 01-.53.22A6.75 6.75 0 0112 8.25a6.75 6.75 0 01-4.86 2.762.75.75 0 01-.53-.22l-1.5-1.5a.75.75 0 011.06-1.06zM12 2.25a.75.75 0 01.75.75v6.19l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l1.72 1.72V3a.75.75 0 01.75-.75z"/></svg>
            Descargar para Android
          </a>
          <br />
          <a href="https://jobshour.dondemorales.cl" className="text-teal-400 text-sm hover:underline">
            O usa la versión web →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-slate-500 text-xs">
        <p className="font-black text-slate-400 text-base mb-1"><span className="text-teal-400">Jobs</span>Hour</p>
        <p>Conectando comunidades · Renaico, La Araucanía, Chile</p>
        <p className="mt-2">© 2026 JobsHour · <a href="https://jobshour.dondemorales.cl/privacidad" className="hover:text-teal-400">Privacidad</a> · <a href="https://jobshour.dondemorales.cl/terminos" className="hover:text-teal-400">Términos</a></p>
      </footer>

    </div>
  )
}
