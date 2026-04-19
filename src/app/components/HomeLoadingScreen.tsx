'use client'

export function HomeLoadingScreen() {
  return (
    <div className="absolute inset-0 z-[150] bg-slate-950 flex flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-7xl font-black tracking-tight leading-none mb-5 flex items-center justify-center gap-2">
          <span className="text-gray-100">Jobs</span>
          <span className="text-teal-400 flex items-center">
            <span>H</span>
            <span className="relative inline-flex items-center justify-center w-16 h-16 mx-1">
              <span className="absolute inset-0 rounded-full border-4 border-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.35)]" />
              <span className="clock-hand-long" style={{
                position: 'absolute', bottom: '50%', left: '50%',
                width: '3px', height: '44%',
                background: 'linear-gradient(to top, #5eead4, #fbbf24)',
                borderRadius: '2px', transformOrigin: 'bottom center',
              }} />
              <span className="clock-hand-short" style={{
                position: 'absolute', bottom: '50%', left: '50%',
                width: '3px', height: '30%',
                background: '#f1f5f9',
                borderRadius: '2px', transformOrigin: 'bottom center',
              }} />
              <span className="w-3 h-3 rounded-full bg-amber-400 z-10 shadow-md" style={{ position: 'relative' }} />
            </span>
            <span>urs</span>
          </span>
        </h1>
        <p className="text-xl font-medium text-amber-300">Servicios ahora, cerca de ti</p>
      </div>
      <div className="mt-10 flex items-center gap-2">
        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
