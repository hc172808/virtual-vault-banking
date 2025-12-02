import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Network, 
  Wallet, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Settings2, 
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  History
} from "lucide-react";

interface BlockchainConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BlockchainConfig {
  network_name: string;
  rpc_endpoint: string;
  chain_id: string;
  coin_symbol: string;
  coin_name: string;
  decimals: number;
  is_active: boolean;
  hot_wallet_address: string;
  min_withdrawal: number;
  max_withdrawal: number;
  withdrawal_fee: number;
  deposit_confirmations: number;
}

interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  tx_hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  user_email?: string;
}

const BlockchainConfigModal: React.FC<BlockchainConfigModalProps> = ({ open, onOpenChange }) => {
  const [config, setConfig] = useState<BlockchainConfig>({
    network_name: 'GYD Network',
    rpc_endpoint: '',
    chain_id: '1',
    coin_symbol: 'GYD',
    coin_name: 'GYD Stablecoin',
    decimals: 18,
    is_active: false,
    hot_wallet_address: '',
    min_withdrawal: 10,
    max_withdrawal: 10000,
    withdrawal_fee: 1,
    deposit_confirmations: 3
  });
  
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [networkStats, setNetworkStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingTransactions: 0,
    hotWalletBalance: 0
  });

  useEffect(() => {
    if (open) {
      loadConfig();
      loadTransactions();
    }
  }, [open]);

  const loadConfig = async () => {
    try {
      // Load from localStorage for now (will migrate to DB when tables are created)
      const savedConfig = localStorage.getItem('gyd_blockchain_config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      // Load mock transactions for now
      const mockTransactions: WalletTransaction[] = [
        {
          id: '1',
          user_id: 'user-1',
          type: 'deposit',
          amount: 500,
          tx_hash: '0x123...abc',
          status: 'confirmed',
          created_at: new Date().toISOString(),
          user_email: 'user@example.com'
        }
      ];
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      localStorage.setItem('gyd_blockchain_config', JSON.stringify(config));
      toast.success('Blockchain configuration saved');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!config.rpc_endpoint) {
      toast.error('Please enter an RPC endpoint');
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      // Test RPC connection
      const response = await fetch(config.rpc_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          setConnectionStatus('connected');
          toast.success('Successfully connected to GYD Network');
        } else {
          throw new Error('Invalid response');
        }
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error('Failed to connect to RPC endpoint');
    }
  };

  const syncBalances = async () => {
    if (connectionStatus !== 'connected') {
      toast.error('Please connect to the network first');
      return;
    }

    setIsLoading(true);
    try {
      // This would sync on-chain balances with database
      toast.success('Balance sync initiated');
    } catch (error) {
      toast.error('Failed to sync balances');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            GYD Blockchain Integration
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="wallets">Wallet Settings</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="status">Network Status</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Network Configuration
                </CardTitle>
                <CardDescription>
                  Configure your GYD blockchain network connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Network Name</Label>
                    <Input
                      value={config.network_name}
                      onChange={(e) => setConfig({ ...config, network_name: e.target.value })}
                      placeholder="GYD Network"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Chain ID</Label>
                    <Input
                      value={config.chain_id}
                      onChange={(e) => setConfig({ ...config, chain_id: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>RPC Endpoint URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={config.rpc_endpoint}
                      onChange={(e) => setConfig({ ...config, rpc_endpoint: e.target.value })}
                      placeholder="https://rpc.gyd-network.com"
                      className="flex-1"
                    />
                    <Button onClick={testConnection} variant="outline" disabled={!config.rpc_endpoint}>
                      {connectionStatus === 'connecting' ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {connectionStatus === 'connected' && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">Connected</span>
                      </>
                    )}
                    {connectionStatus === 'error' && (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-500">Connection failed</span>
                      </>
                    )}
                    {connectionStatus === 'disconnected' && (
                      <span className="text-muted-foreground">Not connected</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Coin Symbol</Label>
                    <Input
                      value={config.coin_symbol}
                      onChange={(e) => setConfig({ ...config, coin_symbol: e.target.value })}
                      placeholder="GYD"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coin Name</Label>
                    <Input
                      value={config.coin_name}
                      onChange={(e) => setConfig({ ...config, coin_name: e.target.value })}
                      placeholder="GYD Stablecoin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Decimals</Label>
                    <Input
                      type="number"
                      value={config.decimals}
                      onChange={(e) => setConfig({ ...config, decimals: parseInt(e.target.value) })}
                      placeholder="18"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Enable GYD Integration</h4>
                    <p className="text-sm text-muted-foreground">
                      Activate blockchain-based fund management
                    </p>
                  </div>
                  <Switch
                    checked={config.is_active}
                    onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={saveConfig} disabled={isLoading}>
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Configuration
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="wallets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Hot Wallet Configuration
                </CardTitle>
                <CardDescription>
                  Configure the custodial hot wallet for user deposits and withdrawals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Hot Wallet Address</Label>
                  <Input
                    value={config.hot_wallet_address}
                    onChange={(e) => setConfig({ ...config, hot_wallet_address: e.target.value })}
                    placeholder="0x..."
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the main wallet that holds user funds. Keep it secure!
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Min Withdrawal (GYD)</Label>
                    <Input
                      type="number"
                      value={config.min_withdrawal}
                      onChange={(e) => setConfig({ ...config, min_withdrawal: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Withdrawal (GYD)</Label>
                    <Input
                      type="number"
                      value={config.max_withdrawal}
                      onChange={(e) => setConfig({ ...config, max_withdrawal: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Withdrawal Fee (GYD)</Label>
                    <Input
                      type="number"
                      value={config.withdrawal_fee}
                      onChange={(e) => setConfig({ ...config, withdrawal_fee: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Required Deposit Confirmations</Label>
                  <Input
                    type="number"
                    value={config.deposit_confirmations}
                    onChange={(e) => setConfig({ ...config, deposit_confirmations: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of block confirmations required before crediting deposits
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custodial Wallet System</CardTitle>
                <CardDescription>
                  How the custodial wallet system works
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <ArrowDownToLine className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Deposits</h4>
                    <p className="text-muted-foreground">
                      Users send GYD to the hot wallet. The system monitors incoming transactions 
                      and credits user accounts after the required confirmations.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <ArrowUpFromLine className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Withdrawals</h4>
                    <p className="text-muted-foreground">
                      Users request withdrawals to their external GYD wallet. Admin approves 
                      and the system sends from the hot wallet.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveConfig} disabled={isLoading}>
                Save Wallet Settings
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent Blockchain Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No blockchain transactions yet. 
                    Configure the network and enable integration to start.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {tx.type === 'deposit' ? (
                            <ArrowDownToLine className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowUpFromLine className="h-4 w-4 text-blue-500" />
                          )}
                          <div>
                            <p className="font-medium">{tx.amount} GYD</p>
                            <p className="text-xs text-muted-foreground font-mono">{tx.tx_hash}</p>
                          </div>
                        </div>
                        <Badge variant={tx.status === 'confirmed' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'}>
                          {tx.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={syncBalances} variant="outline" disabled={connectionStatus !== 'connected'}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Blockchain Data
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Connection Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {connectionStatus === 'connected' ? (
                      <>
                        <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-medium text-green-500">Online</span>
                      </>
                    ) : (
                      <>
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="font-medium text-red-500">Offline</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Hot Wallet Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{networkStats.hotWalletBalance.toLocaleString()} GYD</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Deposits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-500">{networkStats.totalDeposits.toLocaleString()} GYD</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Withdrawals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-500">{networkStats.totalWithdrawals.toLocaleString()} GYD</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Network Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-medium">{config.network_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Chain ID</span>
                  <span className="font-mono">{config.chain_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Coin</span>
                  <span>{config.coin_name} ({config.coin_symbol})</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Pegged To</span>
                  <span>1 GYD = 1 USD</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Integration Status</span>
                  <Badge variant={config.is_active ? 'default' : 'secondary'}>
                    {config.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BlockchainConfigModal;
