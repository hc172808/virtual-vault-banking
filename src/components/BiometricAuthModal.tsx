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
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  useEffect(() => {
    if (open && biometricAvailable) {
      startBiometricAuth();
    }
  }, [open, biometricAvailable]);

  const checkBiometricAvailability = async () => {
    try {
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricAvailable(available);
      }
    } catch (error) {
      console.log('Biometric check failed:', error);
      setBiometricAvailable(false);
    }
  };

  const startBiometricAuth = async () => {
    setStatus('scanning');
    setErrorMessage("");

    try {
      // Use Web Authentication API for biometric verification
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname,
      };

      // Try to get credentials - this will trigger biometric prompt
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      if (credential) {
        setStatus('success');
        setTimeout(() => {
          onVerify();
          onOpenChange(false);
        }, 500);
      }
    } catch (error: any) {
      console.error('Biometric auth error:', error);
      
      // If user cancelled or biometric failed, allow retry or fallback
      if (error.name === 'NotAllowedError') {
        setStatus('error');
        setErrorMessage("Authentication cancelled or not allowed");
      } else if (error.name === 'SecurityError') {
        // No credentials registered - simulate biometric check
        await simulateBiometricAuth();
      } else {
        setStatus('error');
        setErrorMessage(error.message || "Biometric authentication failed");
      }
    }
  };

  // Fallback biometric simulation using device biometrics directly
  const simulateBiometricAuth = async () => {
    try {
      // Use a simple credential check that still requires biometric
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: "StableCoin Banking", id: window.location.hostname },
          user: {
            id: new Uint8Array(16),
            name: "user",
            displayName: "StableCoin User",
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
        setStatus('success');
        setTimeout(() => {
          onVerify();
          onOpenChange(false);
        }, 500);
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        setStatus('error');
        setErrorMessage("Authentication cancelled");
      } else {
        setStatus('error');
        setErrorMessage("Biometric not available on this device");
      }
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
                ? 'bg-green-100'
                : status === 'error'
                ? 'bg-red-100'
                : 'bg-muted'
            }`}>
              {status === 'success' ? (
                <Check className="w-16 h-16 text-green-600" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Fingerprint className={`w-12 h-12 ${
                    status === 'scanning' 
                      ? 'text-primary animate-pulse' 
                      : status === 'error'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`} />
                  <ScanFace className={`w-8 h-8 ${
                    status === 'scanning' 
                      ? 'text-primary animate-pulse' 
                      : status === 'error'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`} />
                </div>
              )}
            </div>
          </div>

          {/* Status Message */}
          <div className="text-center">
            {status === 'scanning' && (
              <p className="text-muted-foreground">
                Place your finger on the sensor or look at the camera...
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
