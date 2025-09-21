import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Eye, EyeOff, Copy, Lock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CardViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: {
    full_name: string;
    email: string;
    balance: number;
  } | null;
}

const CardViewModal: React.FC<CardViewModalProps> = ({ open, onOpenChange, userProfile }) => {
  const { toast } = useToast();
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [showCVV, setShowCVV] = useState(false);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

  // Generate realistic card details
  const cardNumber = "4532 1234 5678 9012";
  const expiryDate = "12/28";
  const cvv = "123";
  const cardholderName = userProfile?.full_name?.toUpperCase() || "CARDHOLDER NAME";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ''));
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const toggleCardSide = () => {
    setCardSide(cardSide === 'front' ? 'back' : 'front');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Card Details
          </DialogTitle>
          <DialogDescription>
            View your card information and manage settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card Preview */}
          <div className="relative">
            <div 
              className="w-full max-w-md mx-auto cursor-pointer transform transition-transform hover:scale-105"
              onClick={toggleCardSide}
            >
              <div className="relative w-full h-56 rounded-xl shadow-lg overflow-hidden">
                {cardSide === 'front' ? (
                  // Card Front
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-6 text-white relative">
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        STABLECOIN
                      </Badge>
                    </div>
                    
                    <div className="absolute top-4 left-4">
                      <div className="w-12 h-8 bg-yellow-400 rounded"></div>
                    </div>

                    <div className="absolute bottom-16 left-6 right-6">
                      <div className="text-xl font-mono tracking-wider mb-4">
                        {showCardNumber ? cardNumber : "•••• •••• •••• " + cardNumber.slice(-4)}
                      </div>
                      
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-xs opacity-70">CARDHOLDER NAME</div>
                          <div className="text-sm font-semibold">{cardholderName}</div>
                        </div>
                        <div>
                          <div className="text-xs opacity-70">EXPIRES</div>
                          <div className="text-sm font-semibold">{expiryDate}</div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-4 right-6">
                      <div className="text-lg font-bold">StableCoin</div>
                    </div>
                  </div>
                ) : (
                  // Card Back
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-6 text-white relative">
                    <div className="w-full h-10 bg-black mt-4 mb-6"></div>
                    
                    <div className="mb-4">
                      <div className="text-xs opacity-70 mb-1">CVV</div>
                      <div className="w-16 h-6 bg-white text-black flex items-center justify-center text-sm font-mono">
                        {showCVV ? cvv : "•••"}
                      </div>
                    </div>

                    <div className="text-xs space-y-2 mt-8">
                      <div>This card is property of StableCoin Bank</div>
                      <div>If found, please call +1-800-STABLE</div>
                      <div>customerservice@stablecoin.com</div>
                    </div>

                    <div className="absolute bottom-4 right-6">
                      <div className="text-lg font-bold">StableCoin</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-center mt-2">
              <Button variant="ghost" size="sm" onClick={toggleCardSide}>
                Click to flip card
              </Button>
            </div>
          </div>

          {/* Card Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Card Number</h3>
                <div className="flex items-center justify-between">
                  <span className="font-mono">
                    {showCardNumber ? cardNumber : "•••• •••• •••• " + cardNumber.slice(-4)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCardNumber(!showCardNumber)}
                    >
                      {showCardNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(cardNumber, "Card number")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Security Code (CVV)</h3>
                <div className="flex items-center justify-between">
                  <span className="font-mono">
                    {showCVV ? cvv : "•••"}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCVV(!showCVV)}
                    >
                      {showCVV ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(cvv, "CVV")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Card Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Expiry Date:</span>
                  <span className="ml-2 font-mono">{expiryDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Card Type:</span>
                  <span className="ml-2">Debit Card</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="default" className="ml-2">Active</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Available Balance:</span>
                  <span className="ml-2 font-semibold">${userProfile?.balance?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-start">
              <Lock className="w-5 h-5 text-muted-foreground mt-0.5 mr-3" />
              <div className="text-sm">
                <p className="font-medium mb-1">Security Notice</p>
                <p className="text-muted-foreground">
                  Never share your card details with anyone. StableCoin will never ask for your 
                  PIN, CVV, or full card number via email or phone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CardViewModal;