import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Bell, 
  Users, 
  Settings, 
  Send, 
  Eye, 
  Lock,
  LogOut,
  User as UserIcon,
  QrCode,
  History
} from "lucide-react";
import CardViewModal from "./CardViewModal";
import PinSettingsModal from "./PinSettingsModal";  
import TransactionModal from "./TransactionModal";
import QRScannerModal from "./QRScannerModal";
import TransactionHistoryModal from "./TransactionHistoryModal";
import NotificationSystem from "./NotificationSystem";
import { ManageUsersModal } from "./admin/ManageUsersModal";
import { FundManagementModal } from "./admin/FundManagementModal";
import SystemSettingsModal from "./admin/SystemSettingsModal";
import CardPrintingModal from "./admin/CardPrintingModal";

interface SimpleBankingAppProps {
  user: any;
}

const SimpleBankingApp: React.FC<SimpleBankingAppProps> = ({ user }) => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCardView, setShowCardView] = useState(false);
  const [showPinSettings, setShowPinSettings] = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [cardLocked, setCardLocked] = useState(false);

  // Admin modals
  const [showManageUsers, setShowManageUsers] = useState(false);
  const [showFundManagement, setShowFundManagement] = useState(false);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [showCardPrinting, setShowCardPrinting] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email,
            role: 'CLIENT',
            balance: 0.00
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile);
      } else if (error) {
        throw error;
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to load profile</p>
          <Button onClick={loadProfile}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {profile.full_name}
            </h1>
            <p className="text-muted-foreground">
              {profile.role === 'ADMIN' ? 'System Administrator' : 
               profile.role === 'AGENT' ? 'Customer Service Agent' : 
               'Secure Banking Dashboard'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationSystem userId={user?.id || ''} />
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="flex items-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Alert for role-based access */}
        {profile.role !== 'CLIENT' && (
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You are logged in as {profile.role}. You have {profile.role === 'ADMIN' ? 'full system access' : 'limited administrative access'}.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${profile.balance?.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                +19% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Card Status</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <Badge variant={cardLocked ? "destructive" : "default"} className="mr-2">
                  {cardLocked ? 'LOCKED' : 'ACTIVE'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Virtual card ready
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">98%</div>
              <p className="text-xs text-muted-foreground">
                Excellent security
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Virtual Card & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Virtual Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Your StableCoin Card
              </CardTitle>
              <CardDescription>
                Virtual debit card for secure transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm mx-auto">
              <div 
                className="w-full aspect-[1.586] bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-xl rounded-xl p-4 flex flex-col justify-between relative cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setShowCardView(true)}
              >
                <div className="flex justify-between items-start">
                  <Badge className="bg-white/20 text-white text-xs px-2 py-0.5">
                    {cardLocked ? 'LOCKED' : 'ACTIVE'}
                  </Badge>
                  <div className="text-sm font-bold">StableCoin</div>
                </div>

                <div className="absolute top-3 left-3">
                  <div className="w-10 h-6 bg-yellow-400 rounded"></div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-base font-mono tracking-wider">
                    •••• •••• •••• 9012
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] opacity-70">CARDHOLDER</p>
                      <p className="font-semibold text-xs uppercase">
                        {profile.full_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] opacity-70">EXPIRES</p>
                      <p className="font-mono text-xs">12/28</p>
                    </div>
                  </div>
                </div>
              </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCardView(true)}
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Card
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      setCardLocked(!cardLocked);
                      toast({
                        title: cardLocked ? "Card Unlocked" : "Card Locked",
                        description: `Your card has been ${cardLocked ? 'unlocked' : 'locked'} successfully`,
                      });
                    }}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {cardLocked ? 'Unlock' : 'Lock'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Send className="w-5 h-5 mr-2" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Manage your account and transactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => setShowTransaction(true)}
                    className="justify-start h-12"
                  >
                    <Send className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium text-xs">Send Money</div>
                      <div className="text-xs opacity-80">Bank transfer</div>
                    </div>
                  </Button>
                  <Button 
                    onClick={() => setShowQRScanner(true)}
                    className="justify-start h-12"
                    variant="outline"
                  >
                    <QrCode className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-medium text-xs">QR Transfer</div>
                      <div className="text-xs opacity-80">Scan & pay</div>
                    </div>
                  </Button>
                </div>
                
                <Button 
                  variant="outline"
                  onClick={() => setShowPinSettings(true)}
                  className="justify-start h-12"
                >
                  <Lock className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">PIN Settings</div>
                    <div className="text-xs text-muted-foreground">
                      {profile.pin_enabled ? 'PIN protection enabled' : 'Set up transaction PIN'}
                    </div>
                  </div>
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => setShowCardView(true)}
                  className="justify-start h-12"
                >
                  <CreditCard className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Card Details</div>
                    <div className="text-xs text-muted-foreground">View card information</div>
                  </div>
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => setShowTransactionHistory(true)}
                  className="justify-start h-12"
                >
                  <History className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Transaction History</div>
                    <div className="text-xs text-muted-foreground">View account activity</div>
                  </div>
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/settings'}
                  className="justify-start h-12"
                >
                  <Settings className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Account Settings</div>
                    <div className="text-xs text-muted-foreground">Manage preferences</div>
                  </div>
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/profile'}
                  className="justify-start h-12"
                >
                  <UserIcon className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Manage Profile</div>
                    <div className="text-xs text-muted-foreground">Update your information</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role-specific features */}
        {profile.role === 'ADMIN' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Admin Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => setShowManageUsers(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => setShowFundManagement(true)}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Fund Management
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => setShowSystemSettings(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => setShowCardPrinting(true)}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Card Printing
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {profile.role === 'AGENT' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Agent Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Client Support
                </Button>
                <Button variant="outline" className="justify-start">
                  <CreditCard className="w-4 h-4 mr-2" />
                  KYC Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Admin Modals */}
      <ManageUsersModal 
        open={showManageUsers} 
        onOpenChange={setShowManageUsers} 
      />
      <FundManagementModal 
        open={showFundManagement} 
        onOpenChange={setShowFundManagement}
        currentUser={user}
      />
      <SystemSettingsModal 
        open={showSystemSettings} 
        onOpenChange={setShowSystemSettings} 
      />
      <CardPrintingModal 
        open={showCardPrinting} 
        onOpenChange={setShowCardPrinting} 
      />

      {/* User Modals */}
      <CardViewModal
        open={showCardView}
        onOpenChange={setShowCardView}
        userProfile={profile}
      />
      <PinSettingsModal
        open={showPinSettings}
        onOpenChange={setShowPinSettings}
        userId={user?.id || ''}
      />
      <TransactionModal
        open={showTransaction}
        onOpenChange={setShowTransaction}
        userProfile={profile}
        userId={user?.id || ''}
        onTransactionComplete={loadProfile}
      />
      <QRScannerModal
        open={showQRScanner}
        onOpenChange={setShowQRScanner}
        userProfile={profile}
        userId={user?.id || ''}
        onTransactionComplete={loadProfile}
      />
      <TransactionHistoryModal
        open={showTransactionHistory}
        onOpenChange={setShowTransactionHistory}
        userId={user?.id || ''}
      />
    </div>
  );
}

export default SimpleBankingApp;