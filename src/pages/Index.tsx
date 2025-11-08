import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SimpleBankingApp from "@/components/SimpleBankingApp";
import AuthForm from "@/components/AuthForm";
import { useMobileDetect } from "@/hooks/useMobileDetect";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useMobileDetect();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Auto-redirect mobile users to mobile landing once
    if (isMobile && !loading && !hasRedirected && !user) {
      const hasVisited = sessionStorage.getItem('mobile-landing-visited');
      if (!hasVisited) {
        sessionStorage.setItem('mobile-landing-visited', 'true');
        setHasRedirected(true);
        navigate('/mobile');
      }
    }
  }, [isMobile, loading, hasRedirected, user, navigate]);

  if (loading) {
    return <div className="min-h-screen w-full overflow-x-hidden bg-background flex items-center justify-center p-4">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-background flex items-center justify-center p-4">
        <AuthForm />
      </div>
    );
  }

  return <SimpleBankingApp user={user} />;
};

export default Index;
