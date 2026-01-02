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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [showPinInput, setShowPinInput] = useState(false);

  useEffect(() => {
    if (open && enableBiometric) {
      checkBiometricAvailability();
    }
  }, [open, enableBiometric]);

  useEffect(() => {
    if (open && biometricAvailable && enableBiometric && !showPinInput) {
      startBiometricAuth();
    }
  }, [open, biometricAvailable, enableBiometric, showPinInput]);

  const checkBiometricAvailability = async () => {
    try {
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricAvailable(available);
        if (!available) {
          setShowPinInput(true);
        }
      } else {
        setShowPinInput(true);
      }
    } catch (error) {
      console.log('Biometric check failed:', error);
      setBiometricAvailable(false);
      setShowPinInput(true);
    }
  };

  const startBiometricAuth = async () => {
    setBiometricStatus('scanning');

    try {
      // Use Web Authentication API for biometric verification
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Try to get or create credentials - this triggers biometric prompt
      try {
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "StableCoin Banking", id: window.location.hostname },
            user: {
              id: new Uint8Array(16),
              name: "transaction-verify",
              displayName: "Transaction Verification",
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            timeout: 60000,
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
            },
          },
        });

        if (credential) {
          setBiometricStatus('success');
          setTimeout(() => {
            if (onBiometricVerify) {
              onBiometricVerify();
            }
            handleClose();
          }, 500);
        }
      } catch (credError: any) {
        if (credError.name === 'NotAllowedError') {
          setBiometricStatus('error');
        } else {
          throw credError;
        }
      }
    } catch (error: any) {
      console.error('Biometric auth error:', error);
      setBiometricStatus('error');
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
    setShowPinInput(true);
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
            {showPinInput ? title : "Biometric Authentication"}
          </DialogTitle>
          <DialogDescription>
            {showPinInput ? description : "Use fingerprint or face to verify"}
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
                    ? 'bg-green-100'
                    : biometricStatus === 'error'
                    ? 'bg-red-100'
                    : 'bg-muted'
                }`}>
                  {biometricStatus === 'success' ? (
                    <Check className="w-12 h-12 text-green-600" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Fingerprint className={`w-10 h-10 ${
                        biometricStatus === 'scanning' 
                          ? 'text-primary animate-pulse' 
                          : biometricStatus === 'error'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`} />
                      <ScanFace className={`w-6 h-6 ${
                        biometricStatus === 'scanning' 
                          ? 'text-primary animate-pulse' 
                          : biometricStatus === 'error'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                  )}
                </div>
              </div>

              {/* Status Message */}
              <div className="text-center">
                {biometricStatus === 'scanning' && (
                  <p className="text-sm text-muted-foreground">
                    Touch sensor or look at camera...
                  </p>
                )}
                {biometricStatus === 'success' && (
                  <p className="text-sm text-green-600 font-medium">
                    Verified!
                  </p>
                )}
                {biometricStatus === 'error' && (
                  <p className="text-sm text-destructive">
                    Authentication cancelled or failed
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
              <div className="flex justify-center">
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
                    startBiometricAuth();
                  }}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Use Biometric Instead
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