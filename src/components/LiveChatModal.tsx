import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Send,
  Loader2,
  User,
  Headphones,
  X,
  Clock,
} from "lucide-react";

interface LiveChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  isAgent?: boolean;
}

interface Conversation {
  id: string;
  user_id: string;
  agent_id: string | null;
  status: string;
  created_at: string;
  user_name?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_agent: boolean;
  created_at: string;
}

const LiveChatModal: React.FC<LiveChatModalProps> = ({ open, onOpenChange, userId, isAgent = false }) => {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      if (isAgent) {
        fetchAllConversations();
      } else {
        fetchUserConversation();
      }
    }
  }, [open, isAgent]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
      subscribeToMessages(activeConversation.id);
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchAllConversations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const conversationsWithNames = await Promise.all(
        (data || []).map(async (conv: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', conv.user_id)
            .maybeSingle();
          return { ...conv, user_name: profile?.full_name || 'Unknown User' };
        })
      );

      setConversations(conversationsWithNames);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserConversation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setActiveConversation(data);
      }
    } catch (error: any) {
      console.error('Error fetching conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startNewConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({ user_id: userId })
        .select()
        .single();

      if (error) throw error;
      setActiveConversation(data);

      toast({
        title: "Chat Started",
        description: "An agent will be with you shortly",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const joinConversation = async (conv: Conversation) => {
    try {
      if (conv.status === 'waiting') {
        await supabase
          .from('chat_conversations')
          .update({ status: 'active', agent_id: userId })
          .eq('id', conv.id);
      }
      setActiveConversation(conv);
    } catch (error: any) {
      console.error('Error joining conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: activeConversation.id,
          sender_id: userId,
          message: newMessage,
          is_agent: isAgent,
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const closeConversation = async () => {
    if (!activeConversation) return;

    try {
      await supabase
        .from('chat_conversations')
        .update({ status: 'closed' })
        .eq('id', activeConversation.id);

      setActiveConversation(null);
      if (isAgent) {
        fetchAllConversations();
      }

      toast({
        title: "Chat Closed",
        description: "The conversation has been closed",
      });
    } catch (error: any) {
      console.error('Error closing conversation:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'destructive';
      case 'active': return 'default';
      case 'closed': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Live Chat Support
          </DialogTitle>
          <DialogDescription>
            {isAgent ? "Manage live chat conversations" : "Chat with our support team in real-time"}
          </DialogDescription>
        </DialogHeader>

        {isAgent ? (
          <div className="grid grid-cols-3 gap-4 h-[500px]">
            {/* Conversation List */}
            <div className="border rounded-lg p-3">
              <h3 className="font-semibold mb-3 text-sm">Conversations</h3>
              <ScrollArea className="h-[440px]">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-4">No active chats</p>
                ) : (
                  <div className="space-y-2">
                    {conversations.filter(c => c.status !== 'closed').map(conv => (
                      <Card
                        key={conv.id}
                        className={`cursor-pointer transition-colors ${
                          activeConversation?.id === conv.id ? 'border-primary bg-accent' : 'hover:bg-accent/50'
                        }`}
                        onClick={() => joinConversation(conv)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">{conv.user_name}</span>
                            <Badge variant={getStatusColor(conv.status)} className="text-xs">
                              {conv.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(conv.created_at).toLocaleTimeString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="col-span-2 border rounded-lg flex flex-col">
              {activeConversation ? (
                <>
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium text-sm">
                        {conversations.find(c => c.id === activeConversation.id)?.user_name}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={closeConversation}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                    <div className="space-y-3">
                      {messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.is_agent ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.is_agent
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="p-3 border-t flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                    />
                    <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <p>Select a conversation to start chatting</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-[500px] flex flex-col">
            {activeConversation ? (
              <>
                <div className="p-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-4 w-4" />
                    <span className="font-medium text-sm">Support Chat</span>
                    <Badge variant={getStatusColor(activeConversation.status)} className="text-xs">
                      {activeConversation.status === 'waiting' ? 'Waiting for agent...' : 'Connected'}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={closeConversation}>
                    End Chat
                  </Button>
                </div>
                <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                  <div className="space-y-3">
                    {messages.length === 0 && activeConversation.status === 'waiting' && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Waiting for an agent to join...</p>
                        <p className="text-xs mt-1">You can start typing your question</p>
                      </div>
                    )}
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${!msg.is_agent ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            !msg.is_agent
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-3 border-t flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Start a Live Chat</h3>
                <p className="text-muted-foreground text-sm mb-4 text-center">
                  Chat with our support team in real-time for immediate assistance
                </p>
                <Button onClick={startNewConversation}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Start Chat
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LiveChatModal;
