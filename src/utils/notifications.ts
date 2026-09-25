// ============================================================
// OS & Desktop Notification Utilities
// ============================================================

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const res = await Notification.requestPermission();
    return res === 'granted';
  }
  return false;
}

export function sendDesktopNotification(
  title: string,
  body: string,
  onClick?: () => void
): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }
  try {
    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
    });
    if (onClick) {
      notif.onclick = () => {
        window.focus();
        onClick();
      };
    }
    return true;
  } catch {
    return false;
  }
}
