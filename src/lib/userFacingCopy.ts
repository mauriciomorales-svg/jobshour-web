/**
 * Textos únicos para usuarios: estados técnicos → lenguaje claro (es-CL).
 * Mantener aquí badges, hints y pasos de timeline para no duplicar en pantallas.
 *
 * `surfaceCopy`: frases que se repiten entre sidebar, modales y tienda (mismo tono y wording).
 */

/** Pedido de tienda (store_orders.status) */
export const storeOrderStatusCopy: Record<
  string,
  { label: string; hint: string }
> = {
  pending: {
    label: 'En curso',
    hint: 'El comprador debe pagar o vos debés confirmar según la etapa.',
  },
  paid: {
    label: 'Pagado',
    hint: 'Pago acreditado. Falta confirmar entrega con el PIN si aplica.',
  },
  confirmed: {
    label: 'Entrega confirmada',
    hint: 'El comprador confirmó con su código; el pedido quedó cerrado en materiales.',
  },
  rejected: {
    label: 'Rechazado',
    hint: 'No se concretó la venta.',
  },
  expired: {
    label: 'Vencido',
    hint: 'Pasó el plazo sin completar el flujo.',
  },
}

/** Cotización integrada (integrated_quotes.status) */
export const integratedQuoteStatusCopy: Record<
  string,
  { label: string; hint: string }
> = {
  draft: { label: 'Borrador', hint: 'Aún no se envió al comprador.' },
  quote_sent: {
    label: 'Enviada al comprador',
    hint: 'Esperando que abra el link y pague.',
  },
  awaiting_payment: {
    label: 'Esperando pago',
    hint: 'El link de Mercado Pago ya está generado.',
  },
  paid: { label: 'Pagado', hint: 'Pago acreditado.' },
  materials_confirmed: {
    label: 'Materiales entregados',
    hint: 'El comprador confirmó recepción con el PIN.',
  },
  service_completed: {
    label: 'Servicio hecho',
    hint: 'El trabajo acordado fue marcado como completado.',
  },
  closed: { label: 'Cerrada', hint: 'Flujo terminado.' },
}

/** Mercado Pago payment status (payments API) */
export function mpPaymentLabel(status: string | null | undefined): string {
  if (!status) return 'Sin información de pago'
  const m: Record<string, string> = {
    approved: 'Pago aprobado',
    pending: 'Pago pendiente',
    rejected: 'Pago rechazado',
    cancelled: 'Pago cancelado',
    refunded: 'Reembolsado',
    charged_back: 'Contracargo',
    in_process: 'Procesando',
  }
  return m[status] ?? `Estado: ${status}`
}

export function labelStoreOrderStatus(status: string): string {
  return storeOrderStatusCopy[status]?.label ?? status
}

export function labelIntegratedQuoteStatus(status: string): string {
  return integratedQuoteStatusCopy[status]?.label ?? status
}

/** Pasos del timeline integrado — vista comprador (post-pago) */
export const buyerQuoteTimelineSteps = {
  payment: {
    title: 'Pago con Mercado Pago',
    done: 'Listo. Cuando corresponda podrás confirmar la recepción.',
    pending: 'Mercado Pago está procesando o falta que se acredite.',
  },
  materials: {
    title: 'Confirmás la entrega (PIN)',
    done: 'Ya confirmaste que recibiste materiales o productos.',
    pending: 'Cuando tengas el pedido, ingresá el código de 4 dígitos que te dio el vendedor.',
  },
  service: {
    title: 'Servicio acordado',
    done: 'El trabajo incluido en la cotización quedó completado.',
    pending: 'El profesional coordinará y completará el servicio acordado.',
  },
  closed: {
    title: 'Cotización cerrada',
    done: 'Todo el proceso finalizó.',
    pending: 'Se cerrará cuando se completen los pasos anteriores.',
  },
}

/** Pasos del timeline integrado — vista vendedor (panel pedidos) */
export const workerQuoteTimelineSteps = {
  payment: {
    short: 'Pago',
    detail: (done: boolean) =>
      done
        ? 'El comprador pagó en Mercado Pago.'
        : 'Esperando que el comprador pague.',
  },
  materials: {
    short: 'Entrega (PIN)',
    detail: (done: boolean) =>
      done
        ? 'El comprador confirmó recepción con el PIN.'
        : 'Pedí el código de 4 dígitos al entregar.',
  },
  service: {
    short: 'Servicio',
    detail: (done: boolean) =>
      done ? 'Servicio marcado como hecho.' : 'Completá el trabajo acordado.',
  },
  closed: {
    short: 'Cierre',
    detail: (done: boolean) =>
      done ? 'Flujo cerrado.' : 'Pendiente de cierre.',
  },
}

/** Glosario: tipos de demanda (backend type + category_type) */
export const demandTypeGlossary = {
  fixed_job: {
    title: 'Trabajo en un lugar',
    body:
      'Para reparaciones, instalaciones u oficios: un profesional va a tu ubicación o acordás el lugar.',
  },
  ride_share: {
    title: 'Viaje / traslado',
    body:
      'Para llevar o traer personas u objetos en ruta; se coordinan origen, destino y horario.',
  },
  express_errand: {
    title: 'Mandado / encargo',
    body:
      'Compras, retiros o recados: alguien hace el encargo y te lo entrega.',
  },
  buscar_producto: {
    title: 'Comprar en tiendas',
    body:
      'Ver catálogos de trabajadores que venden productos cerca tuyo.',
  },
} as const

export type DemandTypeKey = keyof typeof demandTypeGlossary

/** Clases Tailwind para badges de estado de pedido (fondo claro en panel oscuro) */
export const storeOrderBadgeClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-teal-100 text-teal-800',
  paid: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
}

/** Badges cotización (panel oscuro) */
export const integratedQuoteBadgeClass: Record<string, string> = {
  quote_sent: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  awaiting_payment: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  paid: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  draft: 'bg-slate-600 text-slate-300 border-slate-500/30',
  closed: 'bg-slate-500/20 text-slate-300 border-slate-500/35',
  materials_confirmed: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  service_completed: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
}

/** Cadenas UI repetidas — preferir importar aquí antes de duplicar en JSX. */
export const surfaceCopy = {
  ariaCloseOverlay: 'Cerrar ventana',

  copyLink: 'Copiar link',
  linkCopiedAlert: 'Link copiado',
  linkCopiedToClipboard: 'Link copiado al portapapeles',
  quoteLinkCopiedAlert: 'Link de cotización copiado',

  refreshList: 'Actualizar lista',

  navMyOrders: 'Mis Pedidos',
  navMyQuotes: 'Mis Cotizaciones',

  modalTitleMyOrders: '🛒 Mis Pedidos',

  workerQuotesHeading: 'Mis Cotizaciones',
  workerQuotesSubtitle: 'Links enviados a compradores desde tu tienda',

  emittedQuotesSection: 'Cotizaciones emitidas',

  emptyStoreOrdersTitle: 'Sin pedidos aún',
  emptyStoreOrdersHint:
    'Cuando alguien compre en tu tienda, aparecerá aquí',

  emptyIntegratedQuotesTitle: 'Aún no hay cotizaciones',
  quoteBuilderModeLead: 'En tu tienda, modo',
  quoteBuilderModeLabel: 'Armar cotización',
  quoteBuilderModeTail: 'y comparte el link.',

  publishDemandCta: '✨ Publicar demanda',
  /** Feed vacío (variante “publicar una demanda”) */
  publishDemandFeed: '✨ Publicar una demanda',
  publishing: 'Publicando...',

  /** Botones y acciones recurrentes */
  close: 'Cerrar',
  cancel: 'Cancelar',
  closeTracking: 'Cerrar Tracking',
  viewTracking: 'Ver tracking',
  saving: 'Guardando...',
  saveChanges: 'Guardar Cambios',
  save: 'Guardar',
  /** Tienda worker: botón crear producto */
  publishProduct: '+ Publicar producto',

  /** Envíos y reseñas */
  sending: 'Enviando...',
  sendingRequest: 'Enviando solicitud...',
  sendServiceRequest: '⚡ Enviar solicitud',
  sendReview: 'Enviar reseña',
  sendReviewTitle: 'Enviar Reseña',
  publishReply: 'Publicar Respuesta',
  /** Mapa vacío */
  publishFromMapEmpty: '💰 Publicar lo que necesito',

  /** Auth modales */
  loginWelcome: 'Bienvenido',
  loginContinueSubtitle: 'Inicia sesión para continuar',
  oauthOrContinue: 'O continúa con',
  forgotPassword: '¿Olvidaste tu contraseña?',
  registerPrompt: '¿No tienes cuenta?',
  registerHere: 'Regístrate aquí',
  loginSubmit: 'Iniciar sesión',
  loginSigningIn: 'Iniciando sesión...',
  rememberMe: 'Recordarme',

  registerTitle: 'Crear cuenta',
  /** Botón final del wizard (misma acción que el título de pantalla) */
  createAccountSubmit: 'Crear cuenta',
  verifyEmailHeading: 'Verifica tu email',
  verificationCodeLabel: 'Código de verificación',
  verifyContinue: 'Verificar y continuar',
  verifying: 'Verificando...',
  wizardNext: 'Siguiente',
  wizardBack: 'Atrás',
  creatingAccount: 'Creando cuenta...',
  registerLoginPrompt: '¿Ya tienes cuenta?',
  loginExisting: 'Inicia sesión',

  /** Pagos Flow */
  paymentTitle: 'Pagar servicio',
  paymentSecureTagline: 'Pago seguro con Flow',
  totalToPayShort: 'Total a pagar',
  totalToPayColon: 'Total a pagar:',
  clpViaFlow: 'CLP · vía Flow',
  payWithFlow: 'Pagar con Flow',
  processing: 'Procesando...',
  paymentSecureHeading: 'Pago seguro',
  paymentSecureFlowDescription:
    'Serás redirigido a Flow para completar el pago de forma segura. Aceptamos WebPay, tarjetas de crédito y débito.',
  serviceShortLabel: 'Servicio',

  /** RUT */
  rutVerifyTitle: '🛡️ Verificación de identidad',
  rutVerifySubtitle: 'Verifica tu RUT para mayor confianza',
  rutVerifyCta: 'Verificar RUT',
  rutPrivacyNote:
    'Solo validamos el formato. Tu RUT se almacena de forma segura.',

  /** Editar perfil */
  editProfileTitle: 'Editar perfil',
  editProfileSubtitle: 'Actualiza tu información',
  editProfileAvatarHint: 'Click para cambiar foto',
  passwordChangeCta: 'Cambiar contraseña',
  passwordUpdating: 'Actualizando...',
  profileTabLabel: '👤 Perfil',
  passwordTabLabel: '🔒 Contraseña',

  /** Créditos (modal) */
  creditsMyBalance: 'Mis créditos',
  creditsPioneerUser: 'Usuario pionero',
  creditsManageHint: 'Gestiona tu saldo',

  /** Reseña — respuesta público */
  reviewReplyTitle: 'Responder reseña',
  reviewReplySubtitle: 'Tu respuesta será visible públicamente',

  /** Notificaciones */
  notificationsHeading: 'Notificaciones',
  notificationsUnreadSuffix: 'sin leer',
  markAllRead: 'Marcar todas como leídas',
  notificationsEmpty: 'No hay notificaciones',

  /** Teléfono */
  revealPhoneCta: 'Ver teléfono',
  revealContactTitle: 'Revelar contacto',
  revealContactSubtitle: 'Accede al teléfono directo del trabajador',
  revealingPhone: 'Revelando...',
  revealNow: 'Revelar ahora',
} as const

/** Menú lateral (HomeSidebar) — mismos rotulos en todas las vistas */
export const navCopy = {
  sectionPrincipal: 'Principal',
  sectionSocial: 'Social',
  myProfile: 'Mi Perfil',
  myJobs: 'Mis Trabajos',
  publishDemand: 'Publicar Demanda',
  myCategories: 'Mis Categorías',
  myStore: 'Mi Tienda',
  conversations: 'Conversaciones',
  myFriends: 'Mis Amigos',
  myCard: 'Mi Tarjeta',
  notifications: 'Notificaciones',
  shareApp: 'Compartir App',
  resetMapLocation: 'Resetear ubicación del mapa',
  logout: 'Cerrar sesión',
  loginSection: 'Iniciar sesión',
} as const

/** Listas vacías y buscadores sin resultado */
export const emptyStateCopy = {
  noProducts: 'Sin productos disponibles',
  noProductsShort: 'Sin productos aún.',
  noCategories: 'Sin categorías aún',
  noSkills: 'Sin habilidades aún',
  noConversations: 'Sin conversaciones aún',
  noMessagesYet: 'Sin mensajes aún',
  noOpportunitiesNearby: 'Sin oportunidades cerca',
  noPhotoSelected: 'Sin foto seleccionada',
  noDataWindow: 'Sin datos en la ventana de 7 días',
  noEvents: 'Sin eventos',
  searchNoResultsPrefix: 'Sin resultados para',
  buyerFallback: 'Sin nombre',
  emailFallback: 'Sin email',
  descriptionFallback: 'Sin descripción',
  noPrice: 'Sin precio definido',
  offlineBanner: 'Sin conexión — algunas funciones no estarán disponibles',
  connectionRestored: 'Conexión restaurada',
  liveStatsUnavailable: 'Sin datos disponibles',
} as const

/**
 * Mensajes para alert(), setError(), toast — red de fondo y permisos.
 * Variantes largas unificadas para coherencia (antes había 5 redacciones distintas).
 */
export const feedbackCopy = {
  networkError: 'Error de conexión',
  /** Preferir esta en formularios / modales */
  networkErrorRetry: 'Error de conexión. Intenta nuevamente.',
  networkErrorPleaseRetry: 'Error de conexión. Por favor intenta nuevamente.',
  networkErrorVerifyInternet: 'Error de conexión. Verifica tu internet e intenta nuevamente.',
  networkErrorConsole: 'Error de conexión - revisa consola (F12)',
  networkErrorTakingDemand: 'Error de conexión al tomar demanda',

  mustLoginFirst: 'Debes iniciar sesión primero',
  mustLoginWorkerQuote: 'Debes iniciar sesión como trabajador para crear cotizaciones',
  notificationsEnabled: 'Notificaciones activadas correctamente',
  sessionClosed: 'Sesión cerrada',

  savePreferencesError: 'Error al guardar preferencias',
  reorderComingSoon: 'Funcionalidad de reordenar próximamente',

  browserNoSpeech: 'Tu navegador no soporta reconocimiento de voz',
  browserNoGeolocation: 'Tu navegador no soporta geolocalización',
  geolocationErrorPrefix: 'Error obteniendo ubicación: ',

  imageMax5mb: 'La imagen debe ser menor a 5MB',
  pdfMax5mb: 'Solo archivos PDF de máximo 5MB',
  videoMax30mb: 'El video no debe superar los 30MB',
  videoFormats: 'Solo archivos MP4, MOV o AVI',

  completeNameEmail: 'Completa nombre y email',
  enterNameEmail: 'Ingresa tu nombre y email',
  enterBuyerNameEmail: 'Ingresa nombre y email del comprador',

  /** Motivo por defecto al rechazar pedido tienda */
  defaultRejectReason: 'Sin stock disponible',

  deleteFailed: 'No se pudo eliminar',
  orderProcessError: 'Error al procesar el pedido',
  deliveryCompleteError: 'Error al completar la entrega',
  paymentStartFailed: 'No se pudo iniciar el pago',
  quoteCreateFailed: 'No se pudo crear la cotización',
  completeActionError: 'Error al completar',
  linkGenerateError: 'Error al generar link',
  reviewSendError: 'Error al enviar reseña',
  invalidQr: 'QR no válido',
  categoryDeleteError: 'Error al eliminar categoría',
  cvUploadError: 'Error al subir el CV',
  videoUploadError: 'Error al subir el video',
  saveChangesError: 'Error al guardar los cambios',
  saveSuccess: 'Cambios guardados exitosamente',
  flyerImageError: 'Error al generar imagen',
  pdfGenerateError: 'Error al generar PDF. Intenta de nuevo.',

  quoteShareCopied: '¡Link copiado! Compártelo en Instagram o donde quieras.',
  listCopiedWhatsApp: '¡Lista copiada! Pégala en WhatsApp o donde quieras.',

  friendRequestSent: 'Solicitud enviada!',
  friendRequestError: 'Error al enviar solicitud',

  offlineWizard: 'Sin conexión. Revisa tu internet.',
  gpsCouldNotGet: 'No pudimos obtener tu ubicación. Activa el GPS e intenta de nuevo.',
  saveRetryGeneric: 'Error al guardar. Intenta nuevamente.',

  oauthGoogleFailed: 'Error al autenticar con Google',
  mustLoginToPay: 'Debes iniciar sesión para realizar el pago',
} as const

/** Plantillas dinámicas (un solo lugar para wording) */
export function formatContactsFoundJobsHours(count: number): string {
  return `${count} contactos encontrados en JobsHours!`
}

export function formatSaveSkillsLabel(count: number): string {
  return `Guardar ${count} habilidad${count > 1 ? 'es' : ''}`
}
