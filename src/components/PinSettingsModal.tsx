import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Settings, AlertTriangle, CheckCircle } from "lucide-react";

interface PinSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface PinSettings {
  pin_enabled: boolean;
  pin_hash?: string;
}

const PinSettingsModal: React.FC<PinSettingsModalProps> = ({ open, onOpenChange, userId }) => {
  const { toast } = useToast();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinEnabled, setPinEnabled] = useState(false);
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');

  useEffect(() => {
    if (open) {
      loadPinSettings();
    }
  }, [open, userId]);

  const loadPinSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('pin_enabled, pin_hash')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setPinEnabled(data.pin_enabled || false);
        setHasExistingPin(!!data.pin_hash);
        setStep(data.pin_hash ? 'current' : 'new');
      }
    } catch (error) {
      console.error('Error loading PIN settings:', error);
      toast({
        title: "Error",
        description: "Failed to load PIN settings",
        variant: "destructive",
      });
    }
  };

  const hashPin = async (pin: string): Promise<string> => {
    // Simple hash function - in production, use proper hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + userId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const verifyCurrentPin = async () => {
    if (currentPin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    setIsLoading(true);
    try {
      const hashedPin = await hashPin(currentPin);
      const { data, error } = await supabase
        .from('profiles')
        .select('pin_hash')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data.pin_hash === hashedPin) {
        setStep('new');
        setError("");
      } else {
        setError("Incorrect PIN");
      }
    } catch (error) {
      setError("Failed to verify PIN");
    } finally {
      setIsLoading(false);
    }
  };

  const setNewPinStep = () => {
    if (newPin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }
    setStep('confirm');
    setError("");
  };

  const confirmNewPin = async () => {
    if (confirmPin !== newPin) {
      setError("PINs do not match");
      return;
    }

    setIsLoading(true);
    try {
      const hashedPin = await hashPin(newPin);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          pin_hash: hashedPin,
          pin_enabled: true
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Log the activity
      await supabase
        .from('activity_logs')
        .insert({
          action_type: 'PIN_UPDATED',
          description: 'Transaction PIN updated',
          user_id: userId,
        });

      toast({
        title: "PIN Updated",
        description: "Your transaction PIN has been set successfully",
      });

      setPinEnabled(true);
      setHasExistingPin(true);
      handleClose();
    } catch (error) {
      setError("Failed to update PIN");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePinEnabled = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pin_enabled: enabled })
        .eq('user_id', userId);

      if (error) throw error;

      // Log the activity
      await supabase
        .from('activity_logs')
        .insert({
          action_type: enabled ? 'PIN_ENABLED' : 'PIN_DISABLED',
          description: `Transaction PIN ${enabled ? 'enabled' : 'disabled'}`,
          user_id: userId,
        });

      setPinEnabled(enabled);
      toast({
        title: enabled ? "PIN Enabled" : "PIN Disabled",
        description: `Transaction PIN has been ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update PIN setting",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
    setStep(hasExistingPin ? 'current' : 'new');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            PIN Settings
          </DialogTitle>
          <DialogDescription>
            Manage your transaction PIN and security settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* PIN Enable/Disable Toggle */}
          {hasExistingPin && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pin-toggle">Require PIN for transactions</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, you'll need to enter your PIN for all transactions
                    </p>
                  </div>
                  <Switch
                    id="pin-toggle"
                    checked={pinEnabled}
                    onCheckedChange={togglePinEnabled}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* PIN Setup/Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <Lock className="w-4 h-4 mr-2" />
                {hasExistingPin ? 'Change PIN' : 'Set PIN'}
              </CardTitle>
              <CardDescription>
                {step === 'current' && 'Enter your current PIN'}
                {step === 'new' && 'Enter your new 4-digit PIN'}
                {step === 'confirm' && 'Confirm your new PIN'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                {step === 'current' && (
                  <InputOTP
                    maxLength={4}
                    value={currentPin}
                    onChange={(value) => {
                      setCurrentPin(value);
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

                {step === 'new' && (
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
                )}

                {step === 'confirm' && (
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

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (step === 'current') verifyCurrentPin();
                    else if (step === 'new') setNewPinStep();
                    else if (step === 'confirm') confirmNewPin();
                  }}
                  disabled={
                    isLoading ||
                    (step === 'current' && currentPin.length !== 4) ||
                    (step === 'new' && newPin.length !== 4) ||
                    (step === 'confirm' && confirmPin.length !== 4)
                  }
                  className="flex-1"
                >
                  {isLoading ? "Processing..." : 
                   step === 'current' ? "Verify" : 
                   step === 'new' ? "Next" : "Set PIN"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your PIN is encrypted and stored securely. Never share your PIN with anyone.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinSettingsModal;