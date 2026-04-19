import { ImageResponse } from 'next/og'

export const alt = 'JobsHours · expertos cerca de ti'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a 0%, #115e59 42%, #ea580c 100%)',
          padding: 56,
          color: '#fff',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3 }}>JobsHours</div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              opacity: 0.96,
              maxWidth: 980,
              lineHeight: 1.28,
            }}
          >
            Encuentra expertos cerca de ti en segundos
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 28,
            opacity: 0.88,
            fontWeight: 600,
          }}
        >
          <span>jobshours.com</span>
          <span>Servicios verificados · Chile</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
