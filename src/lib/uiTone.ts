/**
 * Clases Tailwind compartidas — JobsHours:
 * - **Slate**: cierre, fondos de modal, acciones neutras (coherente con ModalShell).
 * - **Teal**: solicitudes a trabajador / servicio / cotizaciones (confianza).
 * - **Ámbar/naranja**: demandas globales y CTAs “calientes” (mapa, publicar).
 */

export const uiTone = {
  /** Cerrar en panel oscuro (bloque centrado) */
  modalCloseFilled:
    'px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition',

  /** Cerrar tipo enlace (checkout, headers) */
  modalCloseGhost: 'text-slate-400 hover:text-white text-sm font-medium transition',

  /** Footer único en modal claro — unifica antes azul/púrpura/verde distintos */
  modalFooterClose:
    'w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition shadow-md',

  /** Gate login / sesión (sheet blanco) */
  modalGateFull:
    'w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm transition',

  modalCloseCompact:
    'mt-4 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition',

  /** Lista viajes / paneles claros */
  modalLightDismiss:
    'w-full py-3 bg-slate-100 text-slate-800 font-bold rounded-xl hover:bg-slate-200 transition',

  /** Junto a CTA naranja (barra inferior) */
  modalSecondaryNextToPrimary:
    'px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-sm transition active:scale-95',

  /** Tarjeta error / estado vacío */
  modalSoftDismiss:
    'mt-4 w-full bg-slate-200 hover:bg-slate-300 text-slate-800 py-2.5 rounded-xl font-semibold transition',

  /** Créditos / modal informativo */
  modalCreditsClose:
    'w-full mt-4 bg-gradient-to-r from-slate-700 to-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:from-slate-800 hover:to-black transition shadow-lg',

  /** Pagar pedido tienda / acento JobsHours */
  ctaPayCart:
    'block w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black py-3 rounded-xl transition shadow-lg shadow-amber-500/25',

  /** CTA compacto mapa vacío */
  ctaPublishCompact:
    'px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-black text-xs transition active:scale-95 shadow-md shadow-amber-500/20',

  /** Reseña con estrellas (modal claro) */
  ctaRating:
    'flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold transition shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
  modalCancelMuted:
    'flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition disabled:opacity-50',

  /** Formulario perfil / guardar (antes morado → ámbar marca JobsHours) */
  ctaFormSaveWide:
    'w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed',

  /** Modal claro: respuesta worker (teal marca servicio) */
  ctaReplyPublish:
    'flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white rounded-xl font-bold transition shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
  modalCancelLight:
    'flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition disabled:opacity-50',

  /** Enviar solicitud al trabajador (sheet oscuro ServiceRequestModal) */
  ctaServiceSend:
    'w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white rounded-2xl font-black text-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/25',

  /** Reseña en chat (ancho compartido) */
  ctaReview:
    'flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white rounded-xl font-bold text-sm transition disabled:opacity-50',
  modalReviewCancel: 'flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition',

  /** Login / registro — cabecera marca */
  authHeader:
    'bg-gradient-to-br from-amber-500 via-orange-500 to-orange-700 p-6 relative overflow-hidden',

  /** Modal pago — franja superior (Flow / checkout) */
  paymentHeaderStrip: 'bg-gradient-to-r from-amber-500 to-orange-600',

  /** Monto destacado sobre fondo oscuro */
  paymentAmountPanelDark:
    'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 text-center',

  paymentAmountTextDark: 'text-3xl font-black text-amber-400',

  /** Monto destacado sobre fondo claro */
  paymentAmountPanelLight:
    'flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200',

  paymentAmountTextLight: 'text-2xl font-black text-amber-700',

  /** Pagar con Flow (footer flex, alineado con ctaRating) */
  ctaPayFlow:
    'flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold transition shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',

  /** Registro por pasos — siguiente / crear cuenta */
  ctaWizardPrimary:
    'flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-bold text-sm hover:from-amber-400 hover:to-orange-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed',

  ctaWizardBack:
    'flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-200 transition',

  /** Inputs claros — foco marca */
  inputFocusBrand: 'outline-none transition-all focus:border-amber-500 focus:bg-amber-50/30',

  /** Caja aviso / tip en formulario claro */
  surfaceInfoAmber: 'bg-amber-50 border border-amber-200 rounded-xl p-4',

  /** Aviso informativo neutro (slate) */
  surfaceInfoMuted: 'bg-slate-50 border border-slate-200 rounded-xl p-4',

  /** Modo viaje / trayecto trabajador (teal marca servicio) */
  travelModeHeader:
    'bg-gradient-to-r from-teal-500 via-teal-600 to-teal-700 p-6 relative overflow-hidden',

  travelModePanelSoft:
    'bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-4 border border-teal-100',

  travelModeCta:
    'w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white font-black rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-xl transition text-lg',

  travelModeLoadingOrb:
    'w-20 h-20 bg-gradient-to-r from-teal-500 to-teal-700 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse',

  /** Inputs claros — foco teal (viajes / trabajador) */
  inputFocusTeal: 'outline-none transition focus:border-teal-500',

  /** Botón enviar mensaje chat (compacto) */
  ctaChatSend:
    'w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-2xl flex items-center justify-center text-white transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed shrink-0',

  /** Placeholder avatar perfil (anillo gradiente marca) */
  avatarPlaceholderRing:
    'bg-gradient-to-br from-amber-400 to-orange-500',

  /** Botón ícono sobre avatar */
  avatarEditFab:
    'absolute bottom-0 right-0 w-8 h-8 bg-amber-600 hover:bg-amber-700 rounded-full flex items-center justify-center shadow-lg transition',

  /** Saldo / número destacado (créditos, métricas claras) */
  creditsBalanceHero:
    'text-6xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent',

  /** Tarjeta plan destacado “popular” */
  creditsPlanFeatured:
    'border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 relative overflow-hidden cursor-pointer',

  creditsPopularBadge:
    'absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[9px] font-black px-2 py-1 rounded-full',

  creditsPriceFeatured:
    'text-2xl font-black bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent',

  /** Textarea modal claro — respuesta trabajador / reseña */
  textareaFocusTeal:
    'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500 outline-none resize-none transition',

  /** Botón compacto secundario en panel oscuro (ej. chat en solicitudes) */
  chipActionTeal:
    'px-4 py-2 bg-teal-500/20 text-teal-300 rounded-xl text-sm font-bold hover:bg-teal-500/30 transition border border-teal-500/30',

  /** CTA fila compacta — pagar (gradiente marca) */
  ctaPayRow:
    'flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white py-2 rounded-xl text-sm font-bold transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2',

  /** Revelar teléfono — botón disparador (gradiente marca) */
  ctaRevealPhone:
    'group relative px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden',

  /** Teléfono ya revelado — llamar (teal servicio) */
  ctaPhoneCall:
    'group relative px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden',

  /** Banner “pueblo vivo” / stats públicas (marca ámbar) */
  liveStatsStrip:
    'bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg shadow-amber-500/25',

  /** Toggle “on” (reemplazo de azul/genérico) */
  toggleTrackOn:
    'peer-checked:bg-gradient-to-r peer-checked:from-amber-500 peer-checked:to-orange-600',
} as const
