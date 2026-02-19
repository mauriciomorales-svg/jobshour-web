'use client'

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-blue-600 text-white py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <a href="/" className="text-blue-200 text-sm hover:underline">← Volver</a>
          <h1 className="text-3xl font-bold mt-4">Política de Privacidad</h1>
          <p className="text-blue-100 mt-2">Última actualización: 19 de febrero de 2026</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 text-gray-700 leading-relaxed space-y-8">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Datos que Recopilamos</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Datos de registro:</strong> nombre, email, teléfono, tipo de cuenta.</li>
            <li><strong>Datos de ubicación:</strong> coordenadas GPS para mostrar servicios cercanos. Solo se usa mientras la app está activa.</li>
            <li><strong>Datos de uso:</strong> interacciones con la plataforma, solicitudes realizadas, mensajes de chat.</li>
            <li><strong>Datos de verificación:</strong> RUT (opcional), para validar identidad de los socios.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. Cómo Usamos tus Datos</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Conectar clientes con socios cercanos basados en ubicación geográfica.</li>
            <li>Enviar notificaciones push sobre solicitudes y mensajes.</li>
            <li>Mejorar la experiencia de la plataforma y prevenir fraude.</li>
            <li>Enviar emails transaccionales (confirmación de registro, estado de solicitudes).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. Compartición de Datos</h2>
          <p>No vendemos ni compartimos tus datos personales con terceros, excepto:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Con otros usuarios de la plataforma según el nivel de visibilidad (nombre real solo para socios activos, nickname para demás).</li>
            <li>Con proveedores de pago (Flow, MercadoPago) para procesar transacciones.</li>
            <li>Cuando sea requerido por ley o autoridad judicial chilena.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Ubicación Geográfica</h2>
          <p>La ubicación se usa exclusivamente para:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Mostrar socios cercanos en el mapa.</li>
            <li>Calcular distancia entre cliente y socio.</li>
            <li>Notificar a socios sobre demandas cercanas.</li>
          </ul>
          <p className="mt-2">Las coordenadas se procesan con un margen de imprecisión (fuzzing) para proteger la ubicación exacta de los socios inactivos. Puedes revocar el permiso de ubicación en cualquier momento desde tu navegador.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Seguridad</h2>
          <p>Protegemos tus datos con encriptación HTTPS, contraseñas hasheadas con bcrypt, tokens de acceso con expiración, y acceso restringido a la base de datos.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Tus Derechos (Ley 19.628)</h2>
          <p>De acuerdo con la legislación chilena, tienes derecho a:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li><strong>Acceso:</strong> solicitar una copia de tus datos personales.</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos.</li>
            <li><strong>Cancelación:</strong> solicitar la eliminación de tus datos.</li>
            <li><strong>Oposición:</strong> oponerte al tratamiento de tus datos para ciertos fines.</li>
          </ul>
          <p className="mt-2">Para ejercer estos derechos, contacta a <a href="mailto:contacto@jobshour.cl" className="text-blue-600 underline">contacto@jobshour.cl</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Cookies</h2>
          <p>Usamos cookies técnicas esenciales para el funcionamiento de la plataforma (sesión, token de autenticación). No usamos cookies de rastreo publicitario.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">8. Retención de Datos</h2>
          <p>Conservamos tus datos mientras tu cuenta esté activa. Si solicitas la eliminación, procederemos en un plazo máximo de 30 días hábiles.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">9. Contacto</h2>
          <p>Responsable del tratamiento de datos: JobsHours<br/>
          Email: <a href="mailto:contacto@jobshour.cl" className="text-blue-600 underline">contacto@jobshour.cl</a><br/>
          Ubicación: Renaico, Araucanía, Chile</p>
        </section>
      </main>
    </div>
  )
}
