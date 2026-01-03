import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import {
  KeyRound,
  Mail,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from "lucide-react";

interface PasswordRecoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PasswordRecoveryModal: React.FC<PasswordRecoveryModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendResetLink = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setStep("sent");
      toast({
        title: "Reset Link Sent",
        description: "Check your email for the password reset link",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("email");
    setEmail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <KeyRound className="w-5 h-5 mr-2" />
            Password Recovery
          </DialogTitle>
          <DialogDescription>
            Reset your account password
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <div className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Enter your email address and we'll send you a link to reset your password.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="recovery-email">Email Address</Label>
              <Input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleSendResetLink}
              disabled={loading || !email}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={handleClose}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Check Your Email</h3>
              <p className="text-center text-muted-foreground mt-2">
                We've sent a password reset link to:
              </p>
              <p className="font-medium mt-1">{email}</p>
            </div>

            <Alert>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Check your spam folder if you don't see the email</li>
                  <li>The link will expire in 24 hours</li>
                  <li>You can only use the link once</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              onClick={() => {
                setStep("email");
                setEmail("");
              }}
              className="w-full"
            >
              Send to Different Email
            </Button>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PasswordRecoveryModal;
