import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Plus, History, TrendingUp, TrendingDown } from "lucide-react";

interface FundLog {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  reason: string;
  admin_id: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface User {
  user_id: string;
  full_name: string;
  email: string;
  balance: number;
}

interface FundManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: any;
}

export function FundManagementModal({ open, onOpenChange, currentUser }: FundManagementModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [fundLogs, setFundLogs] = useState<FundLog[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [amount, setAmount] = useState("");
  const [fundType, setFundType] = useState("ADD");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, balance')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadFundLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('fund_logs')
        .select(`
          *,
          profiles!fund_logs_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setFundLogs(data || []);
    } catch (error) {
      console.error('Error loading fund logs:', error);
    }
  };

  const addFunds = async () => {
    if (!selectedUser || !amount || !reason.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const numAmount = Number(amount);
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
      // Get current user balance
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('user_id', selectedUser)
        .single();

      if (userError) throw userError;

      const currentBalance = userProfile.balance || 0;
      const finalAmount = fundType === 'ADD' ? numAmount : -numAmount;
      const newBalance = currentBalance + finalAmount;

      if (newBalance < 0) {
        toast({
          title: "Error",
          description: "Insufficient balance for withdrawal",
          variant: "destructive",
        });
        return;
      }

      // Update user balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('user_id', selectedUser);

      if (updateError) throw updateError;

      // Log the fund operation
      const { error: logError } = await supabase
        .from('fund_logs')
        .insert({
          user_id: selectedUser,
          amount: finalAmount,
          type: fundType,
          reason: reason.trim(),
          admin_id: currentUser.id,
          balance_before: currentBalance,
          balance_after: newBalance
        });

      if (logError) throw logError;

      toast({
        title: "Success",
        description: `Funds ${fundType === 'ADD' ? 'added' : 'withdrawn'} successfully`,
      });

      // Reset form
      setSelectedUser("");
      setAmount("");
      setReason("");
      setFundType("ADD");

      // Reload data
      loadUsers();
      loadFundLogs();

    } catch (error) {
      console.error('Error managing funds:', error);
      toast({
        title: "Error",
        description: "Failed to process fund operation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadUsers();
      loadFundLogs();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Fund Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add/Withdraw Funds */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Add/Withdraw Funds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="user-select">Select User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.full_name} ({user.email}) - ${user.balance?.toFixed(2) || '0.00'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fund-type">Operation Type</Label>
                    <Select value={fundType} onValueChange={setFundType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADD">Add Funds</SelectItem>
                        <SelectItem value="WITHDRAW">Withdraw Funds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason">Reason (Required)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Enter reason for fund operation..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <Button 
                    onClick={addFunds} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Processing..." : `${fundType === 'ADD' ? 'Add' : 'Withdraw'} Funds`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fund History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="w-4 h-4 mr-2" />
                Recent Fund Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance Change</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fundLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No fund operations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      fundLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {new Date(log.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {log.profiles?.full_name || 'Unknown User'}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {log.profiles?.email}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {log.type === 'ADD' ? (
                                <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 mr-1 text-red-500" />
                              )}
                              {log.type}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={log.amount > 0 ? "text-green-600" : "text-red-600"}>
                              ${Math.abs(log.amount).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            ${log.balance_before?.toFixed(2)} → ${log.balance_after?.toFixed(2)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {log.reason}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}