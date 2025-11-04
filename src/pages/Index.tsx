import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import SimpleBankingApp from "@/components/SimpleBankingApp";
import AuthForm from "@/components/AuthForm";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <AuthForm />
      </div>
    );
  }

  return <SimpleBankingApp user={user} />;
};

export default Index;
