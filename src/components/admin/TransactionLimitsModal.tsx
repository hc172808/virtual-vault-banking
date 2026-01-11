import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Shield, DollarSign, Save, Settings } from "lucide-react";

interface TransactionLimitsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionLimitsModal({ open, onOpenChange }: TransactionLimitsModalProps) {
  const [highValueThreshold, setHighValueThreshold] = useState("1000.00");
  const [verificationRequired, setVerificationRequired] = useState(true);
  const [maxTransferAmount, setMaxTransferAmount] = useState("10000.00");
  const [minTransferAmount, setMinTransferAmount] = useState("1.00");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'high_value_threshold',
          'high_value_verification_required',
          'max_transfer_amount',
          'min_transfer_amount'
        ]);

      if (error) throw error;

      if (data) {
        data.forEach(setting => {
          switch (setting.setting_key) {
            case 'high_value_threshold':
              setHighValueThreshold(setting.setting_value);
              break;
            case 'high_value_verification_required':
              setVerificationRequired(setting.setting_value === 'true');
              break;
            case 'max_transfer_amount':
              setMaxTransferAmount(setting.setting_value);
              break;
            case 'min_transfer_amount':
              setMinTransferAmount(setting.setting_value);
              break;
          }
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction limits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { setting_key: 'high_value_threshold', setting_value: highValueThreshold },
        { setting_key: 'high_value_verification_required', setting_value: verificationRequired.toString() },
        { setting_key: 'max_transfer_amount', setting_value: maxTransferAmount },
        { setting_key: 'min_transfer_amount', setting_value: minTransferAmount },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ 
            setting_value: update.setting_value,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', update.setting_key);

        if (error) throw error;
      }

      // Log the change
      const { data: currentUser } = await supabase.auth.getUser();
      await supabase.from('activity_logs').insert({
        user_id: currentUser.user?.id,
        action_type: 'SETTINGS_UPDATED',
        description: `Updated transaction limits: High-value threshold: $${highValueThreshold}, Verification: ${verificationRequired}`
      });

      toast({
        title: "Success",
        description: "Transaction limits updated successfully",
      });

      onOpenChange(false);

    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Transaction Limits
          </DialogTitle>
          <DialogDescription>
            Configure transaction limits and verification requirements
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* High-Value Transaction Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <AlertTriangle className="w-4 h-4 mr-2 text-warning" />
                  High-Value Transaction Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Threshold Amount */}
                <div className="space-y-2">
                  <Label htmlFor="threshold">High-Value Threshold (GYD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="threshold"
                      type="number"
                      min="0"
                      step="0.01"
                      value={highValueThreshold}
                      onChange={(e) => setHighValueThreshold(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Transactions above this amount require additional verification
                  </p>
                </div>

                {/* Verification Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="verification" className="flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Require Extra Verification
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      High-value transfers need PIN + confirmation
                    </p>
                  </div>
                  <Switch
                    id="verification"
                    checked={verificationRequired}
                    onCheckedChange={setVerificationRequired}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Transfer Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Transfer Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Minimum Transfer */}
                <div className="space-y-2">
                  <Label htmlFor="minAmount">Minimum Transfer Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="minAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={minTransferAmount}
                      onChange={(e) => setMinTransferAmount(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Maximum Transfer */}
                <div className="space-y-2">
                  <Label htmlFor="maxAmount">Maximum Transfer Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="maxAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={maxTransferAmount}
                      onChange={(e) => setMaxTransferAmount(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
