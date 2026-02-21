'use client'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
}

export default function Logo({ size = 'lg', showTagline = true }: Props) {
  const sizes = {
    sm: { text: 'text-2xl', clock: 'h-4 w-4 -translate-y-[4px]', border: 'border-[2px]', dot: 'h-1 w-1', needle: 'w-0.5', tagline: 'text-[8px] tracking-[0.4em]', gap: 'mx-0.5' },
    md: { text: 'text-5xl', clock: 'h-8 w-8 -translate-y-[9px]', border: 'border-[3px]', dot: 'h-1.5 w-1.5', needle: 'w-0.5', tagline: 'text-xs tracking-[0.5em]', gap: 'mx-1' },
    lg: { text: 'text-7xl md:text-9xl', clock: 'h-10 w-10 md:h-14 md:w-14 -translate-y-[12px] md:-translate-y-[18px]', border: 'border-[4px]', dot: 'h-2 w-2', needle: 'w-1', tagline: 'text-sm md:text-lg tracking-[0.6em]', gap: 'mx-1' },
  }
  const s = sizes[size]

  const Clock = ({ speed }: { speed: string }) => (
    <div className={`relative ${s.gap} inline-flex ${s.clock} items-center justify-center`}>
      <div className={`absolute inset-0 rounded-full ${s.border} border-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.4)]`}></div>
      <div className={`absolute h-1/2 ${s.needle} origin-bottom rounded-full bg-gradient-to-t from-teal-400 to-amber-300`} style={{ bottom: '50%', animation: `spin ${speed} linear infinite` }}></div>
      <div className={`z-10 ${s.dot} rounded-full bg-amber-400`}></div>
    </div>
  )

  if (size === 'lg') {
    return (
      <div className="flex flex-col items-center">
        <h1 className="flex items-center justify-center font-black tracking-tight text-7xl md:text-9xl leading-none gap-2">
          <span className="text-gray-100">Jobs</span>
          <span className="text-teal-400 flex items-center">
            <span>H</span>
            {/* Reloj grande animado como la "O" */}
            <span className="relative inline-flex items-center justify-center w-14 h-14 md:w-20 md:h-20 mx-1">
              <span className="absolute inset-0 rounded-full border-4 border-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.35)]"></span>
              {/* Manecilla larga — gira lento */}
              <span
                className="absolute bottom-1/2 left-1/2 w-[3px] md:w-1 rounded-full origin-bottom bg-gradient-to-t from-teal-300 to-amber-300"
                style={{ height: '42%', transform: 'translateX(-50%)', animation: 'spin 6s linear infinite' }}
              ></span>
              {/* Manecilla corta — gira más lento */}
              <span
                className="absolute bottom-1/2 left-1/2 w-[3px] md:w-1 rounded-full origin-bottom bg-gray-100"
                style={{ height: '28%', transform: 'translateX(-50%)', animation: 'spin 72s linear infinite' }}
              ></span>
              {/* Centro */}
              <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-amber-400 z-10 shadow-md"></span>
            </span>
            <span>urs</span>
          </span>
        </h1>
        {showTagline && (
          <p className="mt-5 text-xl md:text-3xl font-medium text-amber-300 tracking-wide">
            Servicios ahora, cerca de ti
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className={`flex items-baseline justify-center font-black tracking-tighter ${s.text}`}>
        <span className="text-white">J</span>
        <Clock speed="3s" />
        <span className="text-white">b</span>
        <span className="text-teal-400">s</span>
        <span className="mx-2"></span>
        <span className="bg-gradient-to-br from-teal-300 to-teal-500 bg-clip-text text-transparent">H</span>
        <Clock speed="5s" />
        <span className="bg-gradient-to-br from-teal-300 to-teal-500 bg-clip-text text-transparent">u</span>
        <span className="bg-gradient-to-br from-teal-300 to-teal-500 bg-clip-text text-transparent">r</span>
        <span className="bg-gradient-to-br from-teal-300 to-teal-500 bg-clip-text text-transparent">s</span>
      </h1>
      {showTagline && (
        <p className={`mt-4 font-bold ${s.tagline} text-amber-400 uppercase`}>
          Servicios <span className="text-white">ahora</span>
        </p>
      )}
    </div>
  )
}
