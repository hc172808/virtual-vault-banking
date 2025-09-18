import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Users, 
  DollarSign, 
  LogOut, 
  Shield,
  TrendingUp,
  Eye,
  EyeOff,
  Copy
} from "lucide-react";
import bankingHero from "@/assets/banking-hero.jpg";

interface Profile {
  role: string;
  full_name: string;
  email: string;
  balance: number;
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

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('role, full_name, email, balance')
        .eq('user_id', userId)
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
              user_id: userId,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              role: 'CLIENT',
            });

          if (!insertError) {
            // Try loading again
            const { data: newProfile } = await (supabase as any)
              .from('profiles')
              .select('role, full_name, email, balance')
              .eq('user_id', userId)
              .single();
            
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

        {/* Virtual Card Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Virtual Card Preview
            </CardTitle>
            <CardDescription>
              Your digital payment card (Demo)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm mx-auto">
              <div className="w-full h-56 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground shadow-2xl border-0 overflow-hidden rounded-xl p-6 flex flex-col justify-between relative">
                <div className="flex justify-between items-start">
                  <Badge className="bg-success text-success-foreground text-xs">
                    ACTIVE
                  </Badge>
                  <CreditCard className="w-8 h-8 opacity-80" />
                </div>

                <div className="space-y-2">
                  <div className="text-lg font-mono tracking-wider">
                    •••• •••• •••• 1234
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs opacity-80">CARDHOLDER</p>
                      <p className="font-semibold text-sm uppercase">
                        {profile.full_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs opacity-80">EXPIRES</p>
                      <p className="font-mono text-sm">12/28</p>
                    </div>
                  </div>
                </div>

                <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                  <div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent rounded-full transform translate-x-8 -translate-y-8"></div>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard("4532 1234 5678 1234")}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Number
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Shield className="w-4 h-4 mr-2" />
                  Lock Card
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
                <Button variant="outline" className="justify-start">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Fund Management
                </Button>
                <Button variant="outline" className="justify-start">
                  <Shield className="w-4 h-4 mr-2" />
                  System Settings
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
    </div>
  );
}