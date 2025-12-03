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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Headphones,
  Search,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  Mail,
  Send,
  Plus,
  Filter,
} from "lucide-react";

interface ClientSupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SupportTicket {
  id: string;
  customer_name: string;
  customer_email: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  responses: TicketResponse[];
}

interface TicketResponse {
  id: string;
  message: string;
  agent_name: string;
  created_at: string;
}

// Mock data for demonstration
const mockTickets: SupportTicket[] = [
  {
    id: '1',
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    subject: 'Unable to complete transfer',
    message: 'I tried to send money to my friend but the transaction keeps failing.',
    status: 'open',
    priority: 'high',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    responses: [],
  },
  {
    id: '2',
    customer_name: 'Jane Smith',
    customer_email: 'jane@example.com',
    subject: 'Question about fees',
    message: 'Can you explain the fee structure for international transfers?',
    status: 'in_progress',
    priority: 'medium',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    responses: [
      {
        id: '1',
        message: 'Hello Jane, I\'d be happy to explain our fee structure.',
        agent_name: 'Support Agent',
        created_at: new Date().toISOString(),
      }
    ],
  },
];

const ClientSupportModal: React.FC<ClientSupportModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>(mockTickets);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [responseText, setResponseText] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customer_email.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  const handleSendResponse = () => {
    if (!selectedTicket || !responseText.trim()) return;

    const newResponse: TicketResponse = {
      id: Date.now().toString(),
      message: responseText,
      agent_name: 'Support Agent',
      created_at: new Date().toISOString(),
    };

    const updatedTicket = {
      ...selectedTicket,
      status: 'in_progress' as const,
      responses: [...selectedTicket.responses, newResponse],
      updated_at: new Date().toISOString(),
    };

    setTickets(tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t));
    setSelectedTicket(updatedTicket);
    setResponseText("");

    toast({
      title: "Response Sent",
      description: "Your response has been sent to the customer",
    });
  };

  const handleUpdateStatus = (status: SupportTicket['status']) => {
    if (!selectedTicket) return;

    const updatedTicket = {
      ...selectedTicket,
      status,
      updated_at: new Date().toISOString(),
    };

    setTickets(tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t));
    setSelectedTicket(updatedTicket);

    toast({
      title: "Status Updated",
      description: `Ticket status changed to ${status}`,
    });
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
            Manage customer support tickets and inquiries
          </DialogDescription>
        </DialogHeader>

        {/* Stats Overview */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ticket List */}
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
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <ScrollArea className="h-[350px]">
              <div className="space-y-2 pr-4">
                {filteredTickets.length === 0 ? (
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
                            <p className="text-xs text-muted-foreground">{ticket.customer_name}</p>
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

          {/* Ticket Details */}
          <Card>
            <CardContent className="p-4">
              {selectedTicket ? (
                <div className="space-y-4">
                  {/* Customer Info */}
                  <div>
                    <h3 className="font-semibold mb-2">{selectedTicket.subject}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {selectedTicket.customer_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedTicket.customer_email}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Status Actions */}
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

                  {/* Conversation */}
                  <ScrollArea className="h-[180px]">
                    <div className="space-y-3">
                      {/* Original Message */}
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">Customer</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(selectedTicket.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{selectedTicket.message}</p>
                      </div>

                      {/* Responses */}
                      {selectedTicket.responses.map((response) => (
                        <div key={response.id} className="bg-primary/10 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="text-xs">Agent</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(response.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{response.message}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Reply Box */}
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
                      disabled={!responseText.trim()}
                    >
                      <Send className="h-4 w-4 mr-2" />
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
      </DialogContent>
    </Dialog>
  );
};

export default ClientSupportModal;
