import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MetricData {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
}

const DashboardHome = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricData>({
    totalRevenue: 0,
    totalCost: 0,
    netProfit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: entries, error } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      let revenue = 0;
      let cost = 0;

      entries?.forEach((entry: any) => {
        const amount = parseFloat(entry.total_amount || 0);
        
        // Revenue from sales
        if (entry.transaction_type === "cash_sale" || entry.transaction_type === "credit_sale") {
          revenue += amount;
        }
        
        // Costs from purchases and expenses
        if (
          entry.transaction_type === "cash_purchase" || 
          entry.transaction_type === "credit_purchase" ||
          entry.transaction_type === "expense" ||
          entry.transaction_type === "payroll"
        ) {
          cost += amount;
        }
      });

      setMetrics({
        totalRevenue: revenue,
        totalCost: cost,
        netProfit: revenue - cost,
      });
    } catch (error: any) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your financial performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-soft hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From sales transactions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <div className="p-2 bg-destructive/10 rounded-lg">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(metrics.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From expenses and purchases
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <div className="p-2 bg-accent/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                metrics.netProfit >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {formatCurrency(metrics.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue minus total costs
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Financial Statements
            </CardTitle>
          </CardHeader>
          <CardDescription className="px-6 text-muted-foreground">
            Generate comprehensive financial reports
          </CardDescription>
          <CardContent className="pt-6">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  Generate Financial Statements
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Financial Statement</DialogTitle>
                  <DialogDescription>
                    Choose which financial statement you'd like to view
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate("/dashboard/profit-loss");
                      setDialogOpen(false);
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Profit and Loss Statement
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate("/dashboard/balance-sheet");
                      setDialogOpen(false);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Balance Sheet Statement
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
