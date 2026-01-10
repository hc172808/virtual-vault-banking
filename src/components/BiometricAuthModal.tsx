import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Fingerprint, ScanFace, AlertTriangle, Check } from "lucide-react";
import { useNativeBiometrics } from "@/hooks/useNativeBiometrics";

interface BiometricAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: () => void;
  onFallbackToPin: () => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

const BiometricAuthModal: React.FC<BiometricAuthModalProps> = ({
  open,
  onOpenChange,
  onVerify,
  onFallbackToPin,
  title = "Biometric Authentication",
  description = "Use your fingerprint or face to verify this transaction",
  isLoading = false,
}) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  
  const { 
    isAvailable: biometricAvailable, 
    authenticate, 
    getBiometryLabel,
    isLoading: biometricLoading 
  } = useNativeBiometrics();

  useEffect(() => {
    if (open && biometricAvailable && !biometricLoading) {
      startBiometricAuth();
    }
  }, [open, biometricAvailable, biometricLoading]);

  const startBiometricAuth = async () => {
    setStatus('scanning');
    setErrorMessage("");

    const result = await authenticate('Verify your identity');

    if (result.verified) {
      setStatus('success');
      setTimeout(() => {
        onVerify();
        onOpenChange(false);
      }, 500);
    } else {
      setStatus('error');
      setErrorMessage(result.error || 'Authentication failed');
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrorMessage("");
    onOpenChange(false);
  };

  const handleFallbackToPin = () => {
    handleClose();
    onFallbackToPin();
  };

  const BiometricIcon = () => {
    const label = getBiometryLabel();
    if (label === 'Face ID') {
      return (
        <div className="flex flex-col items-center gap-2">
          <ScanFace className={`w-12 h-12 ${
            status === 'scanning' 
              ? 'text-primary animate-pulse' 
              : status === 'error'
              ? 'text-destructive'
              : 'text-muted-foreground'
          }`} />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-2">
        <Fingerprint className={`w-12 h-12 ${
          status === 'scanning' 
            ? 'text-primary animate-pulse' 
            : status === 'error'
            ? 'text-destructive'
            : 'text-muted-foreground'
        }`} />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Fingerprint className="w-5 h-5 mr-2" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Biometric Icon Animation */}
          <div className="flex justify-center">
            <div className={`relative p-8 rounded-full ${
              status === 'scanning' 
                ? 'bg-primary/10 animate-pulse' 
                : status === 'success'
                ? 'bg-green-100 dark:bg-green-900/30'
                : status === 'error'
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-muted'
            }`}>
              {status === 'success' ? (
                <Check className="w-16 h-16 text-green-600" />
              ) : (
                <BiometricIcon />
              )}
            </div>
          </div>

          {/* Status Message */}
          <div className="text-center">
            {status === 'scanning' && (
              <p className="text-muted-foreground">
                {getBiometryLabel() === 'Face ID' 
                  ? 'Look at your device...' 
                  : 'Touch the sensor...'}
              </p>
            )}
            {status === 'success' && (
              <p className="text-green-600 font-medium">
                Authentication successful!
              </p>
            )}
            {status === 'idle' && !biometricAvailable && (
              <p className="text-muted-foreground">
                Biometric authentication is not available on this device
              </p>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {(status === 'error' || status === 'idle') && (
              <Button
                onClick={startBiometricAuth}
                disabled={isLoading || !biometricAvailable}
                className="w-full"
              >
                <Fingerprint className="w-4 h-4 mr-2" />
                {status === 'error' ? 'Try Again' : 'Authenticate'}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={handleFallbackToPin}
              disabled={isLoading}
              className="w-full"
            >
              Use PIN Instead
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BiometricAuthModal;
