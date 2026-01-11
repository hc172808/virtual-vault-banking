import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, DollarSign, Link, AlertTriangle, Check, Copy } from "lucide-react";

interface User {
  user_id: string;
  full_name: string;
  email: string;
  balance: number;
}

interface AdminTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: any;
}

export function AdminTransferModal({ open, onOpenChange, currentUser }: AdminTransferModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [parentChainId, setParentChainId] = useState("");
  const [adminBalance, setAdminBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resultChainId, setResultChainId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadData();
      setResultChainId(null);
    }
  }, [open]);

  const loadData = async () => {
    try {
      // Load users (excluding current admin)
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, balance')
        .neq('user_id', currentUser?.id)
        .order('full_name');

      if (!userError && userData) {
        setUsers(userData);
      }

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
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUser || !amount) {
      toast({
        title: "Error",
        description: "Please select a user and enter an amount",
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

    if (numAmount > adminBalance) {
      toast({
        title: "Error",
        description: "Insufficient balance. Withdraw from treasury first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_transfer_with_chain', {
        p_recipient_id: selectedUser,
        p_amount: numAmount,
        p_description: description || null,
        p_parent_chain_id: parentChainId || null
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Transfer failed');
      }

      setResultChainId(result.chain_id);
      setAdminBalance(prev => prev - numAmount);

      toast({
        title: "Transfer Complete",
        description: (
          <div>
            <p>Sent ${numAmount.toFixed(2)} to user</p>
            <p className="text-xs mt-1 font-mono">New Chain ID: {result.chain_id}</p>
          </div>
        ),
      });

      // Reset form
      setSelectedUser("");
      setAmount("");
      setDescription("");
      setParentChainId("");
      loadData();

    } catch (error: any) {
      console.error('Error transferring funds:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to transfer funds",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyChainId = () => {
    if (resultChainId) {
      navigator.clipboard.writeText(resultChainId);
      toast({
        title: "Copied",
        description: "Chain ID copied to clipboard",
      });
    }
  };

  const selectedUserInfo = users.find(u => u.user_id === selectedUser);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Send className="w-5 h-5 mr-2" />
            Admin Transfer with Chain ID
          </DialogTitle>
          <DialogDescription>
            Transfer funds to users with fraud-prevention chain tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Success Result */}
          {resultChainId && (
            <Card className="border-success bg-success/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-success">Transfer Successful!</p>
                    <p className="text-xs text-muted-foreground mt-1">Generated Chain ID:</p>
                    <code className="text-xs font-mono">{resultChainId}</code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyChainId}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Balance */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-xl font-bold">${adminBalance.toFixed(2)} GYD</p>
          </div>

          {/* Select User */}
          <div className="space-y-2">
            <Label htmlFor="user">Select Recipient *</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedUserInfo && (
              <p className="text-xs text-muted-foreground">
                Current balance: ${selectedUserInfo.balance?.toFixed(2) || '0.00'}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (GYD) *</Label>
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

          {/* Parent Chain ID (for tracing) */}
          <div className="space-y-2">
            <Label htmlFor="parentChain" className="flex items-center">
              <Link className="w-4 h-4 mr-2" />
              Parent Chain ID (Optional)
            </Label>
            <Input
              id="parentChain"
              value={parentChainId}
              onChange={(e) => setParentChainId(e.target.value)}
              placeholder="CHN-XXXXXXXX-XXXXXXXXXXXX"
            />
            <p className="text-xs text-muted-foreground">
              Link this transfer to a treasury withdrawal or previous transfer
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for this transfer..."
              rows={2}
            />
          </div>

          {/* Chain ID Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              All admin transfers generate a unique Chain ID that links to the original treasury source. 
              Funds without valid Chain IDs will be flagged as potentially fraudulent.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={loading || !selectedUser || !amount}
              className="flex-1"
            >
              {loading ? "Processing..." : "Transfer Funds"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
