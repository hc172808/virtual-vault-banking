import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Shield, DollarSign, Lock, CheckCircle } from "lucide-react";

interface HighValueVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  recipientName: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function HighValueVerificationModal({
  open,
  onOpenChange,
  amount,
  recipientName,
  onVerified,
  onCancel
}: HighValueVerificationModalProps) {
  const [pin, setPin] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setPin("");
      setConfirmed(false);
    }
  }, [open]);

  const handleVerify = async () => {
    if (!confirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that you understand this is a high-value transaction",
        variant: "destructive",
      });
      return;
    }

    if (pin.length !== 4) {
      toast({
        title: "Invalid PIN",
        description: "Please enter your 4-digit PIN",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Verify PIN
      const { data, error } = await supabase.rpc('verify_transaction_pin', {
        p_pin: pin
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; attempts_remaining?: number };

      if (!result.success) {
        toast({
          title: "PIN Verification Failed",
          description: result.error || "Invalid PIN",
          variant: "destructive",
        });
        return;
      }

      // Log high-value verification
      const { data: currentUser } = await supabase.auth.getUser();
      await supabase.from('activity_logs').insert({
        user_id: currentUser.user?.id,
        action_type: 'HIGH_VALUE_VERIFIED',
        description: `High-value transaction verified: $${amount.toFixed(2)} to ${recipientName}`
      });

      toast({
        title: "Verification Complete",
        description: "High-value transaction authorized",
      });

      onVerified();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Error",
        description: error.message || "Verification failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-warning">
            <AlertTriangle className="w-5 h-5 mr-2" />
            High-Value Transaction Alert
          </DialogTitle>
          <DialogDescription>
            This transaction requires additional verification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Details */}
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="text-xl font-bold text-warning flex items-center">
                <DollarSign className="w-5 h-5" />
                {amount.toFixed(2)} GYD
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recipient:</span>
              <span className="font-medium">{recipientName}</span>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This is a high-value transaction that exceeds the normal limit. 
              Please verify that you intend to send this amount.
            </AlertDescription>
          </Alert>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="confirm"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                I confirm this high-value transaction
              </Label>
              <p className="text-xs text-muted-foreground">
                I understand that this transfer cannot be reversed once completed.
              </p>
            </div>
          </div>

          {/* PIN Verification */}
          <div className="space-y-2">
            <Label htmlFor="pin" className="flex items-center">
              <Lock className="w-4 h-4 mr-2" />
              Enter Your Transaction PIN
            </Label>
            <Input
              id="pin"
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • •"
              className="text-center text-2xl tracking-widest"
            />
          </div>

          {/* Security Notice */}
          <div className="flex items-center text-xs text-muted-foreground">
            <Shield className="w-4 h-4 mr-2" />
            This verification is required for transactions over the high-value threshold
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel Transaction
            </Button>
            <Button
              onClick={handleVerify}
              disabled={loading || !confirmed || pin.length !== 4}
              className="flex-1"
            >
              {loading ? (
                "Verifying..."
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Authorize Transfer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
