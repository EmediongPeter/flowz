import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Verifying your email...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. Retrieve Supabase session (Google login sets it here)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
          setStatus("No active session. Redirecting...");
          setTimeout(() => navigate("/auth"), 1500);
          return;
        }

        setStatus("Checking your profile...");

        // 2. Check if user has an existing profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .maybeSingle();

        // CASE A — New user: no profile exists yet
        if (!profile) {
          setStatus("Redirecting for onboarding...");
          navigate("/onboarding");
          return;
        }

        // CASE B — Existing user with onboarding completed
        if (profile.onboarding_completed) {
          setStatus("Redirecting to dashboard...");
          navigate("/dashboard");
          return;
        }

        // CASE C — Profile exists but onboarding incomplete
        navigate("/onboarding");
        
      } catch (error: any) {
        console.log("Auth callback error:", error);
        setStatus("Error verifying session. Redirecting...");
        toast.error(error.message);
        setTimeout(() => navigate("/auth"), 1500);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-md shadow-medium">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">Verifying Email</CardTitle>
          <CardDescription>Please wait...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
          </div>
          <p className="text-center text-muted-foreground">{status}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;
