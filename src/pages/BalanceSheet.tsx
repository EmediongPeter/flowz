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

const BalanceSheet = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<AccountData[]>([]);
  const [liabilities, setLiabilities] = useState<AccountData[]>([]);
  const [equity, setEquity] = useState<AccountData[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);
  const [totalEquity, setTotalEquity] = useState(0);

  useEffect(() => {
    fetchBalanceSheetData();
  }, []);

  const fetchBalanceSheetData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: entries, error } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      const assetAccounts: AccountData[] = [];
      const liabilityAccounts: AccountData[] = [];
      const equityAccounts: AccountData[] = [];
      let assetsTotal = 0;
      let liabilitiesTotal = 0;
      let equityTotal = 0;

      // Group by ledger categories
      const accountMap = new Map<string, number>();

      entries?.forEach((entry) => {
        const amount = parseFloat(entry.total_amount.toString());
        const accountKey = entry.debit_account || entry.description;
        
        if (accountKey) {
          accountMap.set(accountKey, (accountMap.get(accountKey) || 0) + amount);
        }
      });

      // Categorize accounts
      accountMap.forEach((amount, accountName) => {
        const accountLower = accountName.toLowerCase();
        
        if (accountLower.includes("cash") || 
            accountLower.includes("bank") ||
            accountLower.includes("inventory") ||
            accountLower.includes("receivable") ||
            accountLower.includes("asset")) {
          assetAccounts.push({ accountName, amount });
          assetsTotal += amount;
        } else if (accountLower.includes("payable") ||
                   accountLower.includes("liability") ||
                   accountLower.includes("loan")) {
          liabilityAccounts.push({ accountName, amount });
          liabilitiesTotal += amount;
        } else if (accountLower.includes("capital") ||
                   accountLower.includes("equity") ||
                   accountLower.includes("owner")) {
          equityAccounts.push({ accountName, amount });
          equityTotal += amount;
        }
      });

      setAssets(assetAccounts);
      setLiabilities(liabilityAccounts);
      setEquity(equityAccounts);
      setTotalAssets(assetsTotal);
      setTotalLiabilities(liabilitiesTotal);
      setTotalEquity(equityTotal);
    } catch (error) {
      console.error("Error fetching balance sheet data:", error);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Balance Sheet Statement</h1>
          <p className="text-muted-foreground">Financial position overview</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">Balance Sheet</CardTitle>
          <p className="text-center text-sm text-muted-foreground">As of Current Date</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* Assets Side */}
            <div className="border-r-2 border-border pr-6">
              <h3 className="text-lg font-semibold mb-4 text-center bg-muted py-2 rounded">
                Assets
              </h3>
              <div className="space-y-2">
                {assets.map((account, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-sm">{account.accountName}</span>
                    <span className="text-sm font-medium">{formatCurrency(account.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 border-t-2 border-primary mt-4 font-bold text-lg">
                <span>Total Assets</span>
                <span>{formatCurrency(totalAssets)}</span>
              </div>
            </div>

            {/* Liabilities & Equity Side */}
            <div className="pl-6">
              <h3 className="text-lg font-semibold mb-4 text-center bg-muted py-2 rounded">
                Liabilities & Equity
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Liabilities</h4>
                  <div className="space-y-2">
                    {liabilities.map((account, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-sm">{account.accountName}</span>
                        <span className="text-sm font-medium">{formatCurrency(account.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 font-semibold text-sm">
                      <span>Total Liabilities</span>
                      <span>{formatCurrency(totalLiabilities)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Equity</h4>
                  <div className="space-y-2">
                    {equity.map((account, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-sm">{account.accountName}</span>
                        <span className="text-sm font-medium">{formatCurrency(account.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 font-semibold text-sm">
                      <span>Total Equity</span>
                      <span>{formatCurrency(totalEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-primary mt-4 font-bold text-lg">
                <span>Total Liabilities & Equity</span>
                <span>{formatCurrency(totalLiabilities + totalEquity)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BalanceSheet;
