import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield, Bell, Lock, CreditCard } from "lucide-react";

const AccountSettings: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    pinEnabled: false,
    emailNotifications: true,
    pushNotifications: false,
    transactionAlerts: true,
    loginAlerts: true,
    cardLocked: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('pin_enabled')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setSettings(prev => ({
          ...prev,
          pinEnabled: profile.pin_enabled || false,
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSettingChange = async (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    toast({
      title: "Setting Updated",
      description: `${key.replace(/([A-Z])/g, ' $1').trim()} has been ${value ? 'enabled' : 'disabled'}`,
    });
  };

  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl w-full">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="space-y-4 sm:space-y-6 w-full">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Account Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Manage your account preferences and security settings
            </p>
          </div>

          <Separator />

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security & Privacy
              </CardTitle>
              <CardDescription>
                Configure security features for your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="pin-enabled">Transaction PIN</Label>
                  <p className="text-sm text-muted-foreground">
                    Require PIN for all transactions
                  </p>
                </div>
                <Switch
                  id="pin-enabled"
                  checked={settings.pinEnabled}
                  onCheckedChange={(checked) => handleSettingChange('pinEnabled', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="card-locked">Lock Card</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable your card
                  </p>
                </div>
                <Switch
                  id="card-locked"
                  checked={settings.cardLocked}
                  onCheckedChange={(checked) => handleSettingChange('cardLocked', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notifications
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="transaction-alerts">Transaction Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified of all transactions
                  </p>
                </div>
                <Switch
                  id="transaction-alerts"
                  checked={settings.transactionAlerts}
                  onCheckedChange={(checked) => handleSettingChange('transactionAlerts', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="login-alerts">Login Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert me of new sign-ins
                  </p>
                </div>
                <Switch
                  id="login-alerts"
                  checked={settings.loginAlerts}
                  onCheckedChange={(checked) => handleSettingChange('loginAlerts', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Manage your account and profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/profile')}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Profile
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/')}
              >
                <Lock className="w-4 h-4 mr-2" />
                Change PIN
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
