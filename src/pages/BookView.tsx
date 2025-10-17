import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BookEntry {
  id: string;
  entry_date: string;
  description: string;
  account_name: string;
  entry_type: string;
  amount: number;
  reference_number: string | null;
}

const bookTitles: Record<string, string> = {
  ledger: "Ledger Books",
  cash: "Cash Book",
  bank: "Bank Book",
  sales: "Sales Book",
  purchase: "Purchase Book",
  payable: "Accounts Payable",
  receivable: "Accounts Receivable",
  inventory: "Inventory Book",
  payroll: "Payroll",
};

const accountTypeMap: Record<string, string> = {
  ledger: "other",
  cash: "cash",
  bank: "bank",
  sales: "sales",
  purchase: "purchase",
  payable: "accounts_payable",
  receivable: "accounts_receivable",
  inventory: "inventory",
  payroll: "payroll",
};

const BookView = () => {
  const { bookType } = useParams<{ bookType: string }>();
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, [bookType]);

  const fetchEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const accountType = bookType ? accountTypeMap[bookType] : "other";

      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          journal_entries!inner(
            user_id,
            entry_date,
            description,
            reference_number
          )
        `)
        .eq("journal_entries.user_id", user.id)
        .eq("account_type", accountType as any)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedEntries = data.map((item: any) => ({
        id: item.id,
        entry_date: item.journal_entries.entry_date,
        description: item.journal_entries.description,
        account_name: item.account_name,
        entry_type: item.entry_type,
        amount: parseFloat(item.amount),
        reference_number: item.journal_entries.reference_number,
      }));

      setEntries(formattedEntries);
    } catch (error: any) {
      console.error("Error fetching entries:", error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const title = bookType ? bookTitles[bookType] : "Book View";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">
          Entries automatically distributed from journal entries
        </p>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No entries found for this book</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create journal entries to see transactions here
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {formatDate(entry.entry_date)}
                      </TableCell>
                      <TableCell>
                        {entry.reference_number || "-"}
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{entry.account_name}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            entry.entry_type === "debit"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-success/10 text-success"
                          }`}
                        >
                          {entry.entry_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(entry.amount)}
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

export default BookView;
