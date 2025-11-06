import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AccountData {
  accountName: string;
  amount: number;
}

const ProfitLoss = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [revenueAccounts, setRevenueAccounts] = useState<AccountData[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<AccountData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    fetchProfitLossData();
  }, []);

  const fetchProfitLossData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: entries, error } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const revenue: AccountData[] = [];
      const expenses: AccountData[] = [];
      let revTotal = 0;
      let expTotal = 0;

      const revenueMap = new Map<string, number>();
      const expenseMap = new Map<string, number>();

      entries?.forEach((entry: any) => {
        const amount = parseFloat(entry.total_amount || 0);
        const accountName = entry.credit_account || entry.description;
        
        if (entry.transaction_type === "cash_sale" || entry.transaction_type === "credit_sale") {
          revenueMap.set(accountName, (revenueMap.get(accountName) || 0) + amount);
          revTotal += amount;
        } else if (
          entry.transaction_type === "cash_purchase" ||
          entry.transaction_type === "credit_purchase" ||
          entry.transaction_type === "expense" ||
          entry.transaction_type === "payroll"
        ) {
          expenseMap.set(accountName, (expenseMap.get(accountName) || 0) + amount);
          expTotal += amount;
        }
      });

      revenueMap.forEach((amount, accountName) => {
        revenue.push({ accountName, amount });
      });

      expenseMap.forEach((amount, accountName) => {
        expenses.push({ accountName, amount });
      });

      setRevenueAccounts(revenue);
      setExpenseAccounts(expenses);
      setTotalRevenue(revTotal);
      setTotalExpenses(expTotal);
    } catch (error) {
      console.error("Error fetching P&L data:", error);
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

  const netProfit = totalRevenue - totalExpenses;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Profit and Loss Statement</h1>
          <p className="text-muted-foreground">Income and expenses overview</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">Profit and Loss Statement</CardTitle>
          <p className="text-center text-sm text-muted-foreground">For the Period</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* Expenses Side */}
            <div className="border-r-2 border-border pr-6">
              <h3 className="text-lg font-semibold mb-4 text-center bg-muted py-2 rounded">
                Expenses
              </h3>
              <div className="space-y-2">
                {expenseAccounts.map((account, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-sm">{account.accountName}</span>
                    <span className="text-sm font-medium">{formatCurrency(account.amount)}</span>
                  </div>
                ))}
                {netProfit > 0 && (
                  <div className="flex justify-between py-2 border-t-2 border-border mt-4 font-bold text-success">
                    <span>Net Profit</span>
                    <span>{formatCurrency(netProfit)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between py-2 border-t-2 border-primary mt-4 font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(totalExpenses + (netProfit > 0 ? netProfit : 0))}</span>
              </div>
            </div>

            {/* Revenue Side */}
            <div className="pl-6">
              <h3 className="text-lg font-semibold mb-4 text-center bg-muted py-2 rounded">
                Revenue
              </h3>
              <div className="space-y-2">
                {revenueAccounts.map((account, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-sm">{account.accountName}</span>
                    <span className="text-sm font-medium">{formatCurrency(account.amount)}</span>
                  </div>
                ))}
                {netProfit < 0 && (
                  <div className="flex justify-between py-2 border-t-2 border-border mt-4 font-bold text-destructive">
                    <span>Net Loss</span>
                    <span>{formatCurrency(Math.abs(netProfit))}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between py-2 border-t-2 border-primary mt-4 font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(totalRevenue + (netProfit < 0 ? Math.abs(netProfit) : 0))}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitLoss;
