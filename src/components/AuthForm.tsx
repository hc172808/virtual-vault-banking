import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generateWalletKeyPair, encryptPrivateKey } from "@/lib/wallet";
import PasswordRecoveryModal from "./PasswordRecoveryModal";

const AuthForm = () => {
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Basic fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Contact fields
  const [mobileNumber, setMobileNumber] = useState("");
  const [alternateNumber, setAlternateNumber] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  
  // Personal details
  const [dateOfBirth, setDateOfBirth] = useState<Date>();
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");
  
  // Address fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [nationality, setNationality] = useState("");
  
  // Identification fields
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [tinNumber, setTinNumber] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const attemptAuth = async (attempt: number = 1): Promise<void> => {
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message === "Failed to fetch" && attempt < MAX_RETRIES) {
            toast.info(`Connection failed. Retrying... (${attempt}/${MAX_RETRIES})`);
            await delay(RETRY_DELAY);
            return attemptAuth(attempt + 1);
          }
          if (error.message === "Failed to fetch") {
            throw new Error("Network error. Please check your connection and try again.");
          }
          throw error;
        }
        if (!data.user) {
          throw new Error("Login failed. Please try again.");
        }
        toast.success("Signed in successfully!");
      } else {
        // Generate GYD wallet for new user
        toast.info("Generating your GYD wallet...");
        const wallet = await generateWalletKeyPair();
        const encryptedPrivateKey = await encryptPrivateKey(wallet.privateKey, password);
        
        // Sign up the user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              wallet_address: wallet.address,
            },
          },
        });
        
        if (authError) {
          if (authError.message === "Failed to fetch" && attempt < MAX_RETRIES) {
            toast.info(`Connection failed. Retrying... (${attempt}/${MAX_RETRIES})`);
            await delay(RETRY_DELAY);
            return attemptAuth(attempt + 1);
          }
          if (authError.message === "Failed to fetch") {
            throw new Error("Network error. Please check your connection and try again.");
          }
          throw authError;
        }
        
        // Update profile with additional information including public wallet info
        if (authData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              full_name: fullName,
              mobile_number: mobileNumber,
              alternate_number: alternateNumber,
              notify_email: notifyEmail,
              date_of_birth: dateOfBirth?.toISOString().split('T')[0],
              gender,
              occupation,
              address_line1: addressLine1,
              address_line2: addressLine2,
              country,
              region,
              city,
              nationality,
              id_type: idType,
              id_number: idNumber,
              tin_number: tinNumber,
              referral_code: referralCode,
              wallet_address: wallet.address,
              public_key: wallet.publicKey,
            })
            .eq("user_id", authData.user.id);
          
          if (profileError) {
            console.error("Profile update error:", profileError);
          }

          // Store sensitive wallet credentials in vault
          const { error: vaultError } = await supabase
            .from("wallet_vault")
            .insert({
              user_id: authData.user.id,
              encrypted_private_key: encryptedPrivateKey,
            });
          
          if (vaultError) {
            console.error("Wallet vault error:", vaultError);
          }
        }
        
        toast.success("Account created with GYD wallet!");
        toast.info(`Your wallet address: ${wallet.address.substring(0, 10)}...`);
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRetryCount(0);

    try {
      await attemptAuth(1);
    } catch (error: any) {
      const errorMessage = error.message || "Authentication failed";
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        toast.error("Network error. Please check your internet connection and try again.");
      } else if (errorMessage.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else if (errorMessage.includes("User already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-1 px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl">
          {isLogin ? "Sign In" : "Sign Up"}
        </CardTitle>
        <CardDescription className="text-sm">
          {isLogin
            ? "Enter your credentials to access your account"
            : "Create a new account to get started"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={handleAuth} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobileNumber">Mobile Number *</Label>
                  <Input
                    id="mobileNumber"
                    type="tel"
                    placeholder="+1234567890"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="alternateNumber">Alternate Number</Label>
                  <Input
                    id="alternateNumber"
                    type="tel"
                    placeholder="+1234567890"
                    value={alternateNumber}
                    onChange={(e) => setAlternateNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notifyEmail">Notification Email</Label>
                <Input
                  id="notifyEmail"
                  type="email"
                  placeholder="notify@email.com"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                />
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateOfBirth && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateOfBirth ? format(dateOfBirth, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateOfBirth}
                        onSelect={setDateOfBirth}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={gender} onValueChange={setGender} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation *</Label>
                <Input
                  id="occupation"
                  type="text"
                  placeholder="Software Engineer"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  required
                />
              </div>

              {/* Address Information */}
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                <Input
                  id="addressLine1"
                  type="text"
                  placeholder="123 Main Street"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  type="text"
                  placeholder="Apartment, suite, etc."
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    type="text"
                    placeholder="United States"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Region/State *</Label>
                  <Input
                    id="region"
                    type="text"
                    placeholder="California"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="Los Angeles"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality *</Label>
                  <Input
                    id="nationality"
                    type="text"
                    placeholder="American"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Identification Details */}
              <div className="space-y-2">
                <Label htmlFor="idType">ID Type *</Label>
                <Select value={idType} onValueChange={setIdType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="id_card">ID Card</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="idNumber">ID Number *</Label>
                  <Input
                    id="idNumber"
                    type="text"
                    placeholder="ID123456789"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tinNumber">TIN Number</Label>
                  <Input
                    id="tinNumber"
                    type="text"
                    placeholder="123-45-6789"
                    value={tinNumber}
                    onChange={(e) => setTinNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral Code</Label>
                <Input
                  id="referralCode"
                  type="text"
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                />
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </Button>
          
          {isLogin && (
            <Button
              type="button"
              variant="link"
              className="w-full text-sm"
              onClick={() => setShowPasswordRecovery(true)}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Forgot Password?
            </Button>
          )}
          
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </Button>
        </form>
        
        <PasswordRecoveryModal
          open={showPasswordRecovery}
          onOpenChange={setShowPasswordRecovery}
        />
      </CardContent>
    </Card>
  );
};

export default AuthForm;
