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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Printer, Users, Package } from "lucide-react";

interface CardPrintingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PrintJob {
  id: string;
  user_id: string;
  full_name: string;
  card_type: string;
  status: string;
  quantity: number;
  created_at: string;
}

interface User {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

const CardPrintingModal: React.FC<CardPrintingModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [cardType, setCardType] = useState("virtual");
  const [quantity, setQuantity] = useState("1");

  useEffect(() => {
    if (open) {
      loadUsers();
      loadPrintJobs();
    }
  }, [open]);

  const loadUsers = async () => {
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
    }
  };

  const loadPrintJobs = async () => {
    // This would typically load from a print_jobs table
    // For now, we'll simulate some data
    setPrintJobs([
      {
        id: "1",
        user_id: "user1",
        full_name: "John Doe",
        card_type: "physical",
        status: "pending",
        quantity: 1,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const submitPrintJob = async () => {
    if (!selectedUser || !cardType) {
      toast({
        title: "Error",
        description: "Please select a user and card type",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const selectedUserData = users.find(u => u.user_id === selectedUser);
      
      // Log the print job activity
      await supabase
        .from('activity_logs')
        .insert({
          action_type: 'CARD_PRINT_REQUEST',
          description: `Print job created for ${selectedUserData?.full_name} - ${cardType} card (${quantity} qty)`,
          user_id: selectedUser,
        });

      // Here you would typically create a print job record
      // For now, we'll just show a success message
      toast({
        title: "Print Job Created",
        description: `Card printing request submitted for ${selectedUserData?.full_name}`,
      });

      // Reset form
      setSelectedUser("");
      setCardType("virtual");
      setQuantity("1");
      
      loadPrintJobs();
    } catch (error) {
      console.error('Error creating print job:', error);
      toast({
        title: "Error",
        description: "Failed to create print job",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'printing': return 'outline';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Printer className="w-5 h-5 mr-2" />
            Card Printing Management
          </DialogTitle>
          <DialogDescription>
            Create and manage card printing requests for users
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* New Print Job */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />
                Create Print Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="user-select">Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="card-type">Card Type</Label>
                <Select value={cardType} onValueChange={setCardType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="virtual">Virtual Card</SelectItem>
                    <SelectItem value="physical">Physical Card</SelectItem>
                    <SelectItem value="premium">Premium Card</SelectItem>
                    <SelectItem value="business">Business Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <Button 
                onClick={submitPrintJob} 
                disabled={loading || !selectedUser}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Print Job"}
              </Button>
            </CardContent>
          </Card>

          {/* Print Job Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Print Job Queue
              </CardTitle>
              <CardDescription>
                Current printing requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {printJobs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No print jobs in queue
                  </p>
                ) : (
                  printJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{job.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.card_type} • Qty: {job.quantity}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(job.status)}>
                        {job.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Printing Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">0</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-500">0</div>
              <div className="text-sm text-muted-foreground">Printing</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">0</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">0</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CardPrintingModal;