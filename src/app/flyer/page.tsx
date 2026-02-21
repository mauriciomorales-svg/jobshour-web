'use client'
import { QRCodeSVG } from 'qrcode.react'

const LANDING_URL = 'https://jobshour.dondemorales.cl/landing'

export default function FlyerPage() {

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #1e293b; font-family: 'Inter', sans-serif; }
        .flyer {
          width: 216mm; min-height: 279mm;
          background: linear-gradient(160deg, #0f172a 0%, #0f2a2a 50%, #0f172a 100%);
          color: white; display: flex; flex-direction: column;
          margin: 0 auto; position: relative; overflow: hidden;
        }
        .header { padding: 40px 40px 30px; display: flex; align-items: center; gap: 20px; border-bottom: 1px solid rgba(45,212,191,0.2); }
        .logo-box { width: 72px; height: 72px; background: linear-gradient(135deg,#2dd4bf,#14b8a6); border-radius: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 8px 32px rgba(45,212,191,0.3); }
        .brand { flex: 1; }
        .brand h1 { font-size: 42px; font-weight: 900; letter-spacing: -1px; line-height: 1; }
        .brand h1 span { color: #2dd4bf; }
        .brand p { font-size: 13px; color: #94a3b8; margin-top: 4px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
        .beta { background: rgba(245,158,11,0.15); border: 1.5px solid rgba(245,158,11,0.5); color: #fbbf24; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 20px; }
        .hero { padding: 36px 40px 24px; }
        .hero h2 { font-size: 36px; font-weight: 900; line-height: 1.15; margin-bottom: 14px; }
        .hero h2 em { color: #2dd4bf; font-style: normal; }
        .hero p { font-size: 16px; color: #cbd5e1; line-height: 1.6; }
        .beta-box { margin: 0 40px 20px; background: rgba(245,158,11,0.08); border: 1.5px solid rgba(245,158,11,0.3); border-radius: 12px; padding: 14px 18px; }
        .beta-box p { font-size: 13px; color: #fcd34d; line-height: 1.5; }
        .servicios { padding: 0 40px 24px; }
        .servicios h3 { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip { background: rgba(45,212,191,0.08); border: 1.5px solid rgba(45,212,191,0.2); border-radius: 50px; padding: 7px 14px; font-size: 14px; font-weight: 700; color: #e2e8f0; }
        .workers { margin: 0 40px 24px; background: rgba(45,212,191,0.06); border: 1.5px solid rgba(45,212,191,0.2); border-radius: 16px; padding: 20px 22px; }
        .workers h3 { font-size: 16px; font-weight: 900; color: #2dd4bf; margin-bottom: 10px; }
        .workers li { font-size: 14px; color: #cbd5e1; list-style: none; padding: 4px 0; }
        .workers li::before { content: '✓ '; color: #2dd4bf; font-weight: 900; }
        .qr-section { margin: 0 40px 24px; display: flex; align-items: center; gap: 24px; background: white; border-radius: 20px; padding: 22px 26px; }
        .qr-text h3 { font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 6px; }
        .qr-text p { font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 8px; }
        .qr-text .url { font-size: 11px; color: #14b8a6; font-weight: 700; }
        .footer { margin-top: auto; padding: 18px 40px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; }
        .footer p { font-size: 11px; color: #475569; }
        .footer .zona { font-size: 11px; color: #2dd4bf; font-weight: 700; }
        .print-btn { position: fixed; bottom: 24px; right: 24px; background: #2dd4bf; color: #0f172a; font-weight: 900; font-size: 15px; padding: 14px 28px; border-radius: 50px; border: none; cursor: pointer; box-shadow: 0 8px 24px rgba(45,212,191,0.4); z-index: 100; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body { background: #0f172a !important; margin: 0; }
          .print-btn { display: none !important; }
          .flyer { width: 216mm; min-height: 279mm; margin: 0; }
          @page { size: letter; margin: 0; }
        }
      `}</style>

      <div className="flyer">
        <div className="header">
          <div className="logo-box">
            <svg width="44" height="44" viewBox="0 0 1024 1024" fill="none">
              <circle cx="512" cy="512" r="480" fill="white" fillOpacity="0.15"/>
              <circle cx="512" cy="512" r="320" fill="none" stroke="white" strokeWidth="48" strokeDasharray="80 40"/>
              <circle cx="512" cy="512" r="60" fill="white"/>
              <line x1="512" y1="512" x2="512" y2="220" stroke="#fbbf24" strokeWidth="44" strokeLinecap="round"/>
              <line x1="512" y1="512" x2="680" y2="420" stroke="white" strokeWidth="32" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="brand">
            <h1><span>Jobs</span>Hour</h1>
            <p>Trabajo local · En tu comunidad</p>
          </div>
          <div className="beta">🚧 VERSIÓN BETA</div>
        </div>

        <div className="hero">
          <h2>¿Necesitas ayuda<br/>en tu casa o negocio?<br/><em>Aquí está la solución.</em></h2>
          <p>Encuentra gasfiteros, electricistas, fleteros y más — personas de tu misma zona, disponibles ahora mismo. Sin llamadas, sin esperas.</p>
        </div>

        <div className="beta-box">
          <p>⚠️ <strong>Aplicación en versión inicial (Beta)</strong> — Estamos en etapa de pruebas en Renaico, Angol y Los Ángeles. Puede haber pocos trabajadores disponibles por ahora, eso cambiará pronto. ¡Tu participación ayuda a crecer!</p>
        </div>

        <div className="servicios">
          <h3>Servicios disponibles</h3>
          <div className="chips">
            {['🔧 Reparaciones','🧹 Aseo','🚚 Fletes','🌿 Jardín','📦 Mandados','🚗 Viajes','⚡ Electricidad','💧 Gasfitería','🎨 Pintura','📐 Carpintería','❤️ Cuidado personas','🐾 Mascotas','👨‍🍳 Cocina','📚 Clases','💻 Tecnología','📷 Fotografía','👷 Construcción','✂️ Peluquería','💆 Masajes','🌱 Agricultura','🔥 Soldadura','🚌 Transporte escolar'].map(s => (
              <div key={s} className="chip">{s}</div>
            ))}
          </div>
        </div>

        <div className="workers">
          <h3>¿Eres trabajador? Regístrate gratis</h3>
          <ul>
            <li>Aparece en el mapa y recibe solicitudes de clientes cercanos</li>
            <li>Sin comisiones — cobras directo al cliente</li>
            <li>Activa tu disponibilidad cuando quieras trabajar</li>
            <li>Solo necesitas una cuenta Google para comenzar</li>
          </ul>
        </div>

        <div className="qr-section">
          <QRCodeSVG value={LANDING_URL} size={160} level="H" style={{flexShrink: 0, borderRadius: 8}} />
          <div className="qr-text">
            <h3>👆 Escanea y<br/>empieza ahora</h3>
            <p>Abre la cámara de tu celular y apunta al código QR. Gratis, sin instalación previa.</p>
            <div className="url">jobshour.dondemorales.cl/landing</div>
          </div>
        </div>

        <div className="footer">
          <p>© 2026 JobsHour · Versión inicial en pruebas</p>
          <p className="zona">📍 Renaico · Angol · Los Ángeles · Nacimiento</p>
        </div>
      </div>

      <button className="print-btn" onClick={() => window.print()}>🖨️ Imprimir flyer</button>
    </>
  )
}
