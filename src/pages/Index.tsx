import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import SimpleBankingApp from "@/components/SimpleBankingApp";

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
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Please sign in</h1>
          <button 
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return <SimpleBankingApp user={user} />;
};

export default Index;
