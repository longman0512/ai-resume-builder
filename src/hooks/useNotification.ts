import { useCallback, useEffect } from 'react';

type NotificationType = 'success' | 'error' | 'info';

interface NotifyOptions {
  title: string;
  body: string;
  type?: NotificationType;
  icon?: string;
}

const ICONS: Record<NotificationType, string> = {
  success: '✅',
  error:   '❌',
  info:    'ℹ️',
};

export function useNotification() {
  // Request permission once when the hook mounts
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const notify = useCallback(({ title, body, type = 'info', icon }: NotifyOptions) => {
    if (!('Notification' in window)) return;

    const send = () => {
      const prefix = ICONS[type];
      new Notification(`${prefix} ${title}`, {
        body,
        icon: icon ?? '/favicon.ico',
        tag: 'resume-builder',   // replaces previous notification instead of stacking
      });
    };

    if (Notification.permission === 'granted') {
      send();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') send();
      });
    }
    // 'denied' → silently skip
  }, []);

  return { notify };
}
