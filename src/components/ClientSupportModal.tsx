import React, { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Headphones,
  Search,
  MessageSquare,
  Clock,
  User,
  Mail,
  Send,
  Plus,
  Loader2,
} from "lucide-react";

interface ClientSupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

interface TicketResponse {
  id: string;
  ticket_id: string;
  responder_id: string;
  message: string;
  is_agent: boolean;
  created_at: string;
}

const ClientSupportModal: React.FC<ClientSupportModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingResponse, setSendingResponse] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [newTicketPriority, setNewTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  useEffect(() => {
    if (open) {
      checkUserRole();
      fetchTickets();
    }
  }, [open]);

  useEffect(() => {
    if (selectedTicket) {
      fetchResponses(selectedTicket.id);
    }
  }, [selectedTicket]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasAgentRole = roles?.some(r => r.role === 'admin' || r.role === 'agent');
    setIsAgent(hasAgentRole || false);
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ticketsWithUserInfo = await Promise.all(
        (ticketsData || []).map(async (ticket: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', ticket.user_id)
            .maybeSingle();

          return {
            ...ticket,
            user_email: profile?.email || 'Unknown',
            user_name: profile?.full_name || 'Unknown User',
          } as SupportTicket;
        })
      );

      setTickets(ticketsWithUserInfo);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_ticket_responses')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setResponses(data || []);
    } catch (error: any) {
      console.error('Error fetching responses:', error);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      (ticket.user_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.user_email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'default';
      case 'resolved': return 'secondary';
      case 'closed': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: newTicketSubject,
          message: newTicketMessage,
          priority: newTicketPriority,
        });

      if (error) throw error;

      toast({
        title: "Ticket Created",
        description: "Your support ticket has been submitted",
      });

      setNewTicketSubject("");
      setNewTicketMessage("");
      setShowNewTicketForm(false);
      fetchTickets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !responseText.trim()) return;

    setSendingResponse(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('support_ticket_responses')
        .insert({
          ticket_id: selectedTicket.id,
          responder_id: user.id,
          message: responseText,
          is_agent: isAgent,
        });

      if (error) throw error;

      if (isAgent && selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
      }

      setResponseText("");
      fetchResponses(selectedTicket.id);
      fetchTickets();

      toast({
        title: "Response Sent",
        description: "Your response has been added",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send response",
        variant: "destructive",
      });
    } finally {
      setSendingResponse(false);
    }
  };

  const handleUpdateStatus = async (status: SupportTicket['status']) => {
    if (!selectedTicket) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      setSelectedTicket({ ...selectedTicket, status });
      fetchTickets();

      toast({
        title: "Status Updated",
        description: `Ticket status changed to ${status}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    total: tickets.length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Client Support
          </DialogTitle>
          <DialogDescription>
            {isAgent ? "Manage customer support tickets" : "Get help with your account"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <Card className="p-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{stats.open}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </Card>
        </div>

        {showNewTicketForm ? (
          <div className="space-y-4">
            <Input
              placeholder="Subject"
              value={newTicketSubject}
              onChange={(e) => setNewTicketSubject(e.target.value)}
            />
            <Textarea
              placeholder="Describe your issue..."
              value={newTicketMessage}
              onChange={(e) => setNewTicketMessage(e.target.value)}
              rows={4}
            />
            <select
              value={newTicketPriority}
              onChange={(e) => setNewTicketPriority(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <div className="flex gap-2">
              <Button onClick={handleCreateTicket} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Submit Ticket
              </Button>
              <Button variant="outline" onClick={() => setShowNewTicketForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <Button 
                onClick={() => setShowNewTicketForm(true)} 
                variant="outline" 
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No tickets found
                    </div>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <Card
                        key={ticket.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id ? 'border-primary bg-accent' : 'hover:bg-accent/50'
                        }`}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{ticket.subject}</p>
                              <p className="text-xs text-muted-foreground">{ticket.user_name}</p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Badge variant={getStatusColor(ticket.status)} className="text-xs">
                                {ticket.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </span>
                            <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                              {ticket.priority}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <Card>
              <CardContent className="p-4">
                {selectedTicket ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">{selectedTicket.subject}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {selectedTicket.user_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedTicket.user_email}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    {isAgent && (
                      <>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant={selectedTicket.status === 'in_progress' ? 'default' : 'outline'}
                            onClick={() => handleUpdateStatus('in_progress')}
                          >
                            In Progress
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedTicket.status === 'resolved' ? 'default' : 'outline'}
                            onClick={() => handleUpdateStatus('resolved')}
                          >
                            Resolved
                          </Button>
                          <Button
                            size="sm"
                            variant={selectedTicket.status === 'closed' ? 'default' : 'outline'}
                            onClick={() => handleUpdateStatus('closed')}
                          >
                            Close
                          </Button>
                        </div>
                        <Separator />
                      </>
                    )}

                    <ScrollArea className="h-[180px]">
                      <div className="space-y-3">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">Customer</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(selectedTicket.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{selectedTicket.message}</p>
                        </div>

                        {responses.map((response) => (
                          <div 
                            key={response.id} 
                            className={`rounded-lg p-3 ${response.is_agent ? 'bg-primary/10' : 'bg-muted/50'}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="text-xs" variant={response.is_agent ? 'default' : 'outline'}>
                                {response.is_agent ? 'Agent' : 'Customer'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(response.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{response.message}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="space-y-2">
                      <Textarea
                        placeholder="Type your response..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={3}
                      />
                      <Button 
                        className="w-full" 
                        onClick={handleSendResponse}
                        disabled={!responseText.trim() || sendingResponse}
                      >
                        {sendingResponse ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Response
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                    <p>Select a ticket to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientSupportModal;
