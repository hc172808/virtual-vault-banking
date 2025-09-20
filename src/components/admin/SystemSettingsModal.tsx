import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Shield, DollarSign, Coins, Globe, Bell, Lock } from "lucide-react";

interface SystemSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
}

export function SystemSettingsModal({ open, onOpenChange }: SystemSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const { toast } = useToast();

  // Stablecoin Configuration
  const [stablecoinSettings, setStablecoinSettings] = useState({
    enableStablecoins: false,
    supportedCoins: ['USDC', 'USDT', 'DAI'],
    defaultStablecoin: 'USDC',
    conversionFee: '0.5',
    minStablecoinAmount: '1.00',
    maxStablecoinAmount: '10000.00',
    stablecoinWalletAddress: '',
    autoConversion: false,
  });

  // Transaction Limits
  const [transactionLimits, setTransactionLimits] = useState({
    dailyLimit: '5000.00',
    monthlyLimit: '50000.00',
    singleTransactionLimit: '1000.00',
    kycRequiredAmount: '500.00',
    agentDailyFundLimit: '500.00',
    adminUnlimitedFunds: true,
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    require2FA: true,
    sessionTimeout: '30',
    maxLoginAttempts: '3',
    passwordMinLength: '8',
    requireSpecialChars: true,
    kycVerificationRequired: true,
    ipWhitelisting: false,
    suspiciousActivityThreshold: '1000.00',
  });

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    systemName: 'Virtual Banking System',
    supportEmail: 'support@virtualbank.com',
    defaultCurrency: 'USD',
    supportedLanguages: ['en', 'es', 'fr'],
    defaultLanguage: 'en',
    maintenanceMode: false,
    allowNewRegistrations: true,
    emailNotifications: true,
    smsNotifications: false,
  });

  const loadSystemConfigs = async () => {
    try {
      // This would normally load from a system_configs table
      // For now, we'll use local state
      toast({
        title: "Settings Loaded",
        description: "System configuration loaded successfully",
      });
    } catch (error) {
      console.error('Error loading system configs:', error);
      toast({
        title: "Error",
        description: "Failed to load system configuration",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async (settingsType: string, settings: any) => {
    setLoading(true);
    try {
      // Here you would typically save to a system_configs table
      // For now, we'll just show a success message
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Settings Saved",
        description: `${settingsType} settings have been updated successfully`,
      });
    } catch (error) {
      console.error(`Error saving ${settingsType} settings:`, error);
      toast({
        title: "Error",
        description: `Failed to save ${settingsType} settings`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSystemConfigs();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            System Settings & Configuration
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="stablecoin" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stablecoin" className="flex items-center">
              <Coins className="w-4 h-4 mr-2" />
              Stablecoin
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center">
              <Globe className="w-4 h-4 mr-2" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Stablecoin Configuration */}
          <TabsContent value="stablecoin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Coins className="w-5 h-5 mr-2" />
                  Stablecoin Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enable-stablecoins">Enable Stablecoin Support</Label>
                      <Switch
                        id="enable-stablecoins"
                        checked={stablecoinSettings.enableStablecoins}
                        onCheckedChange={(checked) =>
                          setStablecoinSettings(prev => ({ ...prev, enableStablecoins: checked }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="default-stablecoin">Default Stablecoin</Label>
                      <Select
                        value={stablecoinSettings.defaultStablecoin}
                        onValueChange={(value) =>
                          setStablecoinSettings(prev => ({ ...prev, defaultStablecoin: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                          <SelectItem value="USDT">Tether (USDT)</SelectItem>
                          <SelectItem value="DAI">Dai (DAI)</SelectItem>
                          <SelectItem value="BUSD">Binance USD (BUSD)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="conversion-fee">Conversion Fee (%)</Label>
                      <Input
                        id="conversion-fee"
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={stablecoinSettings.conversionFee}
                        onChange={(e) =>
                          setStablecoinSettings(prev => ({ ...prev, conversionFee: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="min-stablecoin">Minimum Stablecoin Amount ($)</Label>
                      <Input
                        id="min-stablecoin"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={stablecoinSettings.minStablecoinAmount}
                        onChange={(e) =>
                          setStablecoinSettings(prev => ({ ...prev, minStablecoinAmount: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="max-stablecoin">Maximum Stablecoin Amount ($)</Label>
                      <Input
                        id="max-stablecoin"
                        type="number"
                        step="0.01"
                        min="1"
                        value={stablecoinSettings.maxStablecoinAmount}
                        onChange={(e) =>
                          setStablecoinSettings(prev => ({ ...prev, maxStablecoinAmount: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="wallet-address">Stablecoin Wallet Address</Label>
                      <Textarea
                        id="wallet-address"
                        placeholder="Enter wallet address for stablecoin operations..."
                        value={stablecoinSettings.stablecoinWalletAddress}
                        onChange={(e) =>
                          setStablecoinSettings(prev => ({ ...prev, stablecoinWalletAddress: e.target.value }))
                        }
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-conversion">Auto Convert to Stablecoin</Label>
                      <Switch
                        id="auto-conversion"
                        checked={stablecoinSettings.autoConversion}
                        onCheckedChange={(checked) =>
                          setStablecoinSettings(prev => ({ ...prev, autoConversion: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <Button
                  onClick={() => saveSettings('Stablecoin', stablecoinSettings)}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Saving..." : "Save Stablecoin Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction Limits */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Transaction Limits & Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="daily-limit">Daily Transaction Limit ($)</Label>
                      <Input
                        id="daily-limit"
                        type="number"
                        step="0.01"
                        min="0"
                        value={transactionLimits.dailyLimit}
                        onChange={(e) =>
                          setTransactionLimits(prev => ({ ...prev, dailyLimit: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="monthly-limit">Monthly Transaction Limit ($)</Label>
                      <Input
                        id="monthly-limit"
                        type="number"
                        step="0.01"
                        min="0"
                        value={transactionLimits.monthlyLimit}
                        onChange={(e) =>
                          setTransactionLimits(prev => ({ ...prev, monthlyLimit: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="single-limit">Single Transaction Limit ($)</Label>
                      <Input
                        id="single-limit"
                        type="number"
                        step="0.01"
                        min="0"
                        value={transactionLimits.singleTransactionLimit}
                        onChange={(e) =>
                          setTransactionLimits(prev => ({ ...prev, singleTransactionLimit: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="kyc-required">KYC Required Amount ($)</Label>
                      <Input
                        id="kyc-required"
                        type="number"
                        step="0.01"
                        min="0"
                        value={transactionLimits.kycRequiredAmount}
                        onChange={(e) =>
                          setTransactionLimits(prev => ({ ...prev, kycRequiredAmount: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="agent-limit">Agent Daily Fund Limit ($)</Label>
                      <Input
                        id="agent-limit"
                        type="number"
                        step="0.01"
                        min="0"
                        value={transactionLimits.agentDailyFundLimit}
                        onChange={(e) =>
                          setTransactionLimits(prev => ({ ...prev, agentDailyFundLimit: e.target.value }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="admin-unlimited">Admin Unlimited Funds</Label>
                      <Switch
                        id="admin-unlimited"
                        checked={transactionLimits.adminUnlimitedFunds}
                        onCheckedChange={(checked) =>
                          setTransactionLimits(prev => ({ ...prev, adminUnlimitedFunds: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => saveSettings('Transaction', transactionLimits)}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Saving..." : "Save Transaction Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="require-2fa">Require 2FA for All Users</Label>
                      <Switch
                        id="require-2fa"
                        checked={securitySettings.require2FA}
                        onCheckedChange={(checked) =>
                          setSecuritySettings(prev => ({ ...prev, require2FA: checked }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                      <Input
                        id="session-timeout"
                        type="number"
                        min="5"
                        max="180"
                        value={securitySettings.sessionTimeout}
                        onChange={(e) =>
                          setSecuritySettings(prev => ({ ...prev, sessionTimeout: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="max-attempts">Max Login Attempts</Label>
                      <Input
                        id="max-attempts"
                        type="number"
                        min="1"
                        max="10"
                        value={securitySettings.maxLoginAttempts}
                        onChange={(e) =>
                          setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="password-length">Minimum Password Length</Label>
                      <Input
                        id="password-length"
                        type="number"
                        min="6"
                        max="20"
                        value={securitySettings.passwordMinLength}
                        onChange={(e) =>
                          setSecuritySettings(prev => ({ ...prev, passwordMinLength: e.target.value }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="special-chars">Require Special Characters</Label>
                      <Switch
                        id="special-chars"
                        checked={securitySettings.requireSpecialChars}
                        onCheckedChange={(checked) =>
                          setSecuritySettings(prev => ({ ...prev, requireSpecialChars: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="kyc-required">KYC Verification Required</Label>
                      <Switch
                        id="kyc-required"
                        checked={securitySettings.kycVerificationRequired}
                        onCheckedChange={(checked) =>
                          setSecuritySettings(prev => ({ ...prev, kycVerificationRequired: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => saveSettings('Security', securitySettings)}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Saving..." : "Save Security Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="system-name">System Name</Label>
                      <Input
                        id="system-name"
                        value={systemSettings.systemName}
                        onChange={(e) =>
                          setSystemSettings(prev => ({ ...prev, systemName: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="support-email">Support Email</Label>
                      <Input
                        id="support-email"
                        type="email"
                        value={systemSettings.supportEmail}
                        onChange={(e) =>
                          setSystemSettings(prev => ({ ...prev, supportEmail: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="default-currency">Default Currency</Label>
                      <Select
                        value={systemSettings.defaultCurrency}
                        onValueChange={(value) =>
                          setSystemSettings(prev => ({ ...prev, defaultCurrency: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">US Dollar (USD)</SelectItem>
                          <SelectItem value="EUR">Euro (EUR)</SelectItem>
                          <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                          <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                      <Switch
                        id="maintenance-mode"
                        checked={systemSettings.maintenanceMode}
                        onCheckedChange={(checked) =>
                          setSystemSettings(prev => ({ ...prev, maintenanceMode: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="allow-registrations">Allow New Registrations</Label>
                      <Switch
                        id="allow-registrations"
                        checked={systemSettings.allowNewRegistrations}
                        onCheckedChange={(checked) =>
                          setSystemSettings(prev => ({ ...prev, allowNewRegistrations: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <Switch
                        id="email-notifications"
                        checked={systemSettings.emailNotifications}
                        onCheckedChange={(checked) =>
                          setSystemSettings(prev => ({ ...prev, emailNotifications: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="sms-notifications">SMS Notifications</Label>
                      <Switch
                        id="sms-notifications"
                        checked={systemSettings.smsNotifications}
                        onCheckedChange={(checked) =>
                          setSystemSettings(prev => ({ ...prev, smsNotifications: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => saveSettings('System', systemSettings)}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Saving..." : "Save System Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}