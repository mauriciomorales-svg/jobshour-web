/**
 * Textos de confianza: cancelación, pagos e incidencias (lenguaje simple).
 */

export const TRUST_POLICY_SECTIONS = [
  {
    id: 'cancel',
    title: 'Cancelaciones',
    bullets: [
      'Mientras esté pendiente, quien publicó puede cancelar sin penalización.',
      'Si ya fue aceptada, coordina por chat antes de cancelar para evitar malentendidos.',
      'Una cancelación no borra el historial: queda registrada en la solicitud.',
    ],
  },
  {
    id: 'pay',
    title: 'Pagos',
    bullets: [
      'El monto acordado se confirma en el chat antes de pagar con Mercado Pago.',
      'Si el pago queda pendiente o falla, revisa en la app o en tu correo de MP antes de reintentar.',
      'Ante un cargo que no reconoces, escribe a soporte con fecha y número de solicitud.',
    ],
  },
  {
    id: 'problem',
    title: 'Si algo salió mal',
    bullets: [
      'Usa «Tuve un problema» en el chat de esa solicitud y describe qué pasó.',
      'Puedes adjuntar una foto como evidencia (opcional).',
      'El equipo revisa en 24–48 h hábiles y te responde por correo.',
    ],
  },
] as const

export type DisputeReasonKey =
  | 'no_show'
  | 'wrong_description'
  | 'wrong_address'
  | 'material_missing'
  | 'other'

export interface DisputeReasonOption {
  value: DisputeReasonKey
  label: string
  hint?: string
}

/** Motivos mostrados al cliente (mapean al enum del backend). */
export const CLIENT_DISPUTE_REASONS: DisputeReasonOption[] = [
  { value: 'no_show', label: 'No se presentó / no respondió', hint: 'El trabajador no llegó o dejó de contestar.' },
  { value: 'wrong_description', label: 'No fue lo acordado', hint: 'Calidad, alcance o precio distinto a lo hablado.' },
  { value: 'wrong_address', label: 'Problema con lugar o dirección', hint: 'Llegó a otro sitio o hubo confusión de ubicación.' },
  { value: 'material_missing', label: 'Faltó entrega o producto', hint: 'Compra, recado o parte del trabajo incompleta.' },
  { value: 'other', label: 'Otro motivo', hint: 'Describe con detalle en el cuadro de texto.' },
]

/** Motivos para trabajador (flujo operativo existente). */
export const WORKER_DISPUTE_REASONS: DisputeReasonOption[] = [
  { value: 'no_show', label: 'Cliente no se presentó', hint: 'Estás en el lugar y el cliente no apareció.' },
  { value: 'wrong_description', label: 'Descripción incorrecta', hint: 'El trabajo pedido no coincide con lo acordado.' },
  { value: 'wrong_address', label: 'Dirección incorrecta', hint: 'No se puede llegar o el punto es otro.' },
  { value: 'material_missing', label: 'Falta material o insumo', hint: 'No hay lo necesario para completar el servicio.' },
  { value: 'other', label: 'Otro motivo' },
]

export function disputeReasonLabel(value: string): string {
  const all = [...CLIENT_DISPUTE_REASONS, ...WORKER_DISPUTE_REASONS]
  return all.find((r) => r.value === value)?.label ?? value
}
