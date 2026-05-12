'use client';

import { useEffect } from 'react';
import { setupNotifications, onMessageListener } from '@/lib/firebase';

const isDev = process.env.NODE_ENV === 'development';

export const useNotifications = (apiToken: string | null) => {
  useEffect(() => {
    if (!apiToken) return;

    setupNotifications(apiToken)
      .catch((err) => {
        if (isDev) console.error('[useNotifications] setupNotifications failed:', err);
      });

    onMessageListener();
  }, [apiToken]);
};
