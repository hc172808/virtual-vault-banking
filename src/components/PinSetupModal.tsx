import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Shield, AlertTriangle } from "lucide-react";

interface PinSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onPinSet: () => void;
  title?: string;
  description?: string;
}

const PinSetupModal: React.FC<PinSetupModalProps> = ({
  open,
  onOpenChange,
  userId,
  onPinSet,
  title = "Set Transaction PIN",
  description = "Create a 4-digit PIN to secure your transactions",
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + userId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleCreateStep = () => {
    if (newPin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }
    
    // Check for weak PINs
    const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '3210'];
    if (weakPins.includes(newPin)) {
      setError("This PIN is too weak. Please choose a different PIN.");
      return;
    }
    
    setStep('confirm');
    setError("");
  };

  const handleConfirmPin = async () => {
    if (confirmPin !== newPin) {
      setError("PINs do not match. Please try again.");
      setConfirmPin("");
      return;
    }

    setIsLoading(true);
    try {
      const hashedPin = await hashPin(newPin);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          pin_hash: hashedPin,
          pin_enabled: true
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Log the activity
      await supabase
        .from('activity_logs')
        .insert({
          action_type: 'PIN_CREATED',
          description: 'Transaction PIN created for secure transactions',
          user_id: userId,
        });

      toast({
        title: "PIN Created",
        description: "Your transaction PIN has been set successfully",
      });

      onPinSet();
      handleClose();
    } catch (error: any) {
      console.error('Error setting PIN:', error);
      setError("Failed to set PIN. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewPin("");
    setConfirmPin("");
    setError("");
    setStep('create');
    onOpenChange(false);
  };

  const handleBack = () => {
    setConfirmPin("");
    setError("");
    setStep('create');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Security Notice */}
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              {step === 'create' 
                ? "Your PIN will be required for all transactions to keep your funds secure."
                : "Re-enter your PIN to confirm."}
            </AlertDescription>
          </Alert>

          {/* PIN Input */}
          <div className="flex flex-col items-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {step === 'create' ? 'Create your 4-digit PIN' : 'Confirm your PIN'}
            </p>
            
            {step === 'create' ? (
              <InputOTP
                maxLength={4}
                value={newPin}
                onChange={(value) => {
                  setNewPin(value);
                  setError("");
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            ) : (
              <InputOTP
                maxLength={4}
                value={confirmPin}
                onChange={(value) => {
                  setConfirmPin(value);
                  setError("");
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {step === 'create' ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateStep}
                  disabled={newPin.length !== 4 || isLoading}
                  className="flex-1"
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmPin}
                  disabled={confirmPin.length !== 4 || isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Setting PIN..." : "Set PIN"}
                </Button>
              </>
            )}
          </div>

          {/* Tips */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Choose a PIN you can remember but is hard to guess</p>
            <p>• Avoid using birth dates or sequential numbers</p>
            <p>• Never share your PIN with anyone</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinSetupModal;
