import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ManageUsersModal } from "@/components/admin/ManageUsersModal";
import { FundManagementModal } from "@/components/admin/FundManagementModal";
import SystemSettingsModal from "@/components/admin/SystemSettingsModal";
import CardPrintingModal from "@/components/admin/CardPrintingModal";
import CardViewModal from "@/components/CardViewModal";
import PinSettingsModal from "@/components/PinSettingsModal";
import TransactionModal from "@/components/TransactionModal";
import { 
  CreditCard, 
  Users, 
  DollarSign, 
  LogOut, 
  Shield,
  TrendingUp,
  Eye,
  EyeOff,
  Copy,
  Settings,
  User as UserIcon,
  Send,
  Lock
} from "lucide-react";
import bankingHero from "@/assets/banking-hero.jpg";

interface Profile {
  role: string;
  full_name: string;
  email: string;
  balance: number;
  pin_enabled?: boolean;
  pin_hash?: string;
}

export default function SimpleBankingApp() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showBalance, setShowBalance] = useState(false);
  const [cardLocked, setCardLocked] = useState(false);
  
  // Admin modal states
  const [showManageUsers, setShowManageUsers] = useState(false);
  const [showFundManagement, setShowFundManagement] = useState(false);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [showCardPrinting, setShowCardPrinting] = useState(false);
  const [showCardView, setShowCardView] = useState(false);
  const [showPinSettings, setShowPinSettings] = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('role, full_name, email, balance, pin_enabled, pin_hash')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
      } else {
        // Profile doesn't exist yet, create it
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: insertError } = await (supabase as any)
            .from('profiles')
            .insert({
              user_id: targetUserId,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              role: 'CLIENT',
            });

          if (!insertError) {
            // Try loading again
            const { data: newProfile } = await (supabase as any)
              .from('profiles')
              .select('role, full_name, email, balance, pin_enabled, pin_hash')
              .eq('user_id', targetUserId)
              .maybeSingle();
            
            if (newProfile) {
              setProfile(newProfile);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleAuth = async () => {
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: "Welcome back!",
          description: "Successfully logged in to VirtualBank.",
        });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;

        if (data.user) {
          // Create profile - now using proper Supabase client
          const { error: profileError } = await (supabase as any)
            .from('profiles')
            .insert({
              user_id: data.user.id,
              email,
              full_name: fullName,
              role: 'CLIENT',
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't throw here - user is created, profile can be created later
          }

          toast({
            title: "Account created!",
            description: "Welcome to VirtualBank. Your account has been created successfully.",
          });
        }
      }
      await checkUser();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: isLogin ? "Login failed" : "Registration failed",
        description: error.message,
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Information copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-secondary/20 to-banking-blue-light/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading VirtualBank...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-banking-blue-light/10">
        {/* Hero Section */}
        <div className="relative">
          <img 
            src={bankingHero} 
            alt="VirtualBank Hero" 
            className="w-full h-64 object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-accent/80"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 backdrop-blur">
                <CreditCard className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold mb-2">VirtualBank</h1>
              <p className="text-xl">Secure. Simple. Digital.</p>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md shadow-xl border-0 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                {isLogin ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription className="text-center">
                {isLogin 
                  ? "Enter your credentials to access your account"
                  : "Join VirtualBank and manage your finances digitally"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <Button onClick={handleAuth} className="w-full">
                {isLogin ? "Sign In" : "Create Account"}
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => setIsLogin(!isLogin)}
                className="w-full"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="py-12 px-4 bg-card/50">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Bank-Level Security</h3>
              <p className="text-muted-foreground">Advanced encryption and multi-factor authentication</p>
            </div>
            <div className="text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-accent" />
              <h3 className="text-lg font-semibold mb-2">Virtual Cards</h3>
              <p className="text-muted-foreground">Instant virtual card generation for secure payments</p>
            </div>
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-success" />
              <h3 className="text-lg font-semibold mb-2">24/7 Support</h3>
              <p className="text-muted-foreground">Round-the-clock customer support</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-banking-blue-light/5">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VB</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">VirtualBank</h1>
              <p className="text-xs text-muted-foreground">{profile.role} Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-2">
            Welcome back, {profile.full_name}
          </h2>
          <p className="text-muted-foreground">
            Manage your virtual banking experience
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold text-success">
                  {showBalance ? `$${profile.balance?.toFixed(2) || '0.00'}` : '••••••'}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBalance(!showBalance)}
                >
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                +2.1% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Status</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <Badge className="mt-2 bg-success text-success-foreground">
                Verified
              </Badge>
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
                  className="w-full h-56 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-2xl border-0 overflow-hidden rounded-xl p-6 flex flex-col justify-between relative cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setShowCardView(true)}
                >
                  <div className="flex justify-between items-start">
                    <Badge className="bg-white/20 text-white text-xs">
                      {cardLocked ? 'LOCKED' : 'ACTIVE'}
                    </Badge>
                    <div className="text-lg font-bold">StableCoin</div>
                  </div>

                  <div className="absolute top-4 left-4">
                    <div className="w-12 h-8 bg-yellow-400 rounded"></div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-lg font-mono tracking-wider">
                      •••• •••• •••• 9012
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs opacity-70">CARDHOLDER</p>
                        <p className="font-semibold text-sm uppercase">
                          {profile.full_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs opacity-70">EXPIRES</p>
                        <p className="font-mono text-sm">12/28</p>
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
                <Button 
                  onClick={() => setShowTransaction(true)}
                  className="justify-start h-12"
                >
                  <Send className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Send Money</div>
                    <div className="text-xs opacity-80">Transfer to anyone instantly</div>
                  </div>
                </Button>
                
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
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "Transaction history feature will be available soon",
                    });
                  }}
                  className="justify-start h-12"
                >
                  <UserIcon className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Account Settings</div>
                    <div className="text-xs text-muted-foreground">Manage your profile</div>
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
    </div>
  );
}