import { useCallback, useEffect, useRef } from 'react';

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
  const permissionRef = useRef<NotificationPermission>('default');

  // Request permission once when the hook mounts
  useEffect(() => {
    if (!('Notification' in window)) return;
    permissionRef.current = Notification.permission;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        permissionRef.current = perm;
      });
    }
  }, []);

  const notify = useCallback(({ title, body, type = 'info', icon }: NotifyOptions) => {
    if (!('Notification' in window)) return;

    const send = () => {
      const prefix = ICONS[type];
      try {
        const n = new Notification(`${prefix} ${title}`, {
          body,
          icon: icon ?? '/icon.png',
          tag: `resume-builder-${Date.now()}`,
          silent: false,
        });
        // Auto-close after 6 seconds
        setTimeout(() => n.close(), 6000);
      } catch (e) {
        // Notification constructor can throw in some contexts (e.g., insecure origin)
        console.warn('Desktop notification failed:', e);
      }
    };

    if (permissionRef.current === 'granted' || Notification.permission === 'granted') {
      send();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        permissionRef.current = perm;
        if (perm === 'granted') send();
      });
    }
    // 'denied' → silently skip
  }, []);

  return { notify };
}
