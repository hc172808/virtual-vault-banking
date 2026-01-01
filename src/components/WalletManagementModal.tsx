import React, { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wallet,
  Copy,
  Download,
  Eye,
  EyeOff,
  Key,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Shield,
  AlertTriangle,
  QrCode,
} from "lucide-react";
import { shortenAddress, isValidAddress } from "@/lib/wallet";
import { QRCodeSVG } from "qrcode.react";

interface WalletManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface Transaction {
  id: string;
  type: "send" | "receive";
  amount: number;
  address: string;
  timestamp: string;
  status: "confirmed" | "pending";
  txHash: string;
}

const WalletManagementModal: React.FC<WalletManagementModalProps> = ({
  open,
  onOpenChange,
  userId,
}) => {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [encryptedPrivateKey, setEncryptedPrivateKey] = useState("");
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportPassword, setExportPassword] = useState("");
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    if (open) {
      loadWalletData();
      loadBlockchainTransactions();
    }
  }, [open]);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("wallet_address, public_key, encrypted_private_key")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      setWalletAddress(data?.wallet_address || "");
      setPublicKey(data?.public_key || "");
      setEncryptedPrivateKey(data?.encrypted_private_key || "");
    } catch (error) {
      console.error("Error loading wallet data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockchainTransactions = async () => {
    try {
      // Fetch transactions from the database that involve this user
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform to blockchain-style transactions
      const blockchainTxs: Transaction[] = (data || []).map((tx: any) => ({
        id: tx.id,
        type: tx.sender_id === userId ? "send" : "receive",
        amount: tx.amount,
        address: tx.sender_id === userId ? tx.recipient_id : tx.sender_id,
        timestamp: tx.created_at,
        status: tx.status === "completed" ? "confirmed" : "pending",
        txHash: `0x${tx.id.replace(/-/g, "")}`,
      }));

      setTransactions(blockchainTxs);
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const handleExportPrivateKey = () => {
    if (!encryptedPrivateKey) {
      toast({
        title: "No Private Key",
        description: "No encrypted private key found for this wallet",
        variant: "destructive",
      });
      return;
    }

    // Create a downloadable file with the encrypted private key
    const exportData = {
      walletAddress,
      publicKey,
      encryptedPrivateKey,
      exportedAt: new Date().toISOString(),
      warning: "This file contains your encrypted private key. Keep it secure and never share it.",
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gyd-wallet-backup-${walletAddress?.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Wallet backup file downloaded. Keep it secure!",
    });
    setShowExportDialog(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Wallet className="w-5 h-5 mr-2" />
            GYD Wallet Management
          </DialogTitle>
          <DialogDescription>
            View your blockchain wallet details and transaction history
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !walletAddress ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No wallet found. A wallet is automatically generated when you sign up.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Wallet QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <QrCode className="w-4 h-4 mr-2" />
                  Receive Funds
                </CardTitle>
                <CardDescription>Share this QR code to receive GYD</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-lg">
                  <QRCodeSVG
                    value={`STABLECOIN:${userId}:${walletAddress || 'wallet'}`}
                    size={180}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Scan this QR code to send funds to your wallet
                </p>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(walletAddress, "Wallet address")}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Wallet Address
                </Button>
              </CardContent>
            </Card>

            {/* Wallet Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Wallet Details
                </CardTitle>
                <CardDescription>Your GYD blockchain wallet information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Wallet Address</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={walletAddress} readOnly className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(walletAddress, "Wallet address")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Public Key</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={publicKey ? shortenAddress(publicKey) : "Not available"}
                      readOnly
                      className="font-mono text-sm"
                    />
                    {publicKey && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(publicKey, "Public key")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Key className="h-3 w-3" />
                    Encrypted Private Key
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={
                        encryptedPrivateKey
                          ? showPrivateKey
                            ? encryptedPrivateKey
                            : "••••••••••••••••••••••••••••••••"
                          : "Not available"
                      }
                      readOnly
                      className="font-mono text-sm"
                      type={showPrivateKey ? "text" : "password"}
                    />
                    {encryptedPrivateKey && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowPrivateKey(!showPrivateKey)}
                        >
                          {showPrivateKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(encryptedPrivateKey, "Encrypted private key")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Your private key is encrypted with your password. Never share it with anyone.
                    You need your password to decrypt and use the private key.
                  </AlertDescription>
                </Alert>

                <Button onClick={handleExportPrivateKey} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Wallet Backup
                </Button>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <History className="w-4 h-4 mr-2" />
                  On-Chain Transaction History
                </CardTitle>
                <CardDescription>
                  Your blockchain transaction records linked to GYD consensus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No transactions yet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>TX Hash</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {tx.type === "send" ? (
                                  <ArrowUpRight className="h-4 w-4 text-destructive" />
                                ) : (
                                  <ArrowDownLeft className="h-4 w-4 text-green-500" />
                                )}
                                <span className="capitalize">{tx.type}</span>
                              </div>
                            </TableCell>
                            <TableCell
                              className={
                                tx.type === "send" ? "text-destructive" : "text-green-500"
                              }
                            >
                              {tx.type === "send" ? "-" : "+"}
                              {tx.amount.toFixed(2)} GYD
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {shortenAddress(tx.address) || tx.address.slice(0, 8) + "..."}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="font-mono text-xs p-0 h-auto"
                                onClick={() => copyToClipboard(tx.txHash, "Transaction hash")}
                              >
                                {tx.txHash.slice(0, 10)}...
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={tx.status === "confirmed" ? "default" : "secondary"}
                              >
                                {tx.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(tx.timestamp)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WalletManagementModal;
