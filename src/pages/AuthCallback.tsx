4          setStatus("Redirecting for onboarding...");
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
