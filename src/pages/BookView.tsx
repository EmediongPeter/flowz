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

interface JournalEntry {
  id: string;
  transaction_date: string;
  description: string;
  party_name: string | null;
  transaction_type: string;
  reference_number: string | null;
  journal_entry_lines: {
    debit: number;
  }[];
}

const bookTitles: Record<string, string> = {
  "book-view": "All Entries",
  "sales-book": "Sales Book",
  "purchase-book": "Purchase Book",
  "cash-book": "Cash Book",
  "bank-book": "Bank Book",
  "payroll-book": "Payroll Book",
  "petty-cash-book": "Petty Cash Book",
  "general-journal": "General Journal",
  "sales-return-book": "Sales Return Book",
  "purchase-return-book": "Purchase Return Book",
  "bills-receivable-book": "Bills Receivable Book",
  "bills-payable-book": "Bills Payable Book",
  "accounts-payable": "Accounts Payable",
  "accounts-receivable": "Accounts Receivable",
};

const bookTypeToTransactionTypes: Record<string, string[]> = {
  "sales-book": ["cash_sale", "credit_sale"],
  "purchase-book": ["cash_purchase", "credit_purchase"],
  "cash-book": ["cash_sale", "cash_purchase", "cash_receipt", "cash_payment"],
  "bank-book": ["bank_receipt", "bank_payment"],
  "payroll-book": ["payroll"],
  "general-journal": ["adjustment", "opening_balance"],
  "sales-return-book": ["sales_return"],
  "purchase-return-book": ["purchase_return"],
  // Add others as needed
};

const bookViews: Record<string, string> = {
  "cash-book": "view_ledger_cash",
  "bank-book": "view_ledger_bank",
  "sales-book": "view_ledger_sales",

  "purchase-book": "view_ledger_purchases",
  "accounts-payable": "view_ledger_accounts_payable",
  "accounts-receivable": "view_ledger_accounts_receivable",
};

const BookView = () => {
  const { bookType } = useParams<{ bookType: string }>();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, [bookType]);

  const fetchEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let data = [];
      let error = null;

      console.log("🚀 ~ fetchEntries ~ bookType:", bookType)
      console.log("🚀 ~ fetchEntries ~ bookViews:", bookViews)
      if (bookType && bookViews[bookType]) {
        // Fetch from specific view
        const result = await supabase
          .from(bookViews[bookType] as any)
          .select("*")
          .eq("user_id", user.id)
          .order("transaction_date", { ascending: false });
        console.log("🚀 ~ fetchEntries ~ result:", result)

        data = result.data || [];
        error = result.error;
      } else {
        // Fallback for other books (using original logic but adapted)
        let query = supabase
          .from("journal_entries")
          .select(`
            *,
            journal_entry_lines (
              debit,
              credit
            )
          `)
          .eq("user_id", user.id);
        console.log("🚀 ~ fetchEntries ~ query:", query)

        if (bookType && bookType !== "book-view" && bookTypeToTransactionTypes[bookType]) {
          query = query.in("transaction_type", bookTypeToTransactionTypes[bookType]);
        }

        const result = await query.order("transaction_date", { ascending: false });
        console.log("🚀 ~ fetchEntries ~ result:", result)
        data = result.data || [];
        error = result.error;
      }

      if (error) throw error;

      setEntries(data);
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

  const formatTransactionType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getAmount = (entry: any) => {
    // If from view
    if (entry.net_change !== undefined) return entry.net_change;
    if (entry.amount !== undefined) return entry.amount;

    // If from journal_entries (fallback)
    if (entry.journal_entry_lines) {
      return entry.journal_entry_lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const title = bookType ? bookTitles[bookType] || "Book View" : "Book View";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">
          Entries automatically categorized by transaction type
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
                Create entries to see transactions here
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
                    <TableHead>Party</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {formatDate(entry.transaction_date)}
                      </TableCell>
                      <TableCell>
                        {entry.reference_number || "-"}
                      </TableCell>
                      <TableCell className="max-w-md truncate" title={entry.description || ""}>
                        {entry.description}
                      </TableCell>
                      <TableCell>{entry.party_name || "-"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                          {formatTransactionType(entry.transaction_type)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(getAmount(entry))}
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
