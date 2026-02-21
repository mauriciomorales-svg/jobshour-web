// v2 - force update
self.addEventListener('install', (event) => {
  console.log('[SW] install - skipWaiting');
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  console.log('[SW] activate - clients.claim');
  event.waitUntil(clients.claim());
});

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAUXgn2XXRfBjAHUF4kLkj_yF6Nq6WgaIM",
  authDomain: "jobshours.firebaseapp.com",
  projectId: "jobshours",
  storageBucket: "jobshours.firebasestorage.app",
  messagingSenderId: "323777995233",
  appId: "1:323777995233:web:5b3efcafc6b6c38240b2a0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const defaultUrl = '/';
  const requestId = data.request_id || data.requestId || data.service_request_id || data.serviceRequestId;

  let urlToOpen = data.url || defaultUrl;
  if ((!urlToOpen || urlToOpen === defaultUrl) && requestId) {
    urlToOpen = `/?request_id=${encodeURIComponent(requestId)}&open_chat=1`;
  }

  const absoluteUrlToOpen = new URL(urlToOpen, self.location.origin).toString();
  console.log('[SW] notificationclick', { requestId, urlToOpen, absoluteUrlToOpen, data });
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        console.log('[SW] matchAll windowClients', windowClients.map(c => c.url));
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          try {
            client.postMessage({
              type: 'DEEPLINK_OPEN_CHAT',
              url: absoluteUrlToOpen,
              data,
            });
          } catch (e) {}
        }

        const clientToFocus = windowClients.find(c => typeof c.url === 'string' && c.url.startsWith(self.location.origin)) || windowClients[0];
        if (clientToFocus && 'focus' in clientToFocus) {
          return clientToFocus.focus();
        }
        if (clients.openWindow) {
          return clients.openWindow(absoluteUrlToOpen);
        }
      })
  );
});
