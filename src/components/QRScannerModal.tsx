import React, { useState, useRef, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Camera, Send, DollarSign, User } from "lucide-react";
import PinVerificationModal from "./PinVerificationModal";

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: {
    balance: number;
    pin_enabled?: boolean;
    pin_hash?: string;
    full_name: string;
  } | null;
  userId: string;
  onTransactionComplete?: () => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({
  open,
  onOpenChange,
  userProfile,
  userId,
  onTransactionComplete,
}) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<'scan' | 'manual' | 'confirm'>('scan');
  const [amount, setAmount] = useState("");
  const [recipientCode, setRecipientCode] = useState("");
  const [recipientInfo, setRecipientInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate user's QR code data
  const userQRData = `STABLECOIN:${userId}:${userProfile?.full_name}`;

  useEffect(() => {
    if (open && mode === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [open, mode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please enter code manually.",
        variant: "destructive",
      });
      setMode('manual');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const handleManualEntry = () => {
    if (!recipientCode) {
      toast({
        title: "Error",
        description: "Please enter a recipient code",
        variant: "destructive",
      });
      return;
    }

    // Parse the QR code data
    if (recipientCode.startsWith('STABLECOIN:')) {
      const parts = recipientCode.split(':');
      if (parts.length >= 3) {
        const recipientId = parts[1];
        const recipientName = parts[2];
        
        setRecipientInfo({
          id: recipientId,
          name: recipientName,
        });
        setMode('confirm');
      } else {
        toast({
          title: "Invalid Code",
          description: "The entered code is not valid",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid StableCoin QR code",
        variant: "destructive",
      });
    }
  };

  const handleSendMoney = () => {
    if (!amount || !recipientInfo) {
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

    if (transactionAmount > (userProfile?.balance || 0)) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough balance for this transaction",
        variant: "destructive",
      });
      return;
    }

    // Store pending transaction data
    setPendingTransaction({
      amount: transactionAmount,
      recipient: recipientInfo,
    });

    // Check if PIN is required
    if (userProfile?.pin_enabled && userProfile?.pin_hash) {
      setShowPinVerification(true);
    } else {
      processTransaction({
        amount: transactionAmount,
        recipient: recipientInfo,
      });
    }
  };

  const handlePinVerification = async (pin: string) => {
    if (!pendingTransaction || !userProfile) return;

    setIsLoading(true);
    try {
      // Verify PIN
      const encoder = new TextEncoder();
      const data = encoder.encode(pin + userId);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPin = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (hashedPin !== userProfile.pin_hash) {
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
      // Simulate transaction processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Transaction Successful",
        description: `Sent $${transaction.amount.toFixed(2)} to ${transaction.recipient.name}`,
      });

      // Reset form
      setAmount("");
      setRecipientCode("");
      setRecipientInfo(null);
      setMode('scan');
      
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
    setRecipientCode("");
    setRecipientInfo(null);
    setMode('scan');
    setPendingTransaction(null);
    setShowPinVerification(false);
    stopCamera();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <QrCode className="w-5 h-5 mr-2" />
              Send Money via QR Code
            </DialogTitle>
            <DialogDescription>
              Scan recipient's QR code or enter their code manually
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {mode === 'scan' && (
              <>
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 bg-black rounded-lg object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 border-2 border-dashed border-white/50 rounded-lg m-4"></div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setMode('manual')}
                    className="flex-1"
                  >
                    Enter Code Manually
                  </Button>
                </div>

                <Alert>
                  <QrCode className="h-4 w-4" />
                  <AlertDescription>
                    Point your camera at the recipient's QR code to scan
                  </AlertDescription>
                </Alert>
              </>
            )}

            {mode === 'manual' && (
              <>
                <div>
                  <Label htmlFor="recipient-code">Recipient Code</Label>
                  <Input
                    id="recipient-code"
                    value={recipientCode}
                    onChange={(e) => setRecipientCode(e.target.value)}
                    placeholder="STABLECOIN:USER_ID:NAME"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setMode('scan')}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Scan Instead
                  </Button>
                  <Button
                    onClick={handleManualEntry}
                    className="flex-1"
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}

            {mode === 'confirm' && recipientInfo && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sending To</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">{recipientInfo.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {recipientInfo.id.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

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

                <Alert>
                  <AlertDescription>
                    Available Balance: ${userProfile?.balance?.toFixed(2) || '0.00'}
                    {parseFloat(amount) > (userProfile?.balance || 0) && (
                      <span className="text-destructive ml-2">
                        Insufficient funds!
                      </span>
                    )}
                  </AlertDescription>
                </Alert>

                {userProfile?.pin_enabled && (
                  <Alert>
                    <AlertDescription>
                      You'll need to enter your PIN to complete this transaction.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMode('scan');
                      setRecipientInfo(null);
                      setAmount("");
                    }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSendMoney}
                    disabled={isLoading || !amount || parseFloat(amount) <= 0}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isLoading ? "Processing..." : "Send Money"}
                  </Button>
                </div>
              </>
            )}

            {/* Show user's own QR code */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium">Your QR Code</Label>
              <div className="mt-2 p-4 bg-muted rounded-lg text-center">
                <div className="w-32 h-32 mx-auto bg-white rounded-lg flex items-center justify-center mb-2">
                  <QrCode className="w-24 h-24" />
                </div>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {userQRData}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Show this to receive money
                </p>
              </div>
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
        title="Confirm Transaction"
        description="Enter your PIN to confirm this transaction"
      />
    </>
  );
};

export default QRScannerModal;