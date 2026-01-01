import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  CheckCircle, 
  Copy, 
  X,
  ArrowRight,
  Calendar,
  Hash
} from "lucide-react";
import jsPDF from "jspdf";

interface TransactionReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    amount: number;
    fee: number;
    total: number;
    recipientName: string;
    recipientId: string;
    senderName: string;
    senderId: string;
    timestamp: Date;
    description?: string;
  } | null;
}

const TransactionReceiptModal: React.FC<TransactionReceiptModalProps> = ({
  open,
  onOpenChange,
  transaction,
}) => {
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!transaction) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const copyTransactionId = () => {
    navigator.clipboard.writeText(transaction.id);
    toast({
      title: "Copied",
      description: "Transaction ID copied to clipboard",
    });
  };

  const downloadReceipt = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Transaction Receipt", 105, 25, { align: "center" });
    
    // Status badge
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(80, 45, 50, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("COMPLETED", 105, 53, { align: "center" });
    
    // Transaction details
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    let y = 75;
    
    doc.setFont("helvetica", "bold");
    doc.text("Transaction Details", 20, y);
    y += 10;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const details = [
      ["Transaction ID", transaction.id],
      ["Date & Time", formatDate(transaction.timestamp)],
      ["From", transaction.senderName],
      ["To", transaction.recipientName],
      ["Amount", `$${transaction.amount.toFixed(2)} GYD`],
      ["Transaction Fee", `$${transaction.fee.toFixed(2)} GYD`],
      ["Total Debited", `$${transaction.total.toFixed(2)} GYD`],
    ];
    
    if (transaction.description) {
      details.push(["Description", transaction.description]);
    }
    
    details.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), 70, y);
      y += 8;
    });
    
    // Footer
    y += 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, 190, y);
    y += 10;
    
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text("This is an electronically generated receipt.", 105, y, { align: "center" });
    y += 5;
    doc.text("Please keep this for your records.", 105, y, { align: "center" });
    y += 10;
    doc.text(`Generated on ${new Date().toLocaleString()}`, 105, y, { align: "center" });
    
    doc.save(`receipt-${transaction.id.slice(0, 8)}.pdf`);
    
    toast({
      title: "Receipt Downloaded",
      description: "Your transaction receipt has been saved",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
            Transaction Successful
          </DialogTitle>
          <DialogDescription className="text-center">
            Your payment has been processed successfully
          </DialogDescription>
        </DialogHeader>

        <div ref={receiptRef} className="space-y-4">
          {/* Success Animation */}
          <div className="flex justify-center py-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          {/* Amount Display */}
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">
              ${transaction.amount.toFixed(2)} GYD
            </p>
            <Badge variant="default" className="mt-2">
              Completed
            </Badge>
          </div>

          {/* Transaction Flow */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="font-medium text-sm truncate">{transaction.senderName}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground mx-2" />
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground">To</p>
                  <p className="font-medium text-sm truncate">{transaction.recipientName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Hash className="w-3 h-3 mr-1" />
                  Transaction ID
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={copyTransactionId}
                  className="h-auto py-1 px-2 text-xs font-mono"
                >
                  {transaction.id.slice(0, 8)}...
                  <Copy className="w-3 h-3 ml-1" />
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Date & Time
                </span>
                <span className="text-sm">{formatDate(transaction.timestamp)}</span>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-sm">${transaction.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fee</span>
                  <span className="text-sm">${transaction.fee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span className="text-sm">Total Debited</span>
                  <span className="text-sm">${transaction.total.toFixed(2)}</span>
                </div>
              </div>

              {transaction.description && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="text-sm mt-1">{transaction.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={downloadReceipt}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionReceiptModal;
