// Banking App Component
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
  History,
  ArrowDownLeft
} from "lucide-react";
import CardViewModal from "./CardViewModal";
import PinSettingsModal from "./PinSettingsModal";  
import TransactionModal from "./TransactionModal";
import QRScannerModal from "./QRScannerModal";
import TransactionHistoryModal from "./TransactionHistoryModal";
import NotificationSystem from "./NotificationSystem";
import PWAInstallButton from "./PWAInstallButton";
import PaymentRequestsModal from "./PaymentRequestsModal";
import NavigationMenu from "./NavigationMenu";
import AdminAnalyticsDashboard from "./admin/AdminAnalyticsDashboard";
import { ManageUsersModal } from "./admin/ManageUsersModal";
import { FundManagementModal } from "./admin/FundManagementModal";
import SystemSettingsModal from "./admin/SystemSettingsModal";
import CardPrintingModal from "./admin/CardPrintingModal";
import { AnnouncementsModal } from "./admin/AnnouncementsModal";
import { AnnouncementBanner } from "./AnnouncementBanner";
import DatabaseBackupModal from "./admin/DatabaseBackupModal";
import BlockchainConfigModal from "./admin/BlockchainConfigModal";
import KYCReviewModal from "./KYCReviewModal";
import AgentToolsModal from "./AgentToolsModal";
import ClientSupportModal from "./ClientSupportModal";
import ReceiveFundsModal from "./ReceiveFundsModal";
import KnowledgeBaseModal from "./KnowledgeBaseModal";
import LiveChatModal from "./LiveChatModal";
import FAQManagementModal from "./admin/FAQManagementModal";
import APIKeysModal from "./admin/APIKeysModal";
import WalletManagementModal from "./WalletManagementModal";
import WalletSecurityModal from "./WalletSecurityModal";
import RequestFundsModal from "./RequestFundsModal";
import ThemeSelector from "./ThemeSelector";
import { TreasuryManagementModal } from "./admin/TreasuryManagementModal";
import { AdminTransferModal } from "./admin/AdminTransferModal";
import { CreateUserModal } from "./admin/CreateUserModal";
import { TransactionLimitsModal } from "./admin/TransactionLimitsModal";
import { HighValueVerificationModal } from "./HighValueVerificationModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Gauge, UserPlus, SendHorizontal } from "lucide-react";

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
  const [qrInitialMode, setQrInitialMode] = useState<'scan' | 'manual'>('scan');
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showPaymentRequests, setShowPaymentRequests] = useState(false);
  const [cardLocked, setCardLocked] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showReceiveFunds, setShowReceiveFunds] = useState(false);

  // Admin modals
  const [showManageUsers, setShowManageUsers] = useState(false);
  const [showFundManagement, setShowFundManagement] = useState(false);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [showCardPrinting, setShowCardPrinting] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showDatabaseBackup, setShowDatabaseBackup] = useState(false);
  const [showBlockchainConfig, setShowBlockchainConfig] = useState(false);
  
  // Agent/Admin modals
  const [showKYCReview, setShowKYCReview] = useState(false);
  const [showAgentTools, setShowAgentTools] = useState(false);
  const [showClientSupport, setShowClientSupport] = useState(false);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [showFAQManagement, setShowFAQManagement] = useState(false);
  const [showAPIKeys, setShowAPIKeys] = useState(false);
  const [showWalletManagement, setShowWalletManagement] = useState(false);
  const [showWalletSecurity, setShowWalletSecurity] = useState(false);
  const [showRequestFunds, setShowRequestFunds] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  
  // New Admin modals
  const [showTreasuryManagement, setShowTreasuryManagement] = useState(false);
  const [showAdminTransfer, setShowAdminTransfer] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showTransactionLimits, setShowTransactionLimits] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      
      // Subscribe to real-time balance updates
      const channel = supabase
        .channel('profile-balance-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Balance updated:', payload);
            setProfile((prev: any) => ({
              ...prev,
              balance: payload.new.balance,
            }));
            toast({
              title: "Balance Updated",
              description: `Your balance is now ${payload.new.balance?.toFixed(2)} GYD`,
            });
          }
        )
        .subscribe();

      // Auto-refresh balance every 3 seconds
      const refreshInterval = setInterval(() => {
        refreshBalance();
      }, 3000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(refreshInterval);
      };
    }
  }, [user]);

  const refreshBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setProfile((prev: any) => ({
          ...prev,
          balance: data.balance,
        }));
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

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

  const handleMenuItemClick = (itemId: string) => {
    switch (itemId) {
      case 'pin':
        setShowPinSettings(true);
        break;
      case 'card':
        setShowCardView(true);
        break;
      case 'history':
        setShowTransactionHistory(true);
        break;
      case 'requests':
        setShowPaymentRequests(true);
        break;
      case 'settings':
        window.location.href = '/settings';
        break;
      case 'profile':
        window.location.href = '/profile';
        break;
      case 'analytics':
        setShowAnalytics(true);
        break;
      case 'database':
        setShowDatabaseBackup(true);
        break;
      case 'blockchain':
        setShowBlockchainConfig(true);
        break;
      case 'kyc':
        setShowKYCReview(true);
        break;
      case 'agent-tools':
        setShowAgentTools(true);
        break;
      case 'support':
        setShowClientSupport(true);
        break;
      case 'faq':
        setShowKnowledgeBase(true);
        break;
      case 'live-chat':
        setShowLiveChat(true);
        break;
      case 'wallet':
        setShowWalletManagement(true);
        break;
      case 'wallet-security':
        setShowWalletSecurity(true);
        break;
      case 'faq-manage':
        setShowFAQManagement(true);
        break;
      case 'api-keys':
        setShowAPIKeys(true);
        break;
      case 'theme':
        setShowThemeSelector(true);
        break;
      case 'admin':
        // Show admin menu or modal
        break;
      default:
        toast({
          title: "Coming Soon",
          description: `${itemId} feature is under development`,
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
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div className="w-full sm:w-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back, {profile.full_name}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {profile.role === 'ADMIN' ? 'System Administrator' : 
               profile.role === 'AGENT' ? 'Customer Service Agent' : 
               'Secure Banking Dashboard'}
            </p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-end">
            <NavigationMenu userRole={profile.role} onMenuItemClick={handleMenuItemClick} />
            <NotificationSystem userId={user?.id || ''} />
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="flex items-center text-sm"
              size="sm"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        <AnnouncementBanner />

        <PWAInstallButton />

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 w-full">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile.balance?.toFixed(2) || '0.00'} GYD</div>
              <p className="text-xs text-muted-foreground">
                ≈ ${profile.balance?.toFixed(2) || '0.00'} USD
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

        {/* Virtual Card */}
        <div className="w-full">
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
              <div className="w-full max-w-sm mx-auto">
              <div 
                className="w-full aspect-[1.586] bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-xl rounded-xl p-3 sm:p-4 flex flex-col justify-between relative cursor-pointer hover:scale-105 transition-transform"
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
                  <div className="text-sm sm:text-base font-mono tracking-wider">
                    •••• •••• •••• 9012
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] sm:text-[10px] opacity-70">CARDHOLDER</p>
                      <p className="font-semibold text-[10px] sm:text-xs uppercase">
                        {profile.full_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] sm:text-[10px] opacity-70">EXPIRES</p>
                      <p className="font-mono text-[10px] sm:text-xs">12/28</p>
                    </div>
                  </div>
                </div>
              </div>

              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role-specific features */}
        {profile.role === 'ADMIN' && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Admin Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <Button 
                  variant="outline" 
                  className="justify-start h-10 sm:h-auto text-xs sm:text-sm"
                  onClick={() => setShowManageUsers(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-10 sm:h-auto text-xs sm:text-sm"
                  onClick={() => setShowCreateUser(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-10 sm:h-auto text-xs sm:text-sm"
                  onClick={() => setShowFundManagement(true)}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Fund Management
                </Button>
                <Button 
                  variant="default" 
                  className="justify-start h-10 sm:h-auto text-xs sm:text-sm"
                  onClick={() => setShowTreasuryManagement(true)}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Bank Treasury
                </Button>
                <Button 
                  variant="secondary" 
                  className="justify-start h-10 sm:h-auto text-xs sm:text-sm"
                  onClick={() => setShowAdminTransfer(true)}
                >
                  <SendHorizontal className="w-4 h-4 mr-2" />
                  Admin Transfer
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-10 sm:h-auto text-xs sm:text-sm"
                  onClick={() => setShowTransactionLimits(true)}
                >
                  <Gauge className="w-4 h-4 mr-2" />
                  Transaction Limits
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-10 sm:h-auto text-xs sm:text-sm"
                  onClick={() => setShowSystemSettings(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-10 sm:h-auto text-xs sm:text-sm"
                  onClick={() => setShowCardPrinting(true)}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Card Printing
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-10 sm:h-auto text-xs sm:text-sm"
                  onClick={() => setShowAnnouncements(true)}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Announcements
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {profile.role === 'AGENT' && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Agent Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Button 
                  variant="outline" 
                  className="justify-start h-10 sm:h-auto text-xs sm:text-sm"
                  onClick={() => setShowClientSupport(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Client Support
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-10 sm:h-auto text-xs sm:text-sm"
                  onClick={() => setShowKYCReview(true)}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  KYC Review
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-10 sm:h-auto text-xs sm:text-sm"
                  onClick={() => setShowAgentTools(true)}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Agent Tools
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
      <AnnouncementsModal 
        open={showAnnouncements} 
        onOpenChange={setShowAnnouncements} 
      />
      <TreasuryManagementModal
        open={showTreasuryManagement}
        onOpenChange={setShowTreasuryManagement}
        currentUser={user}
      />
      <AdminTransferModal
        open={showAdminTransfer}
        onOpenChange={setShowAdminTransfer}
        currentUser={user}
      />
      <CreateUserModal
        open={showCreateUser}
        onOpenChange={setShowCreateUser}
        onUserCreated={loadProfile}
      />
      <TransactionLimitsModal
        open={showTransactionLimits}
        onOpenChange={setShowTransactionLimits}
      />

      {/* User Modals */}
      <CardViewModal
        open={showCardView}
        onOpenChange={setShowCardView}
        userProfile={profile ? { ...profile, user_id: user?.id } : null}
        onProfileUpdate={loadProfile}
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
        initialMode={qrInitialMode}
      />
      <TransactionHistoryModal
        open={showTransactionHistory}
        onOpenChange={setShowTransactionHistory}
        userId={user?.id || ''}
      />
      <PaymentRequestsModal
        open={showPaymentRequests}
        onOpenChange={setShowPaymentRequests}
        userId={user?.id || ''}
        onRequestProcessed={loadProfile}
      />

      {/* Analytics Modal */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analytics Dashboard</DialogTitle>
          </DialogHeader>
          <AdminAnalyticsDashboard />
        </DialogContent>
      </Dialog>

      {/* Database Backup Modal */}
      <DatabaseBackupModal
        open={showDatabaseBackup}
        onOpenChange={setShowDatabaseBackup}
      />

      {/* Blockchain Config Modal */}
      <BlockchainConfigModal
        open={showBlockchainConfig}
        onOpenChange={setShowBlockchainConfig}
      />

      {/* KYC Review Modal */}
      <KYCReviewModal
        open={showKYCReview}
        onOpenChange={setShowKYCReview}
      />

      {/* Agent Tools Modal */}
      <AgentToolsModal
        open={showAgentTools}
        onOpenChange={setShowAgentTools}
      />

      {/* Client Support Modal */}
      <ClientSupportModal
        open={showClientSupport}
        onOpenChange={setShowClientSupport}
      />

      {/* Receive Funds Modal */}
      <ReceiveFundsModal
        open={showReceiveFunds}
        onOpenChange={setShowReceiveFunds}
        userId={user?.id || ''}
        userName={profile?.full_name || ''}
      />

      {/* Knowledge Base Modal */}
      <KnowledgeBaseModal
        open={showKnowledgeBase}
        onOpenChange={setShowKnowledgeBase}
      />

      {/* Live Chat Modal */}
      <LiveChatModal
        open={showLiveChat}
        onOpenChange={setShowLiveChat}
        userId={user?.id || ''}
        isAgent={profile?.role === 'AGENT' || profile?.role === 'ADMIN'}
      />

      {/* FAQ Management Modal */}
      <FAQManagementModal
        open={showFAQManagement}
        onOpenChange={setShowFAQManagement}
      />

      {/* API Keys Modal */}
      <APIKeysModal
        open={showAPIKeys}
        onOpenChange={setShowAPIKeys}
      />

      {/* Wallet Management Modal */}
      <WalletManagementModal
        open={showWalletManagement}
        onOpenChange={setShowWalletManagement}
        userId={user?.id || ''}
      />

      {/* Wallet Security Modal */}
      <WalletSecurityModal
        open={showWalletSecurity}
        onOpenChange={setShowWalletSecurity}
        userId={user?.id || ''}
      />

      {/* Request Funds Modal */}
      <RequestFundsModal
        open={showRequestFunds}
        onOpenChange={setShowRequestFunds}
        userId={user?.id || ''}
        userProfile={profile}
        onRequestSent={loadProfile}
      />

      {/* Theme Selector Modal */}
      <ThemeSelector
        open={showThemeSelector}
        onOpenChange={setShowThemeSelector}
      />

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t shadow-lg z-50 pb-safe">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="grid grid-cols-5 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCardView(true)}
              className="flex flex-col items-center justify-center h-14 gap-1 p-1"
            >
              <Eye className="w-5 h-5" />
              <span className="text-[10px]">View</span>
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="flex flex-col items-center justify-center h-14 gap-1 p-1"
              onClick={() => {
                setQrInitialMode('scan');
                setShowQRScanner(true);
              }}
            >
              <Send className="w-5 h-5" />
              <span className="text-[10px]">Send</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex flex-col items-center justify-center h-14 gap-1 p-1"
              onClick={() => setShowReceiveFunds(true)}
            >
              <QrCode className="w-5 h-5" />
              <span className="text-[10px]">Receive</span>
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex flex-col items-center justify-center h-14 gap-1 p-1"
              onClick={() => setShowRequestFunds(true)}
            >
              <ArrowDownLeft className="w-5 h-5" />
              <span className="text-[10px]">Request</span>
            </Button>
            <Button 
              variant={cardLocked ? "destructive" : "outline"}
              size="sm" 
              className="flex flex-col items-center justify-center h-14 gap-1 p-1"
              onClick={() => {
                setCardLocked(!cardLocked);
                toast({
                  title: cardLocked ? "Card Unlocked" : "Card Locked",
                  description: `Your card has been ${cardLocked ? 'unlocked' : 'locked'} successfully`,
                });
              }}
            >
              <Shield className="w-5 h-5" />
              <span className="text-[10px]">{cardLocked ? 'Unlock' : 'Lock'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleBankingApp;