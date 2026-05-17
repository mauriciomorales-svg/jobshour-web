/**
 * Registro y migración automática del service worker (sin pasos manuales para el usuario).
 * Cargado desde layout.tsx en cada visita.
 */
(function () {
  var SW_URL = '/sw.js'
  var MIGRATION_KEY = 'jh-fcm-sw-unified-v1'
  var reloading = false

  if (!('serviceWorker' in navigator)) return

  function scriptUrl(reg) {
    var w = reg.active || reg.waiting || reg.installing
    return (w && w.scriptURL) || ''
  }

  function isLegacyFcmWorker(url) {
    return url.indexOf('firebase-messaging-sw.js') !== -1
  }

  function ensureServiceWorker() {
    return navigator.serviceWorker.getRegistrations().then(function (regs) {
      var removedLegacy = false

      return Promise.all(
        regs.map(function (reg) {
          var url = scriptUrl(reg)
          if (isLegacyFcmWorker(url)) {
            removedLegacy = true
            return reg.unregister()
          }
          return Promise.resolve()
        }),
      ).then(function () {
        return navigator.serviceWorker.register(SW_URL).then(function (reg) {
          try {
            reg.update()
          } catch (e) {}
          if (reg.waiting && reg.active) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
          return { reg: reg, removedLegacy: removedLegacy }
        })
      })
    })
  }

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloading) return
    if (!sessionStorage.getItem(MIGRATION_KEY)) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener('load', function () {
    ensureServiceWorker()
      .then(function (result) {
        if (!result) return
        if (result.removedLegacy && !sessionStorage.getItem(MIGRATION_KEY)) {
          sessionStorage.setItem(MIGRATION_KEY, '1')
          console.log('[SW] Worker FCM antiguo eliminado; recargando una vez…')
          window.location.reload()
        }
      })
      .catch(function () {})
  })
})()
