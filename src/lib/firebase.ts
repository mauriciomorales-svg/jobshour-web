import { initializeApp, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Helper para convertir Base64URL a Uint8Array (formato que espera PushManager)
const urlBase64ToUint8Array = (base64url: string): Uint8Array => {
  try {
    // Limpiar completamente
    let clean = base64url.trim().replace(/\s/g, '');
    
    // Verificar caracteres válidos
    if (!/^[A-Za-z0-9_-]+$/.test(clean)) {
      throw new Error('VAPID key contiene caracteres inválidos');
    }
    
    // Calcular padding necesario (debe ser múltiplo de 4)
    const remainder = clean.length % 4;
    const padding = remainder === 0 ? '' : '='.repeat(4 - remainder);
    const padded = clean + padding;
    
    console.log('VAPID processing:');
    console.log('- Original length:', base64url.length);
    console.log('- Clean length:', clean.length);
    console.log('- Padding added:', padding.length);
    console.log('- Final length:', padded.length);
    
    // Convertir Base64URL a Base64 estándar
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e: any) {
    console.error('VAPID conversion error:', e.message || e);
    throw e;
  }
};

// Helper para limpiar VAPID Key
const cleanVapidKey = (key: string): string => {
  return key.trim().replace(/\s/g, '');
};

let app: any;
let messaging: any = null;

export const initFirebase = async () => {
  if (typeof window === 'undefined') return null;
  
  const supported = await isSupported();
  if (!supported) {
    console.log('Firebase Messaging not supported');
    return null;
  }

  try {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    return messaging;
  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
      app = getApp();
      messaging = getMessaging(app);
      return messaging;
    }
    console.error('Firebase init error:', error);
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  try {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return null;
    }

    console.log('[FCM] origin:', window.location.origin);
    console.log('[FCM] isSecureContext:', window.isSecureContext);
    if (!window.isSecureContext) {
      console.error('[FCM] Not a secure context - notifications will be blocked');
      alert(
        'FCM diagnóstico:\n' +
          `origin: ${window.location.origin}\n` +
          `isSecureContext: ${window.isSecureContext}\n` +
          `Notification.permission: ${Notification.permission}\n\n` +
          'Este navegador indica que la página NO es un contexto seguro (isSecureContext=false). Sin eso, las notificaciones push se bloquean. Revisa el candado/SSL y recarga.'
      );
      return null;
    }

    // Verificar estado actual del permiso
    const currentPermission = Notification.permission;
    console.log('[FCM] Current permission state:', currentPermission);
    
    if (currentPermission === 'denied') {
      console.error('[FCM] Permission denied - user must unblock manually');
      alert(
        'FCM diagnóstico:\n' +
          `origin: ${window.location.origin}\n` +
          `isSecureContext: ${window.isSecureContext}\n` +
          `Notification.permission: ${Notification.permission}\n\n` +
          'Las notificaciones están bloqueadas. Para activarlas:\n' +
          '1. Click en el ícono 🔒 a la izquierda de la URL\n' +
          '2. Click en "Configuración del sitio"\n' +
          '3. Busca "Notificaciones" y cámbialo a "Permitir"\n\n' +
          'Luego recarga la página.'
      );
      return null;
    }

    const permission = await Notification.requestPermission();
    console.log('[FCM] Permission after request:', permission);
    
    if (permission === 'denied') {
      alert(
        'FCM diagnóstico:\n' +
          `origin: ${window.location.origin}\n` +
          `isSecureContext: ${window.isSecureContext}\n` +
          `Notification.permission: ${Notification.permission}\n\n` +
          'Permiso de notificaciones denegado. Para recibir push notifications, permite las notificaciones en la configuración del sitio (🔒 → Configuración del sitio → Notificaciones).'
      );
      return null;
    }
    
    if (permission !== 'granted') {
      console.log('[FCM] Permission not granted:', permission);
      return null;
    }

    const msg = await initFirebase();
    if (!msg) return null;

    let vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    
    // Si no hay VAPID key válida, intentar sin ella
    if (!vapidKey) {
      console.log('No VAPID key, trying without...');
      try {
        const token = await getToken(msg);
        console.log('FCM Token (no VAPID):', token);
        return token;
      } catch (error) {
        console.error('Error without VAPID:', error);
        return null;
      }
    }

    // Limpiar y convertir VAPID Key a Uint8Array
    vapidKey = cleanVapidKey(vapidKey);
    console.log('VAPID Key raw:', vapidKey);
    
    // Intentar primero sin conversión (como string)
    try {
      console.log('Trying VAPID as string...');
      const token = await getToken(msg, { vapidKey });
      console.log('FCM Token (string VAPID):', token);
      return token;
    } catch (stringError) {
      console.log('String VAPID failed, trying Uint8Array...');
    }
    
    // Convertir a Uint8Array para el PushManager
    try {
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      console.log('VAPID Key as Uint8Array, length:', applicationServerKey.length);
      const token = await getToken(msg, { vapidKey: applicationServerKey as any });
      console.log('FCM Token (Uint8Array VAPID):', token);
      return token;
    } catch (arrayError) {
      console.error('Both VAPID methods failed:', arrayError);
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
};

export const registerFCMToken = async (token: string, apiToken: string): Promise<boolean> => {
  try {
    const { apiFetch } = await import('@/lib/api');
    
    console.log('[FCM] Token length:', token.length);
    
    const response = await apiFetch('/api/v1/notifications/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ fcm_token: token }),
    });

    console.log('[FCM] Response status:', response.status);
    const responseBody = await response.text();
    console.log('[FCM] Response body:', responseBody);

    return response.ok;
  } catch (error) {
    console.error('[FCM] Error registering token:', error);
    return false;
  }
};

export const setupNotifications = async (apiToken: string): Promise<void> => {
  console.log('[FCM] setupNotifications started');
  
  const token = await requestNotificationPermission();
  console.log('[FCM] Got token:', token ? token.substring(0, 20) + '...' : 'null');
  
  if (token) {
    console.log('[FCM] Registering token with backend...');
    const success = await registerFCMToken(token, apiToken);
    console.log('[FCM] Token registration result:', success ? 'success' : 'failed');
    console.log('[FCM] Notifications ready');
  } else {
    console.warn('[FCM] No token obtained');
  }
};

export const onMessageListener = () => {
  if (messaging) {
    onMessage(messaging, (payload: any) => {
      console.log('Message received:', payload);
      
      if (Notification.permission === 'granted') {
        const { title, body } = payload.notification || {};
        if (title) {
          new Notification(title, {
            body: body || '',
            icon: '/icon-192x192.png',
          });
        }
      }
    });
  }
};
