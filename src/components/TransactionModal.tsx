import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PinVerificationModal from "./PinVerificationModal";
import { Send, ArrowDownLeft, AlertTriangle, DollarSign } from "lucide-react";

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: {
    balance: number;
    pin_enabled?: boolean;
    pin_hash?: string;
  } | null;
  userId: string;
  onTransactionComplete?: () => void;
}

type TransactionType = 'send' | 'receive';

const TransactionModal: React.FC<TransactionModalProps> = ({
  open,
  onOpenChange,
  userProfile,
  userId,
  onTransactionComplete,
}) => {
  const { toast } = useToast();
  const [transactionType, setTransactionType] = useState<TransactionType>('send');
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);

  const handleSubmit = async () => {
    if (!amount || !recipient) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const transactionAmount = parseFloat(amount);
    if (transactionAmount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (transactionType === 'send' && transactionAmount > (userProfile?.balance || 0)) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough balance for this transaction",
        variant: "destructive",
      });
      return;
    }

    // Store pending transaction data
    setPendingTransaction({
      type: transactionType,
      amount: transactionAmount,
      recipient,
      description,
    });

    // Check if PIN is required
    if (userProfile?.pin_enabled && userProfile?.pin_hash) {
      setShowPinVerification(true);
    } else {
      // Process transaction without PIN
      await processTransaction({
        type: transactionType,
        amount: transactionAmount,
        recipient,
        description,
      });
    }
  };

  const handlePinVerification = async (pin: string) => {
    if (!pendingTransaction) return;

    setIsLoading(true);
    try {
      // Verify PIN
      const encoder = new TextEncoder();
      const data = encoder.encode(pin + userId);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPin = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (hashedPin !== userProfile?.pin_hash) {
        toast({
          title: "Invalid PIN",
          description: "The PIN you entered is incorrect",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // PIN verified, process transaction
      await processTransaction(pendingTransaction);
      setShowPinVerification(false);
      setPendingTransaction(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "PIN verification failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processTransaction = async (transaction: any) => {
    setIsLoading(true);
    try {
      const { type, amount, recipient, description } = transaction;
      
      // Calculate new balance
      const currentBalance = userProfile?.balance || 0;
      const newBalance = type === 'send' 
        ? currentBalance - amount 
        : currentBalance + amount;

      // Update user balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Log the transaction
      await supabase
        .from('activity_logs')
        .insert({
          action_type: type === 'send' ? 'MONEY_SENT' : 'MONEY_RECEIVED',
          description: `${type === 'send' ? 'Sent' : 'Received'} $${amount.toFixed(2)} ${type === 'send' ? 'to' : 'from'} ${recipient}${description ? ` - ${description}` : ''}`,
          user_id: userId,
        });

      toast({
        title: "Transaction Successful",
        description: `${type === 'send' ? 'Sent' : 'Received'} $${amount.toFixed(2)} successfully`,
      });

      // Reset form
      setAmount("");
      setRecipient("");
      setDescription("");
      
      // Notify parent component
      onTransactionComplete?.();
      
      // Close modal
      onOpenChange(false);
    } catch (error) {
      console.error('Transaction error:', error);
      toast({
        title: "Transaction Failed",
        description: "Unable to process transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setRecipient("");
    setDescription("");
    setPendingTransaction(null);
    setShowPinVerification(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {transactionType === 'send' ? (
                <Send className="w-5 h-5 mr-2" />
              ) : (
                <ArrowDownLeft className="w-5 h-5 mr-2" />
              )}
              {transactionType === 'send' ? 'Send Money' : 'Receive Money'}
            </DialogTitle>
            <DialogDescription>
              {transactionType === 'send' 
                ? 'Send money to another user' 
                : 'Request money from another user'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Transaction Type */}
            <div>
              <Label>Transaction Type</Label>
              <Select 
                value={transactionType} 
                onValueChange={(value: TransactionType) => setTransactionType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send">Send Money</SelectItem>
                  <SelectItem value="receive">Request Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Recipient */}
            <div>
              <Label htmlFor="recipient">
                {transactionType === 'send' ? 'Recipient' : 'Request From'}
              </Label>
              <Input
                id="recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Email or username"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this for?"
              />
            </div>

            {/* Balance Warning for Send */}
            {transactionType === 'send' && amount && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Available Balance: ${userProfile?.balance?.toFixed(2) || '0.00'}
                  {parseFloat(amount) > (userProfile?.balance || 0) && (
                    <span className="text-destructive ml-2">
                      Insufficient funds!
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* PIN Notice */}
            {userProfile?.pin_enabled && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You'll need to enter your PIN to complete this transaction.
                </AlertDescription>
              </Alert>
            )}

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
                {isLoading ? "Processing..." : 
                 transactionType === 'send' ? 'Send Money' : 'Request Money'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN Verification Modal */}
      <PinVerificationModal
        open={showPinVerification}
        onOpenChange={setShowPinVerification}
        onVerify={handlePinVerification}
        isLoading={isLoading}
      />
    </>
  );
};

export default TransactionModal;