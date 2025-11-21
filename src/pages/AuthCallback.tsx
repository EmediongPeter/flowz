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
        // Get the session from the URL
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log("🚀 ~ handleCallback ~ sessionError:", sessionError)
        console.log("🚀 ~ handleCallback ~ session:", session)

        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          setStatus("Email verified! Redirecting...");
          toast.success("Email verified successfully!");

          // Check if user has completed onboarding
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", session.user.id)
            .single();
          console.log("🚀 ~ handleCallback ~ profileError:", profileError)

          if (!profileError && Boolean(profile)) {
            // User already completed onboarding, go to dashboard
            navigate("/dashboard");
          } else {
            // First time user, go to onboarding
            navigate("/onboarding");
          }
        } else {
          setStatus("No active session. Redirecting to login...");
          setTimeout(() => navigate("/auth"), 2000);
        }
      } catch (error: any) {
        setStatus("Error verifying email. Redirecting...");
        toast.error(error.message);
        setTimeout(() => navigate("/auth"), 2000);
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
