import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, TrendingUp, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RiskFinding {
  id: string;
  finding_type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  recommendations: string | null;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
}

const Analytics = () => {
  const [findings, setFindings] = useState<RiskFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState({
    open: 0,
    resolved: 0,
    critical: 0,
  });

  useEffect(() => {
    fetchFindings();
  }, []);

  const fetchFindings = async () => {
    try {
      const { data, error } = await supabase
        .from("risk_findings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFindings((data || []) as RiskFinding[]);
      
      // Calculate stats
      const open = data?.filter(f => f.status === "open").length || 0;
      const resolved = data?.filter(f => f.status === "resolved").length || 0;
      const critical = data?.filter(f => f.severity === "critical" && f.status === "open").length || 0;
      
      setStats({ open, resolved, critical });
    } catch (error) {
      console.error("Error fetching findings:", error);
      toast.error("Failed to load risk findings");
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const { error } = await supabase.functions.invoke("analyze-risks", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success("Risk analysis completed successfully");
      await fetchFindings();
    } catch (error: any) {
      console.error("Error running analysis:", error);
      toast.error(error.message || "Failed to run risk analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  const updateFindingStatus = async (id: string, status: "resolved" | "dismissed") => {
    try {
      const { error } = await supabase
        .from("risk_findings")
        .update({ 
          status,
          resolved_at: status === "resolved" ? new Date().toISOString() : null
        })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Finding marked as ${status}`);
      await fetchFindings();
    } catch (error) {
      console.error("Error updating finding:", error);
      toast.error("Failed to update finding");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-yellow-500 text-white";
      case "low": return "bg-blue-500 text-white";
      default: return "bg-muted";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle className="h-4 w-4" />;
      case "medium":
        return <Shield className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Risk Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered analysis of your financial data
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={analyzing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${analyzing ? "animate-spin" : ""}`} />
          {analyzing ? "Analyzing..." : "Run Analysis"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Findings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
            <p className="text-xs text-muted-foreground mt-1">
              High priority items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully addressed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Findings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Findings</CardTitle>
          <CardDescription>
            Detected risks, threats, and anomalies in your financial data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No risk findings yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click "Run Analysis" to scan your financial data for risks
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findings.map((finding) => (
                    <TableRow key={finding.id}>
                      <TableCell>
                        <Badge className={getSeverityColor(finding.severity)}>
                          <span className="flex items-center gap-1">
                            {getSeverityIcon(finding.severity)}
                            {finding.severity}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{finding.title}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm line-clamp-2">{finding.description}</p>
                        {finding.recommendations && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            💡 {finding.recommendations}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={finding.status === "open" ? "default" : "secondary"}>
                          {finding.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {finding.status === "open" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateFindingStatus(finding.id, "resolved")}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateFindingStatus(finding.id, "dismissed")}
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
