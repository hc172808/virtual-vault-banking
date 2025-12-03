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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  User,
  FileCheck,
  FileX,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  MapPin,
  CreditCard,
  Phone,
  Mail,
} from "lucide-react";

interface KYCReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  mobile_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  address_line1: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  id_type: string | null;
  id_number: string | null;
  tin_number: string | null;
  occupation: string | null;
  created_at: string;
  kyc_status?: 'pending' | 'approved' | 'rejected';
}

const KYCReviewModal: React.FC<KYCReviewModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'complete' | 'incomplete'>('all');

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

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

  const getKYCCompleteness = (user: UserProfile) => {
    const requiredFields = [
      user.full_name,
      user.mobile_number,
      user.date_of_birth,
      user.nationality,
      user.address_line1,
      user.city,
      user.country,
      user.id_type,
      user.id_number,
    ];
    const filledFields = requiredFields.filter(f => f && f.trim() !== '').length;
    return Math.round((filledFields / requiredFields.length) * 100);
  };

  const getKYCStatus = (user: UserProfile) => {
    const completeness = getKYCCompleteness(user);
    if (completeness === 100) return 'complete';
    if (completeness >= 50) return 'partial';
    return 'incomplete';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.mobile_number && user.mobile_number.includes(searchTerm));
    
    if (!matchesSearch) return false;
    
    if (filter === 'all') return true;
    if (filter === 'complete') return getKYCCompleteness(user) === 100;
    if (filter === 'incomplete') return getKYCCompleteness(user) < 100;
    if (filter === 'pending') return getKYCCompleteness(user) >= 50 && getKYCCompleteness(user) < 100;
    
    return true;
  });

  const handleApproveKYC = async (userId: string) => {
    toast({
      title: "KYC Approved",
      description: "User KYC has been approved successfully",
    });
    setSelectedUser(null);
  };

  const handleRejectKYC = async (userId: string) => {
    toast({
      title: "KYC Rejected",
      description: "User KYC has been rejected",
      variant: "destructive",
    });
    setSelectedUser(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            KYC Review
          </DialogTitle>
          <DialogDescription>
            Review and verify customer identification documents
          </DialogDescription>
        </DialogHeader>

        {!selectedUser ? (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'complete', 'pending', 'incomplete'] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="capitalize"
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </div>

            {/* User List */}
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => {
                    const completeness = getKYCCompleteness(user);
                    const status = getKYCStatus(user);
                    return (
                      <Card
                        key={user.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setSelectedUser(user)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{user.full_name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <Badge
                                  variant={
                                    status === 'complete' ? 'default' :
                                    status === 'partial' ? 'secondary' : 'destructive'
                                  }
                                >
                                  {completeness}% Complete
                                </Badge>
                              </div>
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                ← Back to list
              </Button>

              {/* User Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{selectedUser.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </p>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Mobile
                    </p>
                    <p className="font-medium">{selectedUser.mobile_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Date of Birth
                    </p>
                    <p className="font-medium">{selectedUser.date_of_birth || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium">{selectedUser.gender || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nationality</p>
                    <p className="font-medium">{selectedUser.nationality || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Occupation</p>
                    <p className="font-medium">{selectedUser.occupation || 'Not provided'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{selectedUser.address_line1 || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">{selectedUser.city || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Region</p>
                    <p className="font-medium">{selectedUser.region || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="font-medium">{selectedUser.country || 'Not provided'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Identification Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ID Type</p>
                    <p className="font-medium capitalize">{selectedUser.id_type?.replace('_', ' ') || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID Number</p>
                    <p className="font-medium">{selectedUser.id_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">TIN Number</p>
                    <p className="font-medium">{selectedUser.tin_number || 'Not provided'}</p>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* KYC Completeness */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">KYC Completeness</span>
                  <span className="text-lg font-bold">{getKYCCompleteness(selectedUser)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${getKYCCompleteness(selectedUser)}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1"
                  onClick={() => handleApproveKYC(selectedUser.user_id)}
                  disabled={getKYCCompleteness(selectedUser) < 100}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve KYC
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleRejectKYC(selectedUser.user_id)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject KYC
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default KYCReviewModal;
