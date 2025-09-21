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
import { Lock, AlertTriangle } from "lucide-react";

interface PinVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (pin: string) => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

const PinVerificationModal: React.FC<PinVerificationModalProps> = ({
  open,
  onOpenChange,
  onVerify,
  title = "Enter Transaction PIN",
  description = "Please enter your 4-digit PIN to confirm this transaction",
  isLoading = false,
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Lock className="w-5 h-5 mr-2" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          <div className="text-xs text-muted-foreground text-center">
            Forgot your PIN? Contact customer support for assistance.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinVerificationModal;