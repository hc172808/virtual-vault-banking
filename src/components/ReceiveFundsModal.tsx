import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, QrCode, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";

interface ReceiveFundsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

const ReceiveFundsModal: React.FC<ReceiveFundsModalProps> = ({
  open,
  onOpenChange,
  userId,
  userName,
}) => {
  const { toast } = useToast();
  
  const qrValue = `STABLECOIN:${userId}:${userName}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrValue);
    toast({
      title: "Copied!",
      description: "Your receive code has been copied to clipboard",
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <QrCode className="h-5 w-5" />
            Receive Funds
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {/* QR Code Display */}
          <div className="bg-white p-4 rounded-xl shadow-lg">
            <QRCodeSVG
              value={qrValue}
              size={200}
              level="H"
              includeMargin={true}
              className="rounded-lg"
            />
          </div>

          {/* User Info */}
          <div className="text-center space-y-1">
            <p className="font-semibold text-lg">{userName}</p>
            <p className="text-sm text-muted-foreground">
              Scan this QR code to send funds
            </p>
          </div>

          {/* Copy Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Receive Code
          </Button>

          {/* Close Button */}
          <Button
            variant="default"
            className="w-full"
            onClick={handleClose}
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveFundsModal;
