import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, DollarSign, ArrowDownToLine, Link, History, Copy, Check } from "lucide-react";

interface TreasuryWithdrawal {
  id: string;
  amount: number;
  chain_id: string;
  reason: string;
  created_at: string;
}

interface ChainTracking {
  id: string;
  chain_id: string;
  parent_chain_id: string | null;
  source_type: string;
  amount: number;
  destination_user_id: string;
  created_at: string;
  is_verified: boolean;
}

interface TreasuryManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: any;
}

export function TreasuryManagementModal({ open, onOpenChange, currentUser }: TreasuryManagementModalProps) {
  const [adminBalance, setAdminBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<TreasuryWithdrawal[]>([]);
  const [chainHistory, setChainHistory] = useState<ChainTracking[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      // Load admin's balance
      if (currentUser?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('user_id', currentUser.id)
          .single();
        
        if (profile) {
          setAdminBalance(profile.balance || 0);
        }
      }

      // Load recent withdrawals
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('treasury_withdrawals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!withdrawalError && withdrawalData) {
        setWithdrawals(withdrawalData);
      }

      // Load chain tracking history
      const { data: chainData, error: chainError } = await supabase
        .from('fund_chain_tracking')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!chainError && chainData) {
        setChainHistory(chainData);
      }
    } catch (error) {
      console.error('Error loading treasury data:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || !reason.trim()) {
      toast({
        title: "Error",
        description: "Please enter amount and reason",
        variant: "destructive",
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('withdraw_from_treasury', {
        p_amount: numAmount,
        p_reason: reason.trim()
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Withdrawal failed');
      }

      toast({
        title: "Success",
        description: (
          <div>
            <p>Withdrew ${numAmount.toFixed(2)} from treasury</p>
            <p className="text-xs mt-1 font-mono">Chain ID: {result.chain_id}</p>
          </div>
        ),
      });

      // Reset form and reload
      setAmount("");
      setReason("");
      setAdminBalance(result.new_balance);
      loadData();

    } catch (error: any) {
      console.error('Error withdrawing from treasury:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to withdraw from treasury",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copied",
      description: "Chain ID copied to clipboard",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Bank Treasury Management
          </DialogTitle>
          <DialogDescription>
            Manage central bank funds and track chain IDs for fraud prevention
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="withdraw" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="withdraw">Withdraw Funds</TabsTrigger>
            <TabsTrigger value="history">Withdrawal History</TabsTrigger>
            <TabsTrigger value="chain">Chain Tracking</TabsTrigger>
          </TabsList>

          {/* Withdraw Funds Tab */}
          <TabsContent value="withdraw">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  Withdraw from Treasury
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Admin Balance Display */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Your Current Balance</p>
                  <p className="text-2xl font-bold">${adminBalance.toFixed(2)} GYD</p>
                </div>

                {/* Treasury Notice */}
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-primary font-medium flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    Central Bank Treasury
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unlimited funds available for system operations. Each withdrawal generates a unique Chain ID.
                  </p>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to Withdraw (GYD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Reason Input */}
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Withdrawal *</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter the reason for this treasury withdrawal..."
                    rows={3}
                  />
                </div>

                {/* Chain ID Notice */}
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-xs text-warning flex items-center">
                    <Link className="w-3 h-3 mr-2" />
                    A unique Chain ID will be generated for this withdrawal. This ID must be used when transferring funds to users.
                  </p>
                </div>

                <Button 
                  onClick={handleWithdraw} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Processing..." : "Withdraw from Treasury"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawal History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <History className="w-4 h-4 mr-2" />
                  Recent Treasury Withdrawals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Chain ID</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No treasury withdrawals yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        withdrawals.map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell>
                              {new Date(withdrawal.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium text-success">
                              +${withdrawal.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {withdrawal.chain_id}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(withdrawal.chain_id)}
                                  className="h-6 w-6 p-0"
                                >
                                  {copiedId === withdrawal.chain_id ? (
                                    <Check className="w-3 h-3 text-success" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {withdrawal.reason}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chain Tracking Tab */}
          <TabsContent value="chain">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Link className="w-4 h-4 mr-2" />
                  Fund Chain Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chain ID</TableHead>
                        <TableHead>Parent Chain</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chainHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No chain tracking records yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        chainHistory.map((chain) => (
                          <TableRow key={chain.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {chain.chain_id.substring(0, 20)}...
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(chain.chain_id)}
                                  className="h-6 w-6 p-0"
                                >
                                  {copiedId === chain.chain_id ? (
                                    <Check className="w-3 h-3 text-success" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              {chain.parent_chain_id ? (
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {chain.parent_chain_id.substring(0, 15)}...
                                </code>
                              ) : (
                                <span className="text-muted-foreground text-xs">Origin</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                chain.source_type === 'treasury_withdrawal' ? 'default' :
                                chain.source_type === 'admin_transfer' ? 'secondary' : 'outline'
                              }>
                                {chain.source_type.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              ${chain.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={chain.is_verified ? 'default' : 'destructive'}>
                                {chain.is_verified ? 'Verified' : 'Invalid'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {new Date(chain.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
