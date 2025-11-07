import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Shield, Settings, Globe, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FirewallRule {
  id: string;
  rule_type: string;
  rule_value: string;
  description: string;
  enabled: boolean;
}

interface SystemSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([]);
  const [newRule, setNewRule] = useState({
    rule_type: 'ip_blacklist',
    rule_value: '',
    description: '',
  });

  // Stablecoin Settings
  const [stablecoinSettings, setStablecoinSettings] = useState({
    enabled: false,
    supportedCoins: ["USDC", "USDT"],
    conversionFee: "0.5",
    minStablecoinAmount: "10.00",
    maxStablecoinAmount: "50000.00",
    stablecoinWalletAddress: "",
    autoConversion: false,
  });

  // Transaction Limits
  const [transactionLimits, setTransactionLimits] = useState({
    dailyLimit: "10000.00",
    monthlyLimit: "100000.00",
    singleTransactionLimit: "5000.00",
    kycRequiredAmount: "1000.00",
    agentDailyFundLimit: "25000.00",
    adminUnlimitedFunds: true,
    transferFeePercentage: "0.5",
    transferFeeFixed: "0.00",
    minTransferAmount: "1.00",
    maxTransferAmount: "10000.00",
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    biometricLogin: false,
    sessionTimeout: true,
    sessionDuration: "30",
    maxLoginAttempts: "5",
    ipWhitelisting: false,
  });

  // RPC Settings
  const [rpcSettings, setRpcSettings] = useState({
    endpoint: "",
    apiKey: "",
    network: "mainnet",
    timeout: "30",
    maxRetries: "3",
    sslVerification: true,
    enabled: false,
  });

  // Firewall Settings
  const [firewallSettings, setFirewallSettings] = useState({
    enabled: true,
    blockedIPs: [],
    allowedCountries: ['US', 'CA', 'GB', 'AU'],
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 100,
      burstLimit: 200,
    },
    ddosProtection: true,
    geoBlocking: false,
    vpnDetection: true,
  });

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    systemName: "Banking System",
    timeZone: "UTC",
    maintenanceMode: false,
    debugMode: false,
    emailNotifications: true,
    smsNotifications: false,
  });

  useEffect(() => {
    if (open) {
      loadFirewallRules();
    }
  }, [open]);

  const loadFirewallRules = async () => {
    try {
      const { data, error } = await supabase
        .from('firewall_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFirewallRules(data || []);
    } catch (error) {
      console.error('Error loading firewall rules:', error);
    }
  };

  const addFirewallRule = async () => {
    if (!newRule.rule_value) {
      toast({
        title: "Validation Error",
        description: "Please enter a rule value",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('firewall_rules')
        .insert([{
          rule_type: newRule.rule_type,
          rule_value: newRule.rule_value,
          description: newRule.description,
          enabled: true,
        }]);

      if (error) throw error;

      toast({
        title: "Rule Added",
        description: "Firewall rule has been added successfully",
      });

      setNewRule({ rule_type: 'ip_blacklist', rule_value: '', description: '' });
      loadFirewallRules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add rule",
        variant: "destructive",
      });
    }
  };

  const toggleFirewallRule = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('firewall_rules')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;
      loadFirewallRules();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update rule",
        variant: "destructive",
      });
    }
  };

  const deleteFirewallRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('firewall_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Rule Deleted",
        description: "Firewall rule has been deleted successfully",
      });

      loadFirewallRules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rule",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async (category: string, settings: any) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Settings Saved",
        description: `${category} settings have been updated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            System Settings
          </DialogTitle>
          <DialogDescription>
            Configure system-wide settings and parameters
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="stablecoin" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="stablecoin">Stablecoin</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="rpc">RPC API</TabsTrigger>
            <TabsTrigger value="firewall">Firewall</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Stablecoin Settings */}
          <TabsContent value="stablecoin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Stablecoin Configuration
                </CardTitle>
                <CardDescription>
                  Configure stablecoin support and conversion settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stablecoin-enabled">Enable Stablecoin Support</Label>
                  <Switch
                    id="stablecoin-enabled"
                    checked={stablecoinSettings.enabled}
                    onCheckedChange={(checked) =>
                      setStablecoinSettings(prev => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
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
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="wallet-address">Stablecoin Wallet Address</Label>
                      <Textarea
                        id="wallet-address"
                        placeholder="Enter wallet address for stablecoin operations..."
                        value={stablecoinSettings.stablecoinWalletAddress}
                        onChange={(e) =>
                          setStablecoinSettings(prev => ({ ...prev, stablecoinWalletAddress: e.target.value }))
                        }
                        rows={3}
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

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Transaction Fees</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium mb-3">Sender Fees</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fee-percentage">Sender Fee Percentage (%)</Label>
                          <Input
                            id="fee-percentage"
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            value={transactionLimits.transferFeePercentage}
                            onChange={(e) =>
                              setTransactionLimits(prev => ({ ...prev, transferFeePercentage: e.target.value }))
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="fee-fixed">Sender Fixed Fee ($)</Label>
                          <Input
                            id="fee-fixed"
                            type="number"
                            step="0.01"
                            min="0"
                            value={transactionLimits.transferFeeFixed}
                            onChange={(e) =>
                              setTransactionLimits(prev => ({ ...prev, transferFeeFixed: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-3">Receiver Fees</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="receiver-fee-percentage">Receiver Fee Percentage (%)</Label>
                          <Input
                            id="receiver-fee-percentage"
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            defaultValue="0.5"
                          />
                        </div>

                        <div>
                          <Label htmlFor="receiver-fee-fixed">Receiver Fixed Fee ($)</Label>
                          <Input
                            id="receiver-fee-fixed"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue="0.25"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Transfer Limits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div>
                      <Label htmlFor="min-transfer">Minimum Transfer Amount ($)</Label>
                      <Input
                        id="min-transfer"
                        type="number"
                        step="0.01"
                        min="0"
                        value={transactionLimits.minTransferAmount}
                        onChange={(e) =>
                          setTransactionLimits(prev => ({ ...prev, minTransferAmount: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="max-transfer">Maximum Transfer Amount ($)</Label>
                      <Input
                        id="max-transfer"
                        type="number"
                        step="0.01"
                        min="0"
                        value={transactionLimits.maxTransferAmount}
                        onChange={(e) =>
                          setTransactionLimits(prev => ({ ...prev, maxTransferAmount: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={async () => {
                    // Save fee settings to database
                    try {
                      const { supabase } = await import("@/integrations/supabase/client");
                      await supabase
                        .from('system_settings')
                        .update({ setting_value: transactionLimits.transferFeePercentage })
                        .eq('setting_key', 'transfer_fee_percentage');
                      
                      await supabase
                        .from('system_settings')
                        .update({ setting_value: transactionLimits.transferFeeFixed })
                        .eq('setting_key', 'transfer_fee_fixed');
                      
                      await supabase
                        .from('system_settings')
                        .update({ setting_value: transactionLimits.minTransferAmount })
                        .eq('setting_key', 'min_transfer_amount');
                      
                      await supabase
                        .from('system_settings')
                        .update({ setting_value: transactionLimits.maxTransferAmount })
                        .eq('setting_key', 'max_transfer_amount');
                      
                      saveSettings('Transaction', transactionLimits);
                    } catch (error) {
                      console.error('Error saving fee settings:', error);
                    }
                  }}
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
                      <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                      <Switch
                        id="two-factor"
                        checked={securitySettings.twoFactorAuth}
                        onCheckedChange={(checked) =>
                          setSecuritySettings(prev => ({ ...prev, twoFactorAuth: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="biometric">Biometric Login</Label>
                      <Switch
                        id="biometric"
                        checked={securitySettings.biometricLogin}
                        onCheckedChange={(checked) =>
                          setSecuritySettings(prev => ({ ...prev, biometricLogin: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="session-timeout">Auto Session Timeout</Label>
                      <Switch
                        id="session-timeout"
                        checked={securitySettings.sessionTimeout}
                        onCheckedChange={(checked) =>
                          setSecuritySettings(prev => ({ ...prev, sessionTimeout: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="session-duration">Session Duration (minutes)</Label>
                      <Input
                        id="session-duration"
                        type="number"
                        min="5"
                        max="1440"
                        value={securitySettings.sessionDuration}
                        onChange={(e) =>
                          setSecuritySettings(prev => ({ ...prev, sessionDuration: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="login-attempts">Max Login Attempts</Label>
                      <Input
                        id="login-attempts"
                        type="number"
                        min="3"
                        max="10"
                        value={securitySettings.maxLoginAttempts}
                        onChange={(e) =>
                          setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: e.target.value }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="ip-whitelisting">IP Whitelisting</Label>
                      <Switch
                        id="ip-whitelisting"
                        checked={securitySettings.ipWhitelisting}
                        onCheckedChange={(checked) =>
                          setSecuritySettings(prev => ({ ...prev, ipWhitelisting: checked }))
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

          {/* RPC API Settings */}
          <TabsContent value="rpc">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  RPC API Configuration
                </CardTitle>
                <CardDescription>
                  Configure external RPC API endpoints and authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rpc-endpoint">RPC Endpoint URL</Label>
                      <Input
                        id="rpc-endpoint"
                        type="url"
                        placeholder="https://api.example.com/rpc"
                        value={rpcSettings.endpoint}
                        onChange={(e) =>
                          setRpcSettings(prev => ({ ...prev, endpoint: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="rpc-api-key">API Key</Label>
                      <Input
                        id="rpc-api-key"
                        type="password"
                        placeholder="Enter API key..."
                        value={rpcSettings.apiKey}
                        onChange={(e) =>
                          setRpcSettings(prev => ({ ...prev, apiKey: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="rpc-network">Network</Label>
                      <Select 
                        value={rpcSettings.network} 
                        onValueChange={(value) => 
                          setRpcSettings(prev => ({ ...prev, network: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mainnet">Mainnet</SelectItem>
                          <SelectItem value="testnet">Testnet</SelectItem>
                          <SelectItem value="devnet">Devnet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rpc-timeout">Request Timeout (seconds)</Label>
                      <Input
                        id="rpc-timeout"
                        type="number"
                        min="5"
                        max="300"
                        value={rpcSettings.timeout}
                        onChange={(e) =>
                          setRpcSettings(prev => ({ ...prev, timeout: e.target.value }))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="rpc-retries">Max Retries</Label>
                      <Input
                        id="rpc-retries"
                        type="number"
                        min="0"
                        max="10"
                        value={rpcSettings.maxRetries}
                        onChange={(e) =>
                          setRpcSettings(prev => ({ ...prev, maxRetries: e.target.value }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="rpc-ssl">SSL Verification</Label>
                      <Switch
                        id="rpc-ssl"
                        checked={rpcSettings.sslVerification}
                        onCheckedChange={(checked) =>
                          setRpcSettings(prev => ({ ...prev, sslVerification: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="rpc-enabled">Enable RPC API</Label>
                      <Switch
                        id="rpc-enabled"
                        checked={rpcSettings.enabled}
                        onCheckedChange={(checked) =>
                          setRpcSettings(prev => ({ ...prev, enabled: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Connection Test</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      Test Connection
                    </Button>
                    <Button variant="outline" className="flex-1">
                      View Logs
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => saveSettings('RPC', rpcSettings)}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Saving..." : "Save RPC Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Firewall Settings */}
          <TabsContent value="firewall">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Firewall Rules
                </CardTitle>
                <CardDescription>
                  Manage IP addresses, countries, and rate limiting rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Rule */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold">Add New Rule</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="rule-type">Rule Type</Label>
                      <Select 
                        value={newRule.rule_type}
                        onValueChange={(value) => setNewRule(prev => ({ ...prev, rule_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ip_whitelist">IP Whitelist</SelectItem>
                          <SelectItem value="ip_blacklist">IP Blacklist</SelectItem>
                          <SelectItem value="country_whitelist">Country Whitelist</SelectItem>
                          <SelectItem value="country_blacklist">Country Blacklist</SelectItem>
                          <SelectItem value="rate_limit">Rate Limit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="rule-value">Value</Label>
                      <Input
                        id="rule-value"
                        placeholder="e.g., 192.168.1.1 or US"
                        value={newRule.rule_value}
                        onChange={(e) => setNewRule(prev => ({ ...prev, rule_value: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="rule-description">Description</Label>
                      <Input
                        id="rule-description"
                        placeholder="Optional description"
                        value={newRule.description}
                        onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button onClick={addFirewallRule} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Rule
                  </Button>
                </div>

                <Separator />

                {/* Existing Rules */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Current Rules</h3>
                  {firewallRules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No firewall rules configured
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {firewallRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">
                                {rule.rule_type.replace('_', ' ')}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-mono text-sm">{rule.rule_value}</span>
                            </div>
                            {rule.description && (
                              <p className="text-sm text-muted-foreground">{rule.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(checked) => toggleFirewallRule(rule.id, checked)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteFirewallRule(rule.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                      <Label htmlFor="time-zone">Time Zone</Label>
                      <Select 
                        value={systemSettings.timeZone} 
                        onValueChange={(value) => 
                          setSystemSettings(prev => ({ ...prev, timeZone: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="EST">Eastern Time</SelectItem>
                          <SelectItem value="PST">Pacific Time</SelectItem>
                          <SelectItem value="GMT">Greenwich Mean Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

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
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="debug-mode">Debug Mode</Label>
                      <Switch
                        id="debug-mode"
                        checked={systemSettings.debugMode}
                        onCheckedChange={(checked) =>
                          setSystemSettings(prev => ({ ...prev, debugMode: checked }))
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
};

export default SystemSettingsModal;