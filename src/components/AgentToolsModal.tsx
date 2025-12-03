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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wrench,
  Search,
  User,
  DollarSign,
  History,
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface AgentToolsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  mobile_number: string | null;
  balance: number;
  pin_enabled: boolean;
  role: string;
  created_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  fee: number;
  created_at: string;
  status: string;
  transaction_type: string;
  description: string | null;
}

const AgentToolsModal: React.FC<AgentToolsModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,mobile_number.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setUserTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleSelectUser = async (user: UserProfile) => {
    setSelectedUser(user);
    await loadUserTransactions(user.user_id);
  };

  const handleResetPin = async () => {
    if (!selectedUser) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pin_hash: null, pin_enabled: false })
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      toast({
        title: "PIN Reset",
        description: `PIN has been reset for ${selectedUser.full_name}`,
      });

      setSelectedUser({ ...selectedUser, pin_enabled: false });
    } catch (error) {
      console.error('Error resetting PIN:', error);
      toast({
        title: "Error",
        description: "Failed to reset PIN",
        variant: "destructive",
      });
    }
  };

  const handleVerifyAccount = async () => {
    if (!selectedUser) return;
    
    toast({
      title: "Account Verified",
      description: `Account for ${selectedUser.full_name} has been verified`,
    });
  };

  const handleFlagAccount = async () => {
    if (!selectedUser) return;
    
    toast({
      title: "Account Flagged",
      description: `Account for ${selectedUser.full_name} has been flagged for review`,
      variant: "destructive",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Agent Tools
          </DialogTitle>
          <DialogDescription>
            Access customer support and account management tools
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="lookup" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lookup">Account Lookup</TabsTrigger>
            <TabsTrigger value="actions">Quick Actions</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="lookup" className="space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search Results */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Search Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {searchResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Search for a user to view details
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedUser?.id === user.id ? 'border-primary bg-accent' : 'hover:bg-accent/50'
                            }`}
                            onClick={() => handleSelectUser(user)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                              <Badge variant="outline">{user.role}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* User Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">User Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedUser ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Name</p>
                          <p className="font-medium">{selectedUser.full_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Balance</p>
                          <p className="font-medium">{selectedUser.balance?.toFixed(2)} GYD</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Email</p>
                          <p className="font-medium text-xs">{selectedUser.email}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="font-medium">{selectedUser.mobile_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">PIN Status</p>
                          <Badge variant={selectedUser.pin_enabled ? "default" : "secondary"}>
                            {selectedUser.pin_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Role</p>
                          <Badge>{selectedUser.role}</Badge>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={handleResetPin}>
                          <Lock className="h-3 w-3 mr-1" />
                          Reset PIN
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleVerifyAccount}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verify
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleFlagAccount}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Flag
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Select a user to view details
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Transaction History */}
            {selectedUser && userTransactions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {userTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div>
                            <p className="text-sm font-medium">{tx.transaction_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{tx.amount.toFixed(2)} GYD</p>
                            <Badge variant="outline" className="text-xs">{tx.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Process Deposit
                  </CardTitle>
                  <CardDescription>Add funds to customer account</CardDescription>
                </CardHeader>
              </Card>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Process Withdrawal
                  </CardTitle>
                  <CardDescription>Withdraw funds from account</CardDescription>
                </CardHeader>
              </Card>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Reset Customer PIN
                  </CardTitle>
                  <CardDescription>Reset PIN for customer</CardDescription>
                </CardHeader>
              </Card>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Update Profile
                  </CardTitle>
                  <CardDescription>Edit customer information</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Daily Summary</CardTitle>
                  <CardDescription>Today's activity overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Deposits</span>
                      <span className="font-medium">0.00 GYD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Withdrawals</span>
                      <span className="font-medium">0.00 GYD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Customers Served</span>
                      <span className="font-medium">0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Pending Actions</CardTitle>
                  <CardDescription>Items requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">KYC Reviews</span>
                      <Badge>0</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Flagged Accounts</span>
                      <Badge variant="destructive">0</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Support Tickets</span>
                      <Badge variant="secondary">0</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AgentToolsModal;
