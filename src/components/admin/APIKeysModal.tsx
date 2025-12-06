import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Key, Plus, Edit, Trash2, Eye, EyeOff, AlertTriangle, Server } from "lucide-react";

interface APIKey {
  id: string;
  key_name: string;
  key_type: string;
  key_value: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface APIKeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KEY_TYPES = [
  { value: "blockchain_rpc", label: "Blockchain RPC Endpoint" },
  { value: "api_key", label: "General API Key" },
  { value: "webhook", label: "Webhook URL" },
  { value: "payment_gateway", label: "Payment Gateway" },
  { value: "email_service", label: "Email Service" },
  { value: "sms_service", label: "SMS Service" },
  { value: "other", label: "Other" },
];

const APIKeysModal: React.FC<APIKeysModalProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    key_name: "",
    key_type: "api_key",
    key_value: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      loadApiKeys();
    }
  }, [open]);

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error("Error loading API keys:", error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.key_name || !formData.key_value) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (editingKey) {
        const { error } = await supabase
          .from("api_keys")
          .update({
            key_name: formData.key_name,
            key_type: formData.key_type,
            key_value: formData.key_value,
            description: formData.description,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingKey.id);

        if (error) throw error;
        
        // If this is a blockchain RPC update, notify about server update
        if (formData.key_type === "blockchain_rpc" && formData.is_active) {
          toast({ 
            title: "RPC Updated", 
            description: "Blockchain RPC endpoint updated. All server connections will use the new endpoint." 
          });
        } else {
          toast({ title: "API Key Updated", description: "Key has been updated successfully" });
        }
      } else {
        const { error } = await supabase.from("api_keys").insert([
          {
            key_name: formData.key_name,
            key_type: formData.key_type,
            key_value: formData.key_value,
            description: formData.description,
            is_active: formData.is_active,
          },
        ]);

        if (error) throw error;
        
        if (formData.key_type === "blockchain_rpc") {
          toast({ 
            title: "RPC Added", 
            description: "New blockchain RPC endpoint configured. Server will connect using this endpoint." 
          });
        } else {
          toast({ title: "API Key Created", description: "New key has been created successfully" });
        }
      }

      resetForm();
      loadApiKeys();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (key: APIKey) => {
    setEditingKey(key);
    setFormData({
      key_name: key.key_name,
      key_type: key.key_type,
      key_value: key.key_value,
      description: key.description || "",
      is_active: key.is_active,
    });
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;

    try {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "API Key Deleted", description: "Key has been deleted successfully" });
      loadApiKeys();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (key: APIKey) => {
    try {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: !key.is_active })
        .eq("id", key.id);

      if (error) throw error;
      
      if (key.key_type === "blockchain_rpc") {
        toast({
          title: key.is_active ? "RPC Disabled" : "RPC Enabled",
          description: key.is_active 
            ? "Blockchain RPC endpoint has been disabled" 
            : "Blockchain RPC endpoint is now active. Server connections updated.",
        });
      }
      
      loadApiKeys();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update key status",
        variant: "destructive",
      });
    }
  };

  const toggleShowValue = (id: string) => {
    setShowValues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskValue = (value: string) => {
    if (value.length <= 8) return "••••••••";
    return value.substring(0, 4) + "••••••••" + value.substring(value.length - 4);
  };

  const resetForm = () => {
    setFormData({ key_name: "", key_type: "api_key", key_value: "", description: "", is_active: true });
    setEditingKey(null);
    setIsCreating(false);
  };

  const activeRpc = apiKeys.find(k => k.key_type === "blockchain_rpc" && k.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2" />
            API Keys & RPC Configuration
          </DialogTitle>
          <DialogDescription>
            Manage API keys, blockchain RPC endpoints, and other integrations
          </DialogDescription>
        </DialogHeader>

        {activeRpc && (
          <Alert>
            <Server className="w-4 h-4" />
            <AlertDescription>
              <strong>Active Blockchain RPC:</strong> {activeRpc.key_name} - Server is connected to this endpoint
            </AlertDescription>
          </Alert>
        )}

        {isCreating ? (
          <Card>
            <CardHeader>
              <CardTitle>{editingKey ? "Edit API Key" : "Add New API Key"}</CardTitle>
              <CardDescription>
                {formData.key_type === "blockchain_rpc" 
                  ? "Adding a blockchain RPC will update all server connections to use this endpoint"
                  : "Add API keys for integrations and services"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="key_name">Key Name *</Label>
                  <Input
                    id="key_name"
                    value={formData.key_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, key_name: e.target.value }))}
                    placeholder="e.g., Mainnet RPC, Stripe API Key"
                  />
                </div>

                <div>
                  <Label htmlFor="key_type">Key Type</Label>
                  <Select
                    value={formData.key_type}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, key_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KEY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="key_value">Key Value / Endpoint URL *</Label>
                <Input
                  id="key_value"
                  type="password"
                  value={formData.key_value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, key_value: e.target.value }))}
                  placeholder={formData.key_type === "blockchain_rpc" ? "https://rpc.example.com" : "sk_live_..."}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description..."
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>

              {formData.key_type === "blockchain_rpc" && formData.is_active && (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Enabling this RPC endpoint will update all blockchain connections server-wide. Ensure the endpoint is correct.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? "Saving..." : editingKey ? "Update Key" : "Add Key"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-end">
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Key
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.key_name}</TableCell>
                    <TableCell>
                      {KEY_TYPES.find(t => t.value === key.key_type)?.label || key.key_type}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        {showValues[key.id] ? key.key_value : maskValue(key.key_value)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleShowValue(key.id)}
                        >
                          {showValues[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(key)}
                        className={key.is_active ? "text-green-600" : "text-muted-foreground"}
                      >
                        {key.is_active ? "Active" : "Inactive"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(key)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(key.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {apiKeys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No API keys configured. Click "Add New Key" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default APIKeysModal;
