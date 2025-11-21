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
  const [revenue, setRevenue] = useState<AccountData[]>([]);
  const [expenses, setExpenses] = useState<AccountData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    fetchProfitLossData();
  }, []);

  const fetchProfitLossData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch from trial balance view
      const { data: accounts, error } = await supabase
        .from("view_trial_balance" as any)
        .select("*")
        .in("account_type", ["income", "expense"])
        .eq("user_id", user.id);

      if (error) throw error;

      const revenueAccounts: AccountData[] = [];
      const expenseAccounts: AccountData[] = [];

      let revenueTotal = 0;
      let expenseTotal = 0;

      accounts?.forEach((account: any) => {
        // net_balance is (debit - credit)
        // For Income (Credit nature), positive balance means Debit > Credit (Loss/Decrease), negative means Credit > Debit (Gain)
        // Usually we want positive numbers for display.
        // Income: Credit is increase. So if Credit > Debit, net_balance is negative.
        // We want to show positive revenue. So we take -net_balance.

        // Expense: Debit is increase. So if Debit > Credit, net_balance is positive.
        // We want to show positive expense. So we take net_balance.

        const balance = parseFloat(account.net_balance || 0);

        if (account.account_type === 'income') {
          // Income is normally Credit balance (negative in our view logic of debit-credit)
          // But wait, let's check the view definition: (SUM(jel.debit) - SUM(jel.credit)) as net_balance
          // Yes.
          const amount = -balance;
          if (amount !== 0) {
            revenueAccounts.push({ accountName: account.account_name, amount });
            revenueTotal += amount;
          }
        } else {
          // Expense is normally Debit balance (positive)
          const amount = balance;
          if (amount !== 0) {
            expenseAccounts.push({ accountName: account.account_name, amount });
            expenseTotal += amount;
          }
        }
      });

      setRevenue(revenueAccounts);
      setExpenses(expenseAccounts);
      setTotalRevenue(revenueTotal);
      setTotalExpenses(expenseTotal);
    } catch (error) {
      console.error("Error fetching profit loss data:", error);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Profit & Loss Statement</h1>
          <p className="text-muted-foreground">Income and expense overview</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">Profit & Loss</CardTitle>
          <p className="text-center text-sm text-muted-foreground">Period Ending Current Date</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-8 max-w-3xl mx-auto">
            {/* Revenue Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 bg-muted py-2 px-4 rounded">
                Revenue
              </h3>
              <div className="space-y-2 px-4">
                {revenue.map((account, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-sm">{account.accountName}</span>
                    <span className="text-sm font-medium">{formatCurrency(account.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t-2 border-primary mt-4 font-bold text-lg">
                  <span>Total Revenue</span>
                  <span>{formatCurrency(totalRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 bg-muted py-2 px-4 rounded">
                Expenses
              </h3>
              <div className="space-y-2 px-4">
                {expenses.map((account, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-sm">{account.accountName}</span>
                    <span className="text-sm font-medium">{formatCurrency(account.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t-2 border-primary mt-4 font-bold text-lg">
                  <span>Total Expenses</span>
                  <span>{formatCurrency(totalExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Net Profit Section */}
            <div className="mt-8 pt-4 border-t-4 border-primary">
              <div className="flex justify-between items-center px-4">
                <span className="text-xl font-bold">Net Profit</span>
                <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitLoss;
