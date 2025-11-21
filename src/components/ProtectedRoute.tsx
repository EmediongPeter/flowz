import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const validateUser = async () => {
      // 1. Check local session first
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      // 2. Validate the user with Supabase Auth Server
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        // ❗ IMPORTANT: invalid session or user deleted in the dashboard
        await supabase.auth.signOut();
        if (mounted) {
          setAuthenticated(false);
          setLoading(false);
          navigate("/auth", { replace: true });
        }
        return;
      }

      // 3. Optional: Validate profile existence
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      // If profile missing but user exists -> treat as logged out OR redirect to onboarding
      if (profileError || !profile) {
        await supabase.auth.signOut();
        if (mounted) {
          setAuthenticated(false);
          setLoading(false);
          navigate("/auth", { replace: true });
        }
        return;
      }

      // If everything is fine:
      if (mounted) {
        setAuthenticated(true);
        setLoading(false);
      }
    };

    validateUser();

    // 4. Listen to session changes (logout, expiry, refresh failure)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session) {
          // session died → redirect
          await supabase.auth.signOut();
          if (mounted) navigate("/auth", { replace: true });
        }
      }
    );

    // Cleanup
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex h-screen justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return authenticated ? children : <Navigate to="/auth" replace />;
};

export default ProtectedRoute;
