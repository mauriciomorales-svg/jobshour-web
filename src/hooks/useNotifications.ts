'use client';

import { useEffect } from 'react';
import { setupNotifications, onMessageListener } from '@/lib/firebase';

export const useNotifications = (apiToken: string | null) => {
  useEffect(() => {
    console.log('[useNotifications] effect triggered, apiToken exists:', !!apiToken);
    if (!apiToken) {
      console.log('[useNotifications] no apiToken, skipping');
      return;
    }

    // Setup notifications when user is authenticated
    console.log('[useNotifications] calling setupNotifications...');
    setupNotifications(apiToken).then(() => {
      console.log('[useNotifications] setupNotifications completed');
    }).catch((err) => {
      console.error('[useNotifications] setupNotifications failed:', err);
    });

    // Listen for foreground messages
    onMessageListener();

  }, [apiToken]);
};
