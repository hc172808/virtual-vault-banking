// Push Notification Utilities for Live Chat

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Check if notifications are supported and enabled
 */
export function areNotificationsEnabled(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

/**
 * Show a local notification
 */
export function showNotification(
  title: string,
  options?: NotificationOptions & { vibrate?: number[] }
): Notification | null {
  if (!areNotificationsEnabled()) {
    return null;
  }

  const defaultOptions: NotificationOptions = {
    icon: "/icon-512x512.png",
    badge: "/icon-512x512.png",
    requireInteraction: false,
    ...options,
  };

  return new Notification(title, defaultOptions);
}

/**
 * Show a chat message notification
 */
export function showChatNotification(
  senderName: string,
  message: string,
  conversationId: string
): Notification | null {
  const notification = showNotification(`New message from ${senderName}`, {
    body: message.length > 100 ? message.substring(0, 100) + "..." : message,
    tag: `chat-${conversationId}`,
    data: {
      conversationId,
      type: "chat_message",
    },
  });

  if (notification) {
    notification.onclick = () => {
      window.focus();
      notification.close();
      // Could dispatch a custom event to open the chat modal
      window.dispatchEvent(
        new CustomEvent("openChat", { detail: { conversationId } })
      );
    };

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }

  return notification;
}

/**
 * Register service worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.log("Service workers are not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("Service Worker registered:", registration);
    return registration;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

/**
 * Check if the document is currently visible
 */
export function isDocumentVisible(): boolean {
  return document.visibilityState === "visible";
}

/**
 * Subscribe to visibility changes
 */
export function onVisibilityChange(callback: (isVisible: boolean) => void): () => void {
  const handler = () => callback(document.visibilityState === "visible");
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}
