import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownLeft, DollarSign, User, Send, Plus, Minus } from "lucide-react";

interface RequestFundsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userProfile: {
    full_name: string;
  } | null;
  onRequestSent?: () => void;
}

const RequestFundsModal: React.FC<RequestFundsModalProps> = ({
  open,
  onOpenChange,
  userId,
  userProfile,
  onRequestSent,
}) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAmountChange = (value: string) => {
    // Only allow valid decimal numbers
    if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
      setAmount(value);
    }
  };

  const adjustAmount = (adjustment: number) => {
    const currentAmount = parseFloat(amount) || 0;
    const newAmount = Math.max(0, currentAmount + adjustment);
    setAmount(newAmount.toFixed(2));
  };

  const handleSubmit = async () => {
    if (!amount || !recipient) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const requestAmount = parseFloat(amount);
    if (requestAmount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Resolve recipient ID from email or UUID
      const isUuid = (v: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

      let recipientId = '';

      if (isUuid(recipient)) {
        recipientId = recipient;
      } else if (recipient.includes('@')) {
        const { data: rec, error: recErr } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', recipient)
          .maybeSingle();
        if (recErr) throw recErr;
        if (!rec) {
          toast({
            title: 'Recipient not found',
            description: 'No user found with that email.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        recipientId = rec.user_id as string;
      } else {
        toast({
          title: 'Invalid recipient',
          description: 'Enter a valid user ID (UUID) or email address.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Check not sending to self
      if (recipientId === userId) {
        toast({
          title: 'Invalid recipient',
          description: 'You cannot request funds from yourself.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Create payment request
      const { error } = await supabase
        .from('payment_requests')
        .insert({
          sender_id: userId,
          recipient_id: recipientId,
          amount: requestAmount,
          description: description || `Payment request from ${userProfile?.full_name || 'User'}`,
          status: 'pending',
        });

      if (error) throw error;

      // Create notification for recipient
      await supabase.from('activity_logs').insert({
        user_id: recipientId,
        action_type: 'PAYMENT_REQUEST_RECEIVED',
        description: `${userProfile?.full_name || 'Someone'} is requesting $${requestAmount.toFixed(2)} from you`,
      });

      toast({
        title: 'Request Sent',
        description: `Payment request for $${requestAmount.toFixed(2)} has been sent`,
      });

      // Reset form
      setAmount('');
      setRecipient('');
      setDescription('');
      
      onRequestSent?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Request error:', error);
      toast({
        title: 'Request Failed',
        description: error?.message || 'Unable to send request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setRecipient('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ArrowDownLeft className="w-5 h-5 mr-2" />
            Request Funds
          </DialogTitle>
          <DialogDescription>
            Send a payment request to another user. They'll receive a notification to confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount with +/- controls */}
          <div>
            <Label htmlFor="amount">Amount (GYD)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustAmount(-10)}
                disabled={isLoading}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="pl-10 text-center text-lg"
                  placeholder="0.00"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustAmount(10)}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-center gap-2 mt-2">
              {[50, 100, 500, 1000].map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setAmount(preset.toString())}
                  disabled={isLoading}
                >
                  ${preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Recipient */}
          <div>
            <Label htmlFor="recipient">Request From</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="pl-10"
                placeholder="Email address or User ID"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this for?"
              className="mt-1"
            />
          </div>

          {/* Info Alert */}
          <Alert>
            <Send className="h-4 w-4" />
            <AlertDescription>
              The recipient will receive a notification and can choose to accept or reject your request.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !amount || !recipient}
              className="flex-1"
            >
              {isLoading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RequestFundsModal;
