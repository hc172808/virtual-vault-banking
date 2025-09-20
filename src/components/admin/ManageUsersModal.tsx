import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, UserX, UserCheck, Edit3, Trash2 } from "lucide-react";

interface User {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  balance: number;
  created_at: string;
}

interface ManageUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageUsersModal({ open, onOpenChange }: ManageUsersModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const { toast } = useToast();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const updateUserBalance = async (userId: string, newBalance: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User balance updated successfully",
      });

      loadUsers();
    } catch (error) {
      console.error('Error updating user balance:', error);
      toast({
        title: "Error",
        description: "Failed to update user balance",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'destructive';
      case 'AGENT': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Manage Users
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="role-filter">Filter by Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="CLIENT">Client</SelectItem>
                      <SelectItem value="AGENT">Agent</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Users Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>${user.balance?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Select
                                value={user.role}
                                onValueChange={(newRole) => updateUserRole(user.user_id, newRole)}
                              >
                                <SelectTrigger className="w-24 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CLIENT">Client</SelectItem>
                                  <SelectItem value="AGENT">Agent</SelectItem>
                                  <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newBalance = prompt("Enter new balance:", user.balance?.toString() || "0");
                                  if (newBalance !== null && !isNaN(Number(newBalance))) {
                                    updateUserBalance(user.user_id, Number(newBalance));
                                  }
                                }}
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                            </div>
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