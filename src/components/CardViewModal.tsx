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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Card Details
          </DialogTitle>
          <DialogDescription>
            View your card information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Compact Card Preview */}
          <div className="relative">
            <div 
              className="w-full cursor-pointer transform transition-transform hover:scale-105"
              onClick={toggleCardSide}
            >
              <div className="relative w-full aspect-[1.586] rounded-xl shadow-lg overflow-hidden">
                {cardSide === 'front' ? (
                  // Card Front
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-4 text-white relative">
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="bg-white/20 text-white text-xs px-2 py-0.5">
                        STABLECOIN
                      </Badge>
                    </div>
                    
                    <div className="absolute top-3 left-3">
                      <div className="w-10 h-6 bg-yellow-400 rounded"></div>
                    </div>

                    <div className="absolute bottom-10 left-4 right-4">
                      <div className="text-base font-mono tracking-wider mb-2">
                        {showCardNumber ? cardNumber : "•••• •••• •••• " + cardNumber.slice(-4)}
                      </div>
                      
                      <div className="flex justify-between items-end text-xs">
                        <div>
                          <div className="opacity-70">CARDHOLDER</div>
                          <div className="font-semibold">{cardholderName}</div>
                        </div>
                        <div>
                          <div className="opacity-70">EXPIRES</div>
                          <div className="font-semibold">{expiryDate}</div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute bottom-3 right-4 text-sm font-bold">
                      StableCoin
                    </div>
                  </div>
                ) : (
                  // Card Back  
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-4 text-white relative">
                    <div className="w-full h-8 bg-black mt-3 mb-4"></div>
                    
                    <div className="mb-3">
                      <div className="text-xs opacity-70 mb-1">CVV</div>
                      <div className="w-12 h-5 bg-white text-black flex items-center justify-center text-xs font-mono">
                        {showCVV ? cvv : "•••"}
                      </div>
                    </div>

                    <div className="text-[10px] space-y-1 mt-6 opacity-80">
                      <div>StableCoin Bank</div>
                      <div>+1-800-STABLE</div>
                    </div>

                    <div className="absolute bottom-3 right-4 text-sm font-bold">
                      StableCoin
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-center mt-2">
              <Button variant="ghost" size="sm" onClick={toggleCardSide} className="text-xs">
                Click to flip card
              </Button>
            </div>
          </div>

          {/* Compact Card Controls */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <h3 className="text-xs font-semibold mb-2">Card Number</h3>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">
                    {showCardNumber ? cardNumber : "•••• " + cardNumber.slice(-4)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowCardNumber(!showCardNumber)}
                    >
                      {showCardNumber ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(cardNumber, "Card number")}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <h3 className="text-xs font-semibold mb-2">CVV</h3>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">
                    {showCVV ? cvv : "•••"}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowCVV(!showCVV)}
                    >
                      {showCVV ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(cvv, "CVV")}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compact Card Info */}
          <Card>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground mb-1">Type</div>
                  <div className="font-medium">Virtual Debit</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Status</div>
                  <Badge variant="default" className="text-xs">Active</Badge>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Expires</div>
                  <div className="font-medium">{expiryDate}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Balance</div>
                  <div className="font-medium">${userProfile?.balance?.toFixed(2) || '0.00'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CardViewModal;