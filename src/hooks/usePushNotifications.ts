import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isRegistered: boolean;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown';
  token: string | null;
  requestPermission: () => Promise<boolean>;
  registerForPush: () => Promise<void>;
}

export function usePushNotifications(userId: string): UsePushNotificationsReturn {
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if running on native platform
    const platform = Capacitor.getPlatform();
    const supported = platform === 'ios' || platform === 'android';
    setIsSupported(supported);

    if (supported) {
      checkPermission();
      setupListeners();
    } else {
      // Fallback to web notifications
      if ('Notification' in window) {
        setIsSupported(true);
        setPermissionStatus(Notification.permission as any);
      }
    }
  }, []);

  const checkPermission = async () => {
    try {
      const result = await PushNotifications.checkPermissions();
      setPermissionStatus(result.receive as any);
    } catch (error) {
      console.error('Error checking push permission:', error);
    }
  };

  const setupListeners = () => {
    // On registration success
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success:', token.value);
      setToken(token.value);
      setIsRegistered(true);

      // Store token in database for later use
      if (userId) {
        try {
          // Store in user's profile or a separate tokens table
          await supabase
            .from('activity_logs')
            .insert({
              user_id: userId,
              action_type: 'PUSH_TOKEN_REGISTERED',
              description: 'Push notification token registered'
            });
        } catch (error) {
          console.error('Error storing push token:', error);
        }
      }
    });

    // On registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
      toast({
        title: 'Notification Setup Failed',
        description: 'Unable to register for push notifications',
        variant: 'destructive'
      });
    });

    // On push received
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      
      // Show in-app toast for foreground notifications
      toast({
        title: notification.title || 'New Notification',
        description: notification.body || '',
        duration: 5000
      });
    });

    // On push action performed (user tapped notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action:', notification);
      
      // Handle navigation based on notification data
      const data = notification.notification.data;
      if (data?.type === 'transaction') {
        window.location.href = '/?openHistory=true';
      } else if (data?.type === 'payment_request') {
        window.location.href = '/?openRequests=true';
      }
    });
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      if (Capacitor.getPlatform() === 'web') {
        // Web notification permission
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          setPermissionStatus(permission as any);
          return permission === 'granted';
        }
        return false;
      }

      const result = await PushNotifications.requestPermissions();
      setPermissionStatus(result.receive as any);
      return result.receive === 'granted';
    } catch (error) {
      console.error('Error requesting push permission:', error);
      return false;
    }
  };

  const registerForPush = async () => {
    try {
      if (Capacitor.getPlatform() === 'web') {
        // For web, just request permission
        await requestPermission();
        setIsRegistered(true);
        return;
      }

      const hasPermission = permissionStatus === 'granted' || await requestPermission();
      if (hasPermission) {
        await PushNotifications.register();
      }
    } catch (error) {
      console.error('Error registering for push:', error);
      toast({
        title: 'Error',
        description: 'Failed to register for push notifications',
        variant: 'destructive'
      });
    }
  };

  return {
    isSupported,
    isRegistered,
    permissionStatus,
    token,
    requestPermission,
    registerForPush
  };
}

// Helper function to send local notification (for testing and in-app alerts)
export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
  if (Capacitor.getPlatform() === 'web') {
    // Web notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-512x512.png',
        data
      });
    }
  } else {
    // For native, we can't send local notifications directly via Push Notifications plugin
    // Would need @capacitor/local-notifications for that
    console.log('Local notification:', { title, body, data });
  }
}
