'use client'

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="relative w-40 h-40">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-900/30 to-teal-900/30 animate-pulse-slow"></div>
        <div className="w-36 h-36 rounded-full border-8 border-teal-400 border-t-transparent relative mx-auto">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 bg-amber-400 rounded-full shadow-lg"></div>
          </div>
          <div className="absolute top-1/2 left-1/2 w-2 h-20 bg-gradient-to-t from-teal-300 to-amber-300 origin-bottom rounded-full transform -translate-x-1/2 -translate-y-full animate-spin-slow"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 6s linear infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
