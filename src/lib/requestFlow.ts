/**
 * Reglas compartidas de estados, pestañas y copy de “qué hacer ahora”.
 */

export type MisSolicitudesTab = 'active' | 'in_progress' | 'archived'
export type WorkerRequestsFilter = 'pending' | 'accepted' | 'all'
export type ChatRole = 'cliente' | 'trabajador'

export const REQUEST_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  pending: { label: 'Esperando respuesta', color: 'text-yellow-300', bg: 'bg-yellow-500/20', icon: '⏳' },
  accepted: { label: 'Coordinado', color: 'text-teal-300', bg: 'bg-teal-500/20', icon: '✅' },
  in_progress: { label: 'En ejecución', color: 'text-teal-300', bg: 'bg-teal-500/20', icon: '🚚' },
  completed: { label: 'Finalizado', color: 'text-teal-300', bg: 'bg-teal-500/20', icon: '🎉' },
  cancelled: { label: 'Cancelado', color: 'text-gray-400', bg: 'bg-gray-500/20', icon: '❌' },
  rejected: { label: 'Rechazado', color: 'text-gray-400', bg: 'bg-gray-500/20', icon: '✖️' },
  disputed: { label: 'Requiere revisión', color: 'text-red-300', bg: 'bg-red-500/20', icon: '⚠️' },
}

export function isOlderThanHours(dateStr?: string | null, hours = 48): boolean {
  if (!dateStr) return false
  const createdAt = new Date(dateStr).getTime()
  if (!Number.isFinite(createdAt)) return false
  return Date.now() - createdAt > hours * 60 * 60 * 1000
}

export function isPendingExpired(status: string, expiresAt?: string | null): boolean {
  if (status !== 'pending' || !expiresAt) return false
  const exp = new Date(expiresAt).getTime()
  return Number.isFinite(exp) && exp <= Date.now()
}

export function isStalePending(status: string, createdAt?: string | null): boolean {
  return status === 'pending' && isOlderThanHours(createdAt, 48)
}

export function classifyMisSolicitudesTab(
  status: string,
  createdAt?: string | null,
  expiresAt?: string | null,
): MisSolicitudesTab {
  if (['accepted', 'in_progress'].includes(status)) return 'in_progress'
  if (
    ['completed', 'cancelled', 'rejected', 'disputed'].includes(status) ||
    isPendingExpired(status, expiresAt) ||
    isStalePending(status, createdAt)
  ) {
    return 'archived'
  }
  if (status === 'pending') return 'active'
  return 'archived'
}

export function matchesMisSolicitudesTab(
  tab: MisSolicitudesTab,
  status: string,
  createdAt?: string | null,
  expiresAt?: string | null,
): boolean {
  return classifyMisSolicitudesTab(status, createdAt, expiresAt) === tab
}

export function getMisSolicitudesEmptyState(tab: MisSolicitudesTab): {
  title: string
  hint: string
} {
  if (tab === 'active') {
    return {
      title: 'Sin solicitudes activas',
      hint: 'Publica una demanda en el mapa o toma una del feed. Las pendientes recientes aparecerán aquí.',
    }
  }
  if (tab === 'in_progress') {
    return {
      title: 'Sin servicios en curso',
      hint: 'Cuando un socio acepte tu pedido o tomes uno, coordina por chat desde esta pestaña.',
    }
  }
  return {
    title: 'Sin historial archivado',
    hint: 'Aquí verás servicios finalizados, cancelados o pendientes vencidas (más de 48 h).',
  }
}

export function getWorkerRequestsEmptyState(filter: WorkerRequestsFilter): {
  title: string
  hint: string
} {
  if (filter === 'pending') {
    return {
      title: 'Sin solicitudes nuevas',
      hint: 'Activa tu disponibilidad en el mapa para que los clientes te encuentren.',
    }
  }
  if (filter === 'accepted') {
    return {
      title: 'Sin servicios en curso',
      hint: 'Cuando aceptes una solicitud, coordina por chat y marca completado al terminar.',
    }
  }
  return {
    title: 'Sin solicitudes',
    hint: 'Todavía no recibiste pedidos. Revisa que tu perfil esté activo en el mapa.',
  }
}

export interface ChatNextStep {
  icon: string
  title: string
  detail: string
}

export function getChatNextStep(input: {
  status: string | null
  myRole?: ChatRole
  paymentStatus?: string | null
  isSelf?: boolean
}): ChatNextStep | null {
  const { status, myRole, paymentStatus, isSelf } = input
  if (!status || isSelf) return null

  if (status === 'pending') {
    if (myRole === 'trabajador') {
      return {
        icon: '⚡',
        title: 'Responde la solicitud',
        detail: 'Acepta si puedes realizar el servicio o rechaza si no te acomoda.',
      }
    }
    return {
      icon: '⏳',
      title: 'Esperando un socio',
      detail: 'Te avisaremos cuando alguien tome tu pedido. Mientras tanto puedes aclarar detalles aquí.',
    }
  }

  if (status === 'accepted' || status === 'in_progress') {
    if (myRole === 'trabajador') {
      return {
        icon: '🚚',
        title: 'Servicio en curso',
        detail: 'Coordina horario y lugar por chat. Al terminar, marca el servicio como completado.',
      }
    }
    return {
      icon: '💬',
      title: 'Coordina con tu socio',
      detail: 'Confirma dirección, horario y monto acordado antes de que termine el trabajo.',
    }
  }

  if (status === 'completed') {
    if (myRole === 'cliente') {
      if (!paymentStatus || paymentStatus === 'pending') {
        return {
          icon: '💳',
          title: 'Pago pendiente',
          detail: 'Cierra el servicio pagando desde Mis Solicitudes cuando estés conforme.',
        }
      }
      return {
        icon: '⭐',
        title: 'Servicio finalizado',
        detail: 'Si todo salió bien, califica al socio desde Mis Solicitudes.',
      }
    }
    return {
      icon: '✅',
      title: 'Esperando pago del cliente',
      detail: 'El cliente puede pagar desde su panel cuando confirme el trabajo.',
    }
  }

  if (status === 'cancelled' || status === 'rejected') {
    return {
      icon: '❌',
      title: 'Servicio cerrado',
      detail: 'Esta solicitud ya no está activa. Puedes publicar una nueva desde el mapa.',
    }
  }

  if (status === 'disputed') {
    return {
      icon: '⚠️',
      title: 'En revisión',
      detail: 'Hay un reclamo abierto. Mantén el historial del chat por si soporte lo necesita.',
    }
  }

  return null
}
