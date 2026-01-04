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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Shield,
  Lock,
  Unlock,
  Download,
  Upload,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  FileKey,
} from "lucide-react";
import { generateWalletKeyPair, encryptPrivateKey, decryptPrivateKey } from "@/lib/wallet";

interface WalletSecurityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userPassword?: string;
}

const WalletSecurityModal: React.FC<WalletSecurityModalProps> = ({
  open,
  onOpenChange,
  userId,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);
  const [walletPin, setWalletPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [hasWalletPin, setHasWalletPin] = useState(false);
  const [isWalletUnlocked, setIsWalletUnlocked] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [decryptedPrivateKey, setDecryptedPrivateKey] = useState("");
  const [decryptPassword, setDecryptPassword] = useState("");
  
  // Import/Export states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState("");
  const [exportPassword, setExportPassword] = useState("");
  const [confirmExportPassword, setConfirmExportPassword] = useState("");

  useEffect(() => {
    if (open) {
      loadWalletData();
    } else {
      // Reset states when closing
      setIsWalletUnlocked(false);
      setShowPrivateKey(false);
      setDecryptedPrivateKey("");
      setWalletPin("");
      setConfirmPin("");
      setCurrentPin("");
      setNewPin("");
      setDecryptPassword("");
    }
  }, [open]);

  const loadWalletData = async () => {
    setLoading(true);
    try {
      // Get public wallet info from profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_address, public_key")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;

      // Get sensitive wallet credentials from vault
      const { data: vaultData } = await supabase
        .from("wallet_vault")
        .select("encrypted_private_key, wallet_pin_hash")
        .eq("user_id", userId)
        .maybeSingle();

      // Combine data for wallet operations
      setWalletData({
        wallet_address: profileData?.wallet_address,
        public_key: profileData?.public_key,
        encrypted_private_key: vaultData?.encrypted_private_key,
        wallet_pin_hash: vaultData?.wallet_pin_hash,
      });
      setHasWalletPin(!!vaultData?.wallet_pin_hash);
    } catch (error) {
      console.error("Error loading wallet data:", error);
    } finally {
      setLoading(false);
    }
  };

  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + userId + "wallet_security");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleSetWalletPin = async () => {
    if (walletPin.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 6-digit PIN",
        variant: "destructive",
      });
      return;
    }

    if (walletPin !== confirmPin) {
      toast({
        title: "PIN Mismatch",
        description: "PINs do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const pinHash = await hashPin(walletPin);
      
      // Upsert to wallet_vault table
      const { error } = await supabase
        .from("wallet_vault")
        .upsert({ 
          user_id: userId,
          wallet_pin_hash: pinHash 
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setHasWalletPin(true);
      setWalletPin("");
      setConfirmPin("");
      
      toast({
        title: "PIN Set Successfully",
        description: "Your wallet is now protected with a PIN",
      });
      
      await loadWalletData();
    } catch (error) {
      console.error("Error setting PIN:", error);
      toast({
        title: "Error",
        description: "Failed to set wallet PIN",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockWallet = async () => {
    if (currentPin.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "Please enter your 6-digit PIN",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const pinHash = await hashPin(currentPin);
      
      if (pinHash !== walletData?.wallet_pin_hash) {
        toast({
          title: "Incorrect PIN",
          description: "The PIN you entered is incorrect",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setIsWalletUnlocked(true);
      setCurrentPin("");
      
      toast({
        title: "Wallet Unlocked",
        description: "You can now view and manage your wallet",
      });
    } catch (error) {
      console.error("Error unlocking wallet:", error);
      toast({
        title: "Error",
        description: "Failed to unlock wallet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async () => {
    if (currentPin.length !== 6 || newPin.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "Please enter valid 6-digit PINs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const currentPinHash = await hashPin(currentPin);
      
      if (currentPinHash !== walletData?.wallet_pin_hash) {
        toast({
          title: "Incorrect Current PIN",
          description: "The current PIN you entered is incorrect",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const newPinHash = await hashPin(newPin);
      
      const { error } = await supabase
        .from("wallet_vault")
        .update({ wallet_pin_hash: newPinHash })
        .eq("user_id", userId);

      if (error) throw error;

      setCurrentPin("");
      setNewPin("");
      
      toast({
        title: "PIN Changed Successfully",
        description: "Your wallet PIN has been updated",
      });
      
      await loadWalletData();
    } catch (error) {
      console.error("Error changing PIN:", error);
      toast({
        title: "Error",
        description: "Failed to change wallet PIN",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecryptPrivateKey = async () => {
    if (!decryptPassword) {
      toast({
        title: "Password Required",
        description: "Please enter your account password to decrypt the private key",
        variant: "destructive",
      });
      return;
    }

    try {
      const decrypted = await decryptPrivateKey(walletData.encrypted_private_key, decryptPassword);
      setDecryptedPrivateKey(decrypted);
      setShowPrivateKey(true);
      toast({
        title: "Key Decrypted",
        description: "Your private key is now visible. Keep it safe!",
      });
    } catch (error) {
      toast({
        title: "Decryption Failed",
        description: "Incorrect password or corrupted key",
        variant: "destructive",
      });
    }
  };

  const handleExportWallet = async () => {
    if (!exportPassword || exportPassword !== confirmExportPassword) {
      toast({
        title: "Password Error",
        description: "Please enter and confirm your export password",
        variant: "destructive",
      });
      return;
    }

    if (exportPassword.length < 8) {
      toast({
        title: "Weak Password",
        description: "Export password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      // Re-encrypt the private key with export password
      let keyToExport = walletData.encrypted_private_key;
      
      // Create export data with additional encryption layer
      const exportData = {
        version: "1.0",
        type: "gyd-wallet-backup",
        walletAddress: walletData.wallet_address,
        publicKey: walletData.public_key,
        encryptedPrivateKey: keyToExport,
        exportPassword: await hashPin(exportPassword), // Hash of export password for verification
        createdAt: new Date().toISOString(),
        warning: "This file contains your encrypted wallet. Never share this file or your password.",
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gyd-wallet-${walletData.wallet_address?.slice(0, 8)}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportPassword("");
      setConfirmExportPassword("");
      
      toast({
        title: "Wallet Exported",
        description: "Keep your backup file and password safe!",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export wallet",
        variant: "destructive",
      });
    }
  };

  const handleImportWallet = async () => {
    if (!importFile) {
      toast({
        title: "No File Selected",
        description: "Please select a wallet backup file",
        variant: "destructive",
      });
      return;
    }

    if (!importPassword) {
      toast({
        title: "Password Required",
        description: "Please enter the export password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const fileContent = await importFile.text();
      const importData = JSON.parse(fileContent);

      // Verify it's a valid wallet file
      if (importData.type !== "gyd-wallet-backup") {
        throw new Error("Invalid wallet file format");
      }

      // Verify export password
      const passwordHash = await hashPin(importPassword);
      if (passwordHash !== importData.exportPassword) {
        throw new Error("Incorrect export password");
      }

      // Update public wallet info in profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          wallet_address: importData.walletAddress,
          public_key: importData.publicKey,
        })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Update sensitive wallet data in vault
      const { error: vaultError } = await supabase
        .from("wallet_vault")
        .upsert({
          user_id: userId,
          encrypted_private_key: importData.encryptedPrivateKey,
        }, { onConflict: 'user_id' });

      if (vaultError) throw vaultError;

      setImportFile(null);
      setImportPassword("");
      
      toast({
        title: "Wallet Imported",
        description: "Your wallet has been successfully imported",
      });
      
      await loadWalletData();
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import wallet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".json")) {
        toast({
          title: "Invalid File",
          description: "Please select a .json wallet backup file",
          variant: "destructive",
        });
        return;
      }
      setImportFile(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Wallet Security & Management
          </DialogTitle>
          <DialogDescription>
            Protect, import, and export your GYD wallet
          </DialogDescription>
        </DialogHeader>

        {loading && !walletData ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !walletData?.wallet_address ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No wallet found. A wallet is automatically generated when you sign up.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="security" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="security">
                <Lock className="w-4 h-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="export">
                <Download className="w-4 h-4 mr-2" />
                Export
              </TabsTrigger>
              <TabsTrigger value="import">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </TabsTrigger>
            </TabsList>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              {!hasWalletPin ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Set Wallet PIN
                    </CardTitle>
                    <CardDescription>
                      Protect your wallet with a 6-digit PIN
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Create PIN</Label>
                      <InputOTP
                        maxLength={6}
                        value={walletPin}
                        onChange={setWalletPin}
                      >
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot key={index} index={index} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <div className="space-y-2">
                      <Label>Confirm PIN</Label>
                      <InputOTP
                        maxLength={6}
                        value={confirmPin}
                        onChange={setConfirmPin}
                      >
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot key={index} index={index} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button
                      onClick={handleSetWalletPin}
                      disabled={loading || walletPin.length !== 6 || confirmPin.length !== 6}
                      className="w-full"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Set Wallet PIN
                    </Button>
                  </CardContent>
                </Card>
              ) : !isWalletUnlocked ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Lock className="w-4 h-4 mr-2" />
                      Wallet Locked
                    </CardTitle>
                    <CardDescription>
                      Enter your PIN to unlock and manage your wallet
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Enter PIN</Label>
                      <InputOTP
                        maxLength={6}
                        value={currentPin}
                        onChange={setCurrentPin}
                      >
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot key={index} index={index} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button
                      onClick={handleUnlockWallet}
                      disabled={loading || currentPin.length !== 6}
                      className="w-full"
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Unlock Wallet
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <Alert className="bg-green-500/10 border-green-500/50">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-600">
                      Wallet is unlocked. You can now manage your wallet.
                    </AlertDescription>
                  </Alert>

                  {/* Change PIN */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Change Wallet PIN</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Current PIN</Label>
                        <InputOTP
                          maxLength={6}
                          value={currentPin}
                          onChange={setCurrentPin}
                        >
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <InputOTPSlot key={index} index={index} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <div className="space-y-2">
                        <Label>New PIN</Label>
                        <InputOTP
                          maxLength={6}
                          value={newPin}
                          onChange={setNewPin}
                        >
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <InputOTPSlot key={index} index={index} />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <Button
                        onClick={handleChangePin}
                        disabled={loading || currentPin.length !== 6 || newPin.length !== 6}
                        className="w-full"
                      >
                        Change PIN
                      </Button>
                    </CardContent>
                  </Card>

                  {/* View Private Key */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Key className="w-4 h-4 mr-2" />
                        View Private Key
                      </CardTitle>
                      <CardDescription>
                        Decrypt and view your private key (requires account password)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!showPrivateKey ? (
                        <>
                          <div className="space-y-2">
                            <Label>Account Password</Label>
                            <Input
                              type="password"
                              value={decryptPassword}
                              onChange={(e) => setDecryptPassword(e.target.value)}
                              placeholder="Enter your account password"
                            />
                          </div>
                          <Button
                            onClick={handleDecryptPrivateKey}
                            disabled={!decryptPassword}
                            variant="outline"
                            className="w-full"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Decrypt & View
                          </Button>
                        </>
                      ) : (
                        <>
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Never share your private key with anyone!
                            </AlertDescription>
                          </Alert>
                          <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all">
                            {decryptedPrivateKey}
                          </div>
                          <Button
                            onClick={() => {
                              setShowPrivateKey(false);
                              setDecryptedPrivateKey("");
                              setDecryptPassword("");
                            }}
                            variant="outline"
                            className="w-full"
                          >
                            <EyeOff className="w-4 h-4 mr-2" />
                            Hide Private Key
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    Export Wallet
                  </CardTitle>
                  <CardDescription>
                    Create a password-protected backup of your wallet
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Your wallet will be exported as an encrypted JSON file. 
                      You'll need the export password to import it later.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Export Password (min 8 characters)</Label>
                    <Input
                      type="password"
                      value={exportPassword}
                      onChange={(e) => setExportPassword(e.target.value)}
                      placeholder="Create a strong password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Confirm Export Password</Label>
                    <Input
                      type="password"
                      value={confirmExportPassword}
                      onChange={(e) => setConfirmExportPassword(e.target.value)}
                      placeholder="Confirm your password"
                    />
                  </div>

                  <Button
                    onClick={handleExportWallet}
                    disabled={
                      loading ||
                      exportPassword.length < 8 ||
                      exportPassword !== confirmExportPassword
                    }
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Wallet Backup
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Import Tab */}
            <TabsContent value="import" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Wallet
                  </CardTitle>
                  <CardDescription>
                    Restore your wallet from a backup file
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Warning: Importing a wallet will replace your current wallet. 
                      Make sure to export your current wallet first!
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Select Wallet Backup File</Label>
                    <Input
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                    />
                    {importFile && (
                      <p className="text-sm text-muted-foreground flex items-center">
                        <FileKey className="w-4 h-4 mr-1" />
                        {importFile.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Export Password</Label>
                    <Input
                      type="password"
                      value={importPassword}
                      onChange={(e) => setImportPassword(e.target.value)}
                      placeholder="Enter the export password"
                    />
                  </div>

                  <Button
                    onClick={handleImportWallet}
                    disabled={loading || !importFile || !importPassword}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {loading ? "Importing..." : "Import Wallet"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WalletSecurityModal;
