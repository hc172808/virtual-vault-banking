import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, X, DollarSign, ArrowUpRight, ArrowDownLeft, Shield, MessageCircle, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePushNotifications, sendLocalNotification } from "@/hooks/usePushNotifications";
import { showNotification, isDocumentVisible, requestNotificationPermission } from "@/lib/notifications";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'transaction' | 'security' | 'system' | 'fund' | 'chat' | 'payment_request';
  timestamp: Date;
  read: boolean;
  amount?: number;
  transactionType?: 'credit' | 'debit';
}

interface NotificationSystemProps {
  userId: string;
  className?: string;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  userId,
  className = "",
}) => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  
  // Initialize push notifications
  const { 
    isSupported: pushSupported, 
    isRegistered, 
    permissionStatus, 
    registerForPush 
  } = usePushNotifications(userId);

  // Send push/local notification for critical events
  const triggerPushNotification = useCallback(async (
    title: string, 
    body: string, 
    data?: Record<string, any>
  ) => {
    // Only send push when document is not visible (app in background)
    if (!isDocumentVisible()) {
      // Try native push first, then fall back to web notification
      await sendLocalNotification(title, body, data);
      
      // Also try browser notification
      showNotification(title, {
        body,
        tag: data?.type || 'notification',
        data
      });
    }
  }, []);

  // Request push permission on mount
  useEffect(() => {
    const initPushNotifications = async () => {
      if (pushSupported && permissionStatus !== 'granted') {
        const granted = await requestNotificationPermission();
        setPushEnabled(granted);
        if (granted) {
          await registerForPush();
        }
      } else if (permissionStatus === 'granted') {
        setPushEnabled(true);
        await registerForPush();
      }
    };

    if (userId) {
      initPushNotifications();
      loadNotifications();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [userId, pushSupported, permissionStatus]);

  const loadNotifications = async () => {
    try {
      // Load recent activity logs as notifications
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const notificationData: Notification[] = data.map(log => {
        let type: Notification['type'] = 'system';
        let amount: number | undefined;
        let transactionType: 'credit' | 'debit' | undefined;

        // Parse the log to determine notification type and extract amount
        if (log.action_type.includes('MONEY') || log.action_type.includes('FUND')) {
          type = 'transaction';
          const amountMatch = log.description.match(/\$(\d+\.?\d*)/);
          if (amountMatch) {
            amount = parseFloat(amountMatch[1]);
            transactionType = log.action_type.includes('SENT') || log.action_type.includes('WITHDRAW') 
              ? 'debit' : 'credit';
          }
        } else if (log.action_type.includes('FUND')) {
          type = 'fund';
        } else if (log.action_type.includes('SECURITY') || log.action_type.includes('PIN')) {
          type = 'security';
        }

        return {
          id: log.id,
          title: formatNotificationTitle(log.action_type),
          message: log.description,
          type,
          timestamp: new Date(log.created_at),
          read: false, // In a real app, this would come from user preferences
          amount,
          transactionType,
        };
      });

      setNotifications(notificationData);
      setUnreadCount(notificationData.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newLog = payload.new;
          
          // Create notification from new log
          let type: Notification['type'] = 'system';
          let amount: number | undefined;
          let transactionType: 'credit' | 'debit' | undefined;

          if (newLog.action_type.includes('MONEY') || newLog.action_type.includes('FUND')) {
            type = 'transaction';
            const amountMatch = newLog.description.match(/\$(\d+\.?\d*)/);
            if (amountMatch) {
              amount = parseFloat(amountMatch[1]);
              transactionType = newLog.action_type.includes('SENT') || newLog.action_type.includes('WITHDRAW') 
                ? 'debit' : 'credit';
            }
          } else if (newLog.action_type.includes('FUND')) {
            type = 'fund';
          } else if (newLog.action_type.includes('SECURITY') || newLog.action_type.includes('PIN')) {
            type = 'security';
          }

          const newNotification: Notification = {
            id: newLog.id,
            title: formatNotificationTitle(newLog.action_type),
            message: newLog.description,
            type,
            timestamp: new Date(newLog.created_at),
            read: false,
            amount,
            transactionType,
          };

          setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);

      // Show toast notification for important events
      if (type === 'transaction' || type === 'fund') {
        toast({
          title: newNotification.title,
          description: newNotification.message,
          duration: 5000,
        });
        
        // Trigger push notification for transactions
        triggerPushNotification(
          newNotification.title,
          newNotification.message,
          { type: 'transaction', amount, transactionType }
        );
      }
    }
  )
  .subscribe();

    // Listen for payment requests
    const requestChannel = supabase
      .channel('payment_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payment_requests',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const newRequest = payload.new as any;
          
          // Fetch sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', newRequest.sender_id)
            .single();

          const senderName = sender?.full_name || 'Someone';
          const requestMessage = `${senderName} is requesting $${newRequest.amount}`;

          // Add to notifications list
          const paymentNotification: Notification = {
            id: newRequest.id,
            title: 'New Payment Request',
            message: requestMessage,
            type: 'payment_request',
            timestamp: new Date(),
            read: false,
            amount: parseFloat(newRequest.amount),
          };

          setNotifications(prev => [paymentNotification, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);

          toast({
            title: "💸 New Payment Request",
            description: requestMessage,
            duration: 10000,
          });

          // Trigger push notification for payment request
          triggerPushNotification(
            "💸 Payment Request",
            requestMessage,
            { type: 'payment_request', requestId: newRequest.id }
          );
        }
      )
      .subscribe();

    // Listen for chat messages
    const chatChannel = supabase
      .channel('chat_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Check if this message is for the user's conversation
          const { data: conversation } = await supabase
            .from('chat_conversations')
            .select('user_id, agent_id')
            .eq('id', message.conversation_id)
            .single();

          if (!conversation) return;
          
          // Only notify if user is participant and not the sender
          const isParticipant = conversation.user_id === userId || conversation.agent_id === userId;
          const isSender = message.sender_id === userId;
          
          if (isParticipant && !isSender) {
            const chatNotification: Notification = {
              id: message.id,
              title: message.is_agent ? 'Agent Message' : 'New Chat Message',
              message: message.message.substring(0, 100) + (message.message.length > 100 ? '...' : ''),
              type: 'chat',
              timestamp: new Date(),
              read: false,
            };

            setNotifications(prev => [chatNotification, ...prev.slice(0, 19)]);
            setUnreadCount(prev => prev + 1);

            toast({
              title: "💬 New Message",
              description: chatNotification.message,
              duration: 5000,
            });

            // Trigger push notification for chat message
            triggerPushNotification(
              chatNotification.title,
              chatNotification.message,
              { type: 'chat_message', conversationId: message.conversation_id }
            );
          }
        }
      )
      .subscribe();

    // Listen for incoming transactions (when funds received via QR code)
    const transactionChannel = supabase
      .channel('transaction_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const transaction = payload.new as any;
          
          // Fetch sender info
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', transaction.sender_id)
            .maybeSingle();

          const senderName = senderProfile?.full_name || 'Someone';
          const amount = transaction.amount;
          const notificationMessage = `${senderName} sent you $${parseFloat(amount).toFixed(2)} GYD`;

          // Show prominent toast notification for received payment
          toast({
            title: "💰 Payment Received!",
            description: notificationMessage,
            duration: 8000,
          });

          // Add to notifications list
          const newNotification: Notification = {
            id: transaction.id,
            title: 'Payment Received',
            message: notificationMessage,
            type: 'transaction',
            timestamp: new Date(),
            read: false,
            amount: parseFloat(amount),
            transactionType: 'credit',
          };

          setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);

          // Trigger push notification for received payment
          triggerPushNotification(
            "💰 Payment Received!",
            notificationMessage,
            { type: 'transaction', amount: parseFloat(amount), transactionType: 'credit' }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(requestChannel);
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(transactionChannel);
    };
  };

  const formatNotificationTitle = (actionType: string): string => {
    switch (actionType) {
      case 'MONEY_SENT':
        return 'Money Sent';
      case 'MONEY_RECEIVED':
        return 'Money Received';
      case 'FUND_ADDED':
        return 'Funds Added';
      case 'FUND_WITHDRAWN':
        return 'Funds Withdrawn';
      case 'PIN_CHANGED':
        return 'PIN Updated';
      case 'CARD_LOCKED':
        return 'Card Locked';
      case 'CARD_UNLOCKED':
        return 'Card Unlocked';
      default:
        return actionType.replace(/_/g, ' ').toLowerCase()
          .replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'transaction':
        return notification.transactionType === 'credit' 
          ? <ArrowDownLeft className="w-4 h-4 text-success" />
          : <ArrowUpRight className="w-4 h-4 text-destructive" />;
      case 'fund':
        return <DollarSign className="w-4 h-4 text-primary" />;
      case 'security':
        return <Shield className="w-4 h-4 text-warning" />;
      case 'chat':
        return <MessageCircle className="w-4 h-4 text-primary" />;
      case 'payment_request':
        return <ArrowDownLeft className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell with Push Status Indicator */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
        title={pushEnabled ? 'Push notifications enabled' : 'Push notifications disabled'}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 px-1 min-w-[1.2rem] h-5 text-xs"
            variant="destructive"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        {/* Push notification status indicator */}
        {pushSupported && (
          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${
            pushEnabled ? 'bg-green-500' : 'bg-orange-500'
          }`} />
        )}
      </Button>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-background border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-medium">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`m-2 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{notification.title}</p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {notification.timestamp.toLocaleString()}
                          </p>
                          {notification.amount && (
                            <Badge 
                              variant={notification.transactionType === 'credit' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {notification.transactionType === 'debit' ? '-' : '+'}
                              ${notification.amount.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSystem;