import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RiskFinding {
  id: string;
  severity: string;
  title: string;
  status: string;
}

export function RiskWidget() {
  const navigate = useNavigate();
  const [topRisks, setTopRisks] = useState<RiskFinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopRisks();
  }, []);

  const fetchTopRisks = async () => {
    try {
      const { data, error } = await supabase
        .from("risk_findings")
        .select("id, severity, title, status")
        .eq("status", "open")
        .in("severity", ["critical", "high"])
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      setTopRisks(data || []);
    } catch (error) {
      console.error("Error fetching top risks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-orange-500 text-white";
      default: return "bg-muted";
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Card className="border-orange-200 shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600">
          <AlertTriangle className="h-5 w-5" />
          Risk Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topRisks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No critical risks detected</p>
        ) : (
          <>
            <div className="space-y-3">
              {topRisks.map((risk) => (
                <div key={risk.id} className="flex items-start gap-3">
                  <Badge className={getSeverityColor(risk.severity)}>
                    {risk.severity}
                  </Badge>
                  <p className="text-sm flex-1">{risk.title}</p>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/dashboard/analytics")}
            >
              View All Risks
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
