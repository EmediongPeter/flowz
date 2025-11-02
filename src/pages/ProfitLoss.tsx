import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AccountData {
  accountName: string;
  debit: number;
  credit: number;
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
      const { data: lines, error } = await supabase
        .from("journal_entry_lines")
        .select("account_name, account_type, entry_type, amount");

      if (error) throw error;

      const accountMap = new Map<string, AccountData>();

      lines?.forEach((line) => {
        const existing = accountMap.get(line.account_name) || {
          accountName: line.account_name,
          debit: 0,
          credit: 0,
        };

        if (line.entry_type === "debit") {
          existing.debit += Number(line.amount);
        } else {
          existing.credit += Number(line.amount);
        }

        accountMap.set(line.account_name, existing);
      });

      const revenue: AccountData[] = [];
      const expenses: AccountData[] = [];
      let revTotal = 0;
      let expTotal = 0;

      accountMap.forEach((account) => {
        const netAmount = account.credit - account.debit;
        
        if (account.accountName.toLowerCase().includes("revenue") || 
            account.accountName.toLowerCase().includes("sales") ||
            account.accountName.toLowerCase().includes("income")) {
          revenue.push({ ...account });
          revTotal += netAmount;
        } else if (account.accountName.toLowerCase().includes("expense") ||
                   account.accountName.toLowerCase().includes("cost") ||
                   account.accountName.toLowerCase().includes("purchase")) {
          expenses.push({ ...account });
          expTotal += Math.abs(netAmount);
        }
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
            {/* Expenses (Debit) Side */}
            <div className="border-r-2 border-border pr-6">
              <h3 className="text-lg font-semibold mb-4 text-center bg-muted py-2 rounded">
                Expenses (Debit)
              </h3>
              <div className="space-y-2">
                {expenseAccounts.map((account, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-sm">{account.accountName}</span>
                    <span className="text-sm font-medium">{formatCurrency(account.debit)}</span>
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

            {/* Revenue (Credit) Side */}
            <div className="pl-6">
              <h3 className="text-lg font-semibold mb-4 text-center bg-muted py-2 rounded">
                Revenue (Credit)
              </h3>
              <div className="space-y-2">
                {revenueAccounts.map((account, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-sm">{account.accountName}</span>
                    <span className="text-sm font-medium">{formatCurrency(account.credit)}</span>
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
