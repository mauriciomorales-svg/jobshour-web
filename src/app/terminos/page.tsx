'use client'

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-emerald-600 text-white py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <a href="/" className="text-emerald-200 text-sm hover:underline">← Volver</a>
          <h1 className="text-3xl font-bold mt-4">Términos de Servicio</h1>
          <p className="text-emerald-100 mt-2">Última actualización: 19 de febrero de 2026</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 text-gray-700 leading-relaxed space-y-8">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Aceptación de los Términos</h2>
          <p>Al acceder y utilizar JobsHours ("la Plataforma"), aceptas estos Términos de Servicio. Si no estás de acuerdo, no utilices la Plataforma.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. Descripción del Servicio</h2>
          <p>JobsHours es una plataforma que conecta personas que necesitan servicios ("Clientes") con profesionales independientes ("Socios/Workers") en su zona geográfica. JobsHours actúa como intermediario tecnológico y <strong>no es empleador ni contratista</strong> de ningún Socio.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. Registro y Cuenta</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Debes tener al menos 18 años para registrarte.</li>
            <li>La información proporcionada debe ser veraz y actualizada.</li>
            <li>Eres responsable de mantener la confidencialidad de tu cuenta.</li>
            <li>Nos reservamos el derecho de suspender cuentas que violen estos términos.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Uso de la Plataforma</h2>
          <p className="mb-2">Queda prohibido:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Publicar contenido falso, engañoso u ofensivo.</li>
            <li>Utilizar la plataforma para actividades ilegales.</li>
            <li>Crear cuentas múltiples con fines fraudulentos.</li>
            <li>Intentar evadir los sistemas de seguridad de la plataforma.</li>
            <li>Acosar, amenazar o discriminar a otros usuarios.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Pagos y Transacciones</h2>
          <p>Los acuerdos de precio son entre Clientes y Socios. JobsHours puede facilitar el pago a través de plataformas de terceros (Flow, MercadoPago). JobsHours no garantiza la calidad ni resultado de los servicios prestados entre usuarios.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Responsabilidad</h2>
          <p>JobsHours no es responsable por daños, pérdidas o perjuicios derivados de la relación entre Clientes y Socios. Cada usuario es responsable de verificar las credenciales y aptitudes de la contraparte antes de contratar un servicio.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Propiedad Intelectual</h2>
          <p>Todo el contenido de la Plataforma (diseño, código, logos, textos) es propiedad de JobsHours y está protegido por las leyes de propiedad intelectual de Chile.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">8. Modificaciones</h2>
          <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios se publicarán en esta página y, si son significativos, se notificará a los usuarios registrados.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">9. Legislación Aplicable</h2>
          <p>Estos términos se rigen por las leyes de la República de Chile, en particular la Ley 19.496 de Protección al Consumidor y la Ley 19.628 sobre Protección de la Vida Privada.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">10. Contacto</h2>
          <p>Para consultas sobre estos términos: <a href="mailto:contacto@jobshour.cl" className="text-emerald-600 underline">contacto@jobshour.cl</a></p>
        </section>
      </main>
    </div>
  )
}
