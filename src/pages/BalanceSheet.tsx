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

      const assetAccounts: AccountData[] = [];
      const liabilityAccounts: AccountData[] = [];
      const equityAccounts: AccountData[] = [];
      let assetsTotal = 0;
      let liabilitiesTotal = 0;
      let equityTotal = 0;

      accountMap.forEach((account) => {
        const netAmount = account.debit - account.credit;
        const accountLower = account.accountName.toLowerCase();
        
        if (accountLower.includes("cash") || 
            accountLower.includes("bank") ||
            accountLower.includes("inventory") ||
            accountLower.includes("receivable") ||
            accountLower.includes("asset")) {
          assetAccounts.push({ ...account });
          assetsTotal += Math.abs(netAmount);
        } else if (accountLower.includes("payable") ||
                   accountLower.includes("liability") ||
                   accountLower.includes("loan")) {
          liabilityAccounts.push({ ...account });
          liabilitiesTotal += Math.abs(netAmount);
        } else if (accountLower.includes("capital") ||
                   accountLower.includes("equity") ||
                   accountLower.includes("owner")) {
          equityAccounts.push({ ...account });
          equityTotal += Math.abs(netAmount);
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
            {/* Assets (Debit) Side */}
            <div className="border-r-2 border-border pr-6">
              <h3 className="text-lg font-semibold mb-4 text-center bg-muted py-2 rounded">
                Assets (Debit)
              </h3>
              <div className="space-y-2">
                {assets.map((account, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-sm">{account.accountName}</span>
                    <span className="text-sm font-medium">{formatCurrency(account.debit)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 border-t-2 border-primary mt-4 font-bold text-lg">
                <span>Total Assets</span>
                <span>{formatCurrency(totalAssets)}</span>
              </div>
            </div>

            {/* Liabilities & Equity (Credit) Side */}
            <div className="pl-6">
              <h3 className="text-lg font-semibold mb-4 text-center bg-muted py-2 rounded">
                Liabilities & Equity (Credit)
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Liabilities</h4>
                  <div className="space-y-2">
                    {liabilities.map((account, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-sm">{account.accountName}</span>
                        <span className="text-sm font-medium">{formatCurrency(account.credit)}</span>
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
                        <span className="text-sm font-medium">{formatCurrency(account.credit)}</span>
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
