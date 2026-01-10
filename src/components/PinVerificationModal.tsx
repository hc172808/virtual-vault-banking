import React, { useState, useEffect } from "react";
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
import { Lock, AlertTriangle, Fingerprint, ScanFace, Check } from "lucide-react";
import { useNativeBiometrics } from "@/hooks/useNativeBiometrics";

interface PinVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (pin: string) => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
  enableBiometric?: boolean;
  onBiometricVerify?: () => void;
}

const PinVerificationModal: React.FC<PinVerificationModalProps> = ({
  open,
  onOpenChange,
  onVerify,
  title = "Enter Transaction PIN",
  description = "Please enter your 4-digit PIN to confirm this transaction",
  isLoading = false,
  enableBiometric = true,
  onBiometricVerify,
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [showPinInput, setShowPinInput] = useState(false);
  
  const { 
    isAvailable: biometricAvailable, 
    authenticate, 
    getBiometryLabel,
    isLoading: biometricLoading 
  } = useNativeBiometrics();

  useEffect(() => {
    if (open && enableBiometric && biometricAvailable && !showPinInput) {
      startBiometricAuth();
    }
  }, [open, enableBiometric, biometricAvailable, showPinInput]);

  useEffect(() => {
    if (open && !biometricLoading && !biometricAvailable) {
      setShowPinInput(true);
    }
  }, [open, biometricLoading, biometricAvailable]);

  const startBiometricAuth = async () => {
    setBiometricStatus('scanning');

    const result = await authenticate('Verify transaction');

    if (result.verified) {
      setBiometricStatus('success');
      setTimeout(() => {
        if (onBiometricVerify) {
          onBiometricVerify();
        }
        handleClose();
      }, 500);
    } else {
      setBiometricStatus('error');
      setError(result.error || 'Authentication failed');
    }
  };

  const handleSubmit = () => {
    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }
    
    setError("");
    onVerify(pin);
  };

  const handleClose = () => {
    setPin("");
    setError("");
    setBiometricStatus('idle');
    setShowPinInput(false);
    onOpenChange(false);
  };

  const switchToPinInput = () => {
    setBiometricStatus('idle');
    setError("");
    setShowPinInput(true);
  };

  const BiometricIcon = () => {
    const label = getBiometryLabel();
    if (label === 'Face ID') {
      return <ScanFace className={`w-10 h-10 ${
        biometricStatus === 'scanning' 
          ? 'text-primary animate-pulse' 
          : biometricStatus === 'error'
          ? 'text-destructive'
          : 'text-muted-foreground'
      }`} />;
    }
    return <Fingerprint className={`w-10 h-10 ${
      biometricStatus === 'scanning' 
        ? 'text-primary animate-pulse' 
        : biometricStatus === 'error'
        ? 'text-destructive'
        : 'text-muted-foreground'
    }`} />;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {showPinInput ? (
              <Lock className="w-5 h-5 mr-2" />
            ) : (
              <Fingerprint className="w-5 h-5 mr-2" />
            )}
            {showPinInput ? title : `${getBiometryLabel()} Authentication`}
          </DialogTitle>
          <DialogDescription>
            {showPinInput ? description : `Use ${getBiometryLabel().toLowerCase()} to verify`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Biometric Mode */}
          {!showPinInput && biometricAvailable && (
            <div className="space-y-4">
              {/* Biometric Icon Animation */}
              <div className="flex justify-center py-4">
                <div className={`relative p-8 rounded-full ${
                  biometricStatus === 'scanning' 
                    ? 'bg-primary/10 animate-pulse' 
                    : biometricStatus === 'success'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : biometricStatus === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-muted'
                }`}>
                  {biometricStatus === 'success' ? (
                    <Check className="w-12 h-12 text-green-600" />
                  ) : (
                    <BiometricIcon />
                  )}
                </div>
              </div>

              {/* Status Message */}
              <div className="text-center">
                {biometricStatus === 'scanning' && (
                  <p className="text-sm text-muted-foreground">
                    {getBiometryLabel() === 'Face ID' 
                      ? 'Look at your device...' 
                      : 'Touch the sensor...'}
                  </p>
                )}
                {biometricStatus === 'success' && (
                  <p className="text-sm text-green-600 font-medium">
                    Verified!
                  </p>
                )}
                {biometricStatus === 'error' && error && (
                  <p className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>

              {/* Action Buttons for Biometric Mode */}
              <div className="flex flex-col gap-2">
                {biometricStatus === 'error' && (
                  <Button onClick={startBiometricAuth} disabled={isLoading}>
                    <Fingerprint className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={switchToPinInput}
                  disabled={isLoading}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Use PIN Instead
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* PIN Input Mode */}
          {(showPinInput || !biometricAvailable) && (
            <>
              <div className="flex justify-center py-4">
                <InputOTP
                  maxLength={4}
                  value={pin}
                  onChange={(value) => {
                    setPin(value);
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
                  onClick={handleSubmit}
                  disabled={pin.length !== 4 || isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Verifying..." : "Verify PIN"}
                </Button>
              </div>

              {/* Option to try biometric if available */}
              {biometricAvailable && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowPinInput(false);
                    setError("");
                    startBiometricAuth();
                  }}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Use {getBiometryLabel()} Instead
                </Button>
              )}

              <div className="text-xs text-muted-foreground text-center">
                Forgot your PIN? Contact customer support for assistance.
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinVerificationModal;
