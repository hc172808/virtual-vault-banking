import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Shield, Zap, Users, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MobileLanding: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary/90 to-primary/80 text-primary-foreground">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4 mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary-foreground/10 rounded-full flex items-center justify-center">
              <CreditCard className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">StableCoin Banking</h1>
          <p className="text-lg opacity-90">
            Your complete banking solution in your pocket
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          <Card className="bg-primary-foreground/10 border-primary-foreground/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground">Bank-Level Security</h3>
                <p className="text-sm opacity-80">
                  Your money is protected with advanced encryption
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary-foreground/10 border-primary-foreground/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground">Instant Transfers</h3>
                <p className="text-sm opacity-80">
                  Send and receive money in seconds with QR codes
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary-foreground/10 border-primary-foreground/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-foreground">Payment Requests</h3>
                <p className="text-sm opacity-80">
                  Request money from friends and family easily
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button 
            size="lg" 
            className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-14"
            onClick={() => navigate('/')}
          >
            Open Dashboard
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-center text-sm opacity-80">
            Optimized for mobile • Install as app for best experience
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileLanding;
