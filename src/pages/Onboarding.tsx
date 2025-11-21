import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BookOpen, ArrowRight, Loader2 } from "lucide-react";

const Onboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log("🚀 ~ checkUser ~ user:", user)
        if (!user) {
          navigate("/auth");
          return;
        }
        setUserId(user.id);
        setInitializing(false);
      } catch (error) {
        navigate("/auth");
      }
    };

    checkUser();
  }, [navigate]);

  const handleContinue = async () => {
    if (step === 1) {
      if (!businessName.trim()) {
        toast.error("Please enter your business name");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!businessType) {
        toast.error("Please select a business type");
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Save onboarding data to profiles table
      const { error, data } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: user.user_metadata?.full_name,
          business_name: businessName,
          business_type: businessType,
          currency: currency,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "id"
        });
      console.log("🚀 ~ completeOnboarding ~ data:", data)

      if (error) throw error;

      toast.success("Onboarding completed!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
        <Card className="w-full max-w-2xl shadow-medium">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-accent mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-2xl shadow-medium">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="bg-accent p-3 rounded-xl">
              <BookOpen className="h-8 w-8 text-accent-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to Flowz</CardTitle>
          <CardDescription>
            Let's set up your bookkeeping account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Business Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">What's your business name?</h3>
                <p className="text-sm text-muted-foreground">
                  We'll use this to personalize your experience
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-name">Business Name</Label>
                <Input
                  id="business-name"
                  type="text"
                  placeholder="e.g., Acme Corporation"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleSkip}>
                  Skip for now
                </Button>
                <Button onClick={handleContinue}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Business Type */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">What type of business?</h3>
                <p className="text-sm text-muted-foreground">
                  This helps us customize features for your needs
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "freelance", label: "Freelancer" },
                  { value: "small_business", label: "Small Business" },
                  { value: "startup", label: "Startup" },
                  { value: "enterprise", label: "Enterprise" },
                  { value: "nonprofit", label: "Non-profit" },
                  { value: "other", label: "Other" },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setBusinessType(type.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      businessType === type.value
                        ? "border-accent bg-accent/10"
                        : "border-input hover:border-accent/50"
                    }`}
                  >
                    <span className="font-medium text-sm">{type.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={handleContinue}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Currency & Confirmation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">What's your currency?</h3>
                <p className="text-sm text-muted-foreground">
                  You can change this later in settings
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-input bg-background"
                >
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                </select>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium text-sm">Review your details:</p>
                <ul className="text-sm space-y-1">
                  <li><span className="text-muted-foreground">Business:</span> {businessName}</li>
                  <li className="capitalize"><span className="text-muted-foreground capitalize">Type:</span> {businessType}</li>
                  <li><span className="text-muted-foreground">Currency:</span> {currency}</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleContinue} disabled={loading}>
                  {loading ? "Setting up..." : "Get Started"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;