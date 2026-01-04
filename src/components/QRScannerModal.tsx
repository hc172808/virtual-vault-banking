import React, { useState, useRef, useEffect, useCallback } from "react";
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
import TransactionReceiptModal from "./TransactionReceiptModal";
import jsQR from 'jsqr';
import { supabase } from "@/integrations/supabase/client";

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: {
    balance: number;
    pin_enabled?: boolean;
    full_name: string;
  } | null;
  userId: string;
  onTransactionComplete?: () => void;
  initialMode?: 'scan' | 'manual';
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({
  open,
  onOpenChange,
  userProfile,
  userId,
  onTransactionComplete,
  initialMode = 'scan',
}) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<'scan' | 'manual' | 'confirm'>(initialMode);
  const [amount, setAmount] = useState("");
  const [recipientCode, setRecipientCode] = useState("");
  const [recipientInfo, setRecipientInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const [feeInfo, setFeeInfo] = useState({ percentage: 0, fixed: 0, total: 0 });
  const [isScanning, setIsScanning] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);


  const stopCamera = useCallback(() => {
    // Stop scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
    
    // Stop camera stream
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const processScannedCode = useCallback((code: string) => {
    // Stop the camera immediately when QR code is detected
    stopCamera();
    
    // Parse the QR code data
    if (code.startsWith('STABLECOIN:')) {
      const parts = code.split(':');
      if (parts.length >= 3) {
        const recipientId = parts[1];
        const recipientName = parts[2];
        
        // Check if user is trying to send to themselves
        if (recipientId === userId) {
          toast({
            title: "Invalid Recipient",
            description: "You cannot send money to yourself",
            variant: "destructive",
          });
          return;
        }
        
        setRecipientInfo({
          id: recipientId,
          name: recipientName,
        });
        setMode('confirm');
        
        toast({
          title: "QR Code Scanned",
          description: `Found recipient: ${recipientName}`,
        });
      } else {
        toast({
          title: "Invalid QR Code",
          description: "The scanned code is not valid",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Invalid QR Code",
        description: "Please scan a valid StableCoin QR code",
        variant: "destructive",
      });
    }
  }, [stopCamera, userId, toast]);

  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Check if video is ready and has valid dimensions
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      
      if (code && code.data) {
        processScannedCode(code.data);
      }
    } catch (error) {
      console.error("QR scan error:", error);
    }
  }, [processScannedCode]);

  // Reset mode when opening
  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);
  
  useEffect(() => {
    if (open && mode === 'scan') {
      startCamera();
      loadFeeSettings();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [open, mode, stopCamera]);

  const loadFeeSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['transfer_fee_percentage', 'transfer_fee_fixed']);
      
      const feePercentage = parseFloat(data?.find((s: any) => s.setting_key === 'transfer_fee_percentage')?.setting_value || '0');
      const feeFixed = parseFloat(data?.find((s: any) => s.setting_key === 'transfer_fee_fixed')?.setting_value || '0');
      
      setFeeInfo({ percentage: feePercentage, fixed: feeFixed, total: 0 });
    } catch (error) {
      console.error('Error loading fee settings:', error);
    }
  };

  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      const amountNum = parseFloat(amount);
      const totalFee = (amountNum * feeInfo.percentage / 100) + feeInfo.fixed;
      setFeeInfo(prev => ({ ...prev, total: totalFee }));
    } else {
      setFeeInfo(prev => ({ ...prev, total: 0 }));
    }
  }, [amount, feeInfo.percentage, feeInfo.fixed]);

  const startCamera = async () => {
    try {
      // Request camera with environment facing mode (back camera on mobile)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready before starting scan
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsScanning(true);
          
          // Start scanning interval after video is ready
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
          }
          scanIntervalRef.current = setInterval(() => {
            scanQRCode();
          }, 200); // Scan every 200ms for better responsiveness
        };
      }
    } catch (error: any) {
      console.error("Camera error:", error);
      toast({
        title: "Camera Error",
        description: error.name === "NotAllowedError" 
          ? "Camera access denied. Please allow camera access in your browser settings."
          : "Could not access camera. Please enter code manually.",
        variant: "destructive",
      });
      setMode('manual');
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

    // Check if PIN is required (server will verify if PIN is set)
    if (userProfile?.pin_enabled) {
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
      // Verify PIN server-side with rate limiting
      const { data: pinResult, error: pinError } = await supabase.rpc('verify_transaction_pin', {
        p_pin: pin
      });

      if (pinError) throw pinError;

      const result = pinResult as { success: boolean; error?: string; attempts_remaining?: number; locked_until?: string };

      if (!result.success) {
        const errorMessage = result.attempts_remaining !== undefined
          ? `${result.error} (${result.attempts_remaining} attempts remaining)`
          : result.error || 'Invalid PIN';
        
        toast({
          title: "PIN Verification Failed",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // PIN verified server-side, process transaction
      await processTransaction(pendingTransaction);
      setShowPinVerification(false);
      setPendingTransaction(null);
    } catch (error: any) {
      console.error('PIN verification error:', error);
      toast({
        title: "Error",
        description: error?.message || "PIN verification failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricVerification = async () => {
    if (!pendingTransaction) return;
    
    // Biometric verified, process transaction
    await processTransaction(pendingTransaction);
    setShowPinVerification(false);
    setPendingTransaction(null);
  };

  const processTransaction = async (transaction: any) => {
    setIsLoading(true);
    try {
      // Get fee settings
      const { data: feeData } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['transfer_fee_percentage', 'transfer_fee_fixed']);
      
      const feePercentage = parseFloat(feeData?.find((s: any) => s.setting_key === 'transfer_fee_percentage')?.setting_value || '0');
      const feeFixed = parseFloat(feeData?.find((s: any) => s.setting_key === 'transfer_fee_fixed')?.setting_value || '0');
      const totalFee = (transaction.amount * feePercentage / 100) + feeFixed;
      
      // Call the process_transfer function
      const { data, error } = await supabase.rpc('process_transfer', {
        p_recipient_id: transaction.recipient.id,
        p_amount: transaction.amount,
        p_description: `QR Transfer to ${transaction.recipient.name}`
      });

      if (error) throw error;
      
      const result = data as any;
      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      // Create notification for recipient
      await supabase.from('activity_logs').insert({
        user_id: transaction.recipient.id,
        action_type: 'PAYMENT_RECEIVED',
        description: `You received $${transaction.amount.toFixed(2)} from ${userProfile?.full_name}`,
      });

      toast({
        title: "Transaction Successful",
        description: `Sent $${transaction.amount.toFixed(2)} to ${transaction.recipient.name}`,
      });

      // Set completed transaction for receipt
      setCompletedTransaction({
        id: result.transaction_id,
        amount: transaction.amount,
        fee: totalFee,
        total: transaction.amount + totalFee,
        recipientName: transaction.recipient.name,
        recipientId: transaction.recipient.id,
        senderName: userProfile?.full_name || 'You',
        senderId: userId,
        timestamp: new Date(),
        description: `QR Transfer to ${transaction.recipient.name}`,
      });

      // Reset form
      setAmount("");
      setRecipientCode("");
      setRecipientInfo(null);
      setMode('scan');
      
      // Notify parent component
      onTransactionComplete?.();
      
      // Show receipt modal
      setShowReceipt(true);
    } catch (error: any) {
      console.error('Transaction error:', error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Unable to process transaction. Please try again.",
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
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-medium">${parseFloat(amount || '0').toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Transaction Fee ({feeInfo.percentage}%):</span>
                        <span className="font-medium">${feeInfo.total.toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>${(parseFloat(amount || '0') + feeInfo.total).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>Available Balance:</span>
                        <span>${userProfile?.balance?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                    {(parseFloat(amount || '0') + feeInfo.total) > (userProfile?.balance || 0) && (
                      <span className="text-destructive text-sm block mt-2">
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
                    disabled={isLoading || !amount || parseFloat(amount) <= 0 || (parseFloat(amount) + feeInfo.total) > (userProfile?.balance || 0)}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isLoading ? "Processing..." : `Send $${(parseFloat(amount || '0') + feeInfo.total).toFixed(2)}`}
                  </Button>
                </div>
              </>
            )}

          </div>
        </DialogContent>
      </Dialog>

      {/* PIN Verification Modal with Biometric Support */}
      <PinVerificationModal
        open={showPinVerification}
        onOpenChange={setShowPinVerification}
        onVerify={handlePinVerification}
        isLoading={isLoading}
        title="Confirm Transaction"
        description="Verify your identity to confirm this transaction"
        enableBiometric={true}
        onBiometricVerify={handleBiometricVerification}
      />

      {/* Transaction Receipt Modal */}
      <TransactionReceiptModal
        open={showReceipt}
        onOpenChange={(open) => {
          setShowReceipt(open);
          if (!open) {
            onOpenChange(false);
          }
        }}
        transaction={completedTransaction}
      />
    </>
  );
};

export default QRScannerModal;