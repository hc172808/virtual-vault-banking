import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Check, X, Clock } from "lucide-react";
import { format } from "date-fns";

interface PaymentRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  sender?: {
    full_name: string;
    email: string;
  };
  recipient?: {
    full_name: string;
    email: string;
  };
}

interface PaymentRequestsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onRequestProcessed?: () => void;
}

const PaymentRequestsModal: React.FC<PaymentRequestsModalProps> = ({
  open,
  onOpenChange,
  userId,
  onRequestProcessed,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<PaymentRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PaymentRequest[]>([]);

  useEffect(() => {
    if (open) {
      loadRequests();
    }
  }, [open, userId]);

  const loadRequests = async () => {
    try {
      // Load incoming requests (where I'm the recipient)
      const { data: incoming, error: inError } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (inError) throw inError;

      // Load outgoing requests (where I'm the sender)
      const { data: outgoing, error: outError } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false });

      if (outError) throw outError;

      // Get all unique user IDs
      const userIds = new Set<string>();
      [...(incoming || []), ...(outgoing || [])].forEach(req => {
        userIds.add(req.sender_id);
        userIds.add(req.recipient_id);
      });

      // Fetch user profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', Array.from(userIds));

      if (profileError) throw profileError;

      // Create a map of user profiles
      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      // Attach profiles to requests
      const incomingWithProfiles = (incoming || []).map(req => ({
        ...req,
        sender: profileMap.get(req.sender_id),
        recipient: profileMap.get(req.recipient_id),
      }));

      const outgoingWithProfiles = (outgoing || []).map(req => ({
        ...req,
        sender: profileMap.get(req.sender_id),
        recipient: profileMap.get(req.recipient_id),
      }));

      setIncomingRequests(incomingWithProfiles as any);
      setOutgoingRequests(outgoingWithProfiles as any);
    } catch (error) {
      console.error('Error loading payment requests:', error);
      toast({
        title: "Error",
        description: "Failed to load payment requests",
        variant: "destructive",
      });
    }
  };

  const handleAccept = async (request: PaymentRequest) => {
    setLoading(true);
    try {
      // Process the transfer
      const { data, error } = await supabase.rpc('process_transfer', {
        p_recipient_id: request.sender_id,
        p_amount: request.amount,
        p_description: request.description || 'Payment request fulfilled',
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Transfer failed');
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast({
        title: "Payment Sent",
        description: `Sent $${request.amount.toFixed(2)} to ${request.sender?.full_name}`,
      });

      loadRequests();
      onRequestProcessed?.();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      toast({
        title: "Payment Failed",
        description: error?.message || "Unable to process payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Rejected",
        description: "Payment request has been rejected",
      });

      loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderRequestCard = (request: PaymentRequest, isIncoming: boolean) => (
    <Card key={request.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="font-semibold text-lg">
                ${request.amount.toFixed(2)}
              </span>
              <Badge
                variant={
                  request.status === 'accepted'
                    ? 'default'
                    : request.status === 'rejected'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {request.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              {isIncoming ? 'From' : 'To'}:{' '}
              {isIncoming
                ? request.sender?.full_name || request.sender?.email
                : request.recipient?.full_name || request.recipient?.email}
            </p>
            {request.description && (
              <p className="text-sm mb-2">{request.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {format(new Date(request.created_at), 'MMM dd, yyyy h:mm a')}
            </p>
          </div>
          {isIncoming && request.status === 'pending' && (
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                onClick={() => handleAccept(request)}
                disabled={loading}
              >
                <Check className="w-4 h-4 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(request.id)}
                disabled={loading}
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Payment Requests
          </DialogTitle>
          <DialogDescription>
            Manage incoming and outgoing payment requests
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="incoming">
              Incoming ({incomingRequests.filter(r => r.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="outgoing">
              Outgoing ({outgoingRequests.filter(r => r.status === 'pending').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="max-h-96 overflow-y-auto">
            {incomingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No incoming payment requests
              </div>
            ) : (
              <div className="space-y-2">
                {incomingRequests.map((request) => renderRequestCard(request, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="max-h-96 overflow-y-auto">
            {outgoingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No outgoing payment requests
              </div>
            ) : (
              <div className="space-y-2">
                {outgoingRequests.map((request) => renderRequestCard(request, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentRequestsModal;
