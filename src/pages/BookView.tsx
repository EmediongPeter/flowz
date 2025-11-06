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
  transaction_date: string;
  description: string;
  party_name: string | null;
  transaction_type: string;
  total_amount: number;
  reference_number: string | null;
  book_category: string;
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
};

const bookCategoryMap: Record<string, string> = {
  "book-view": "all",
  "sales-book": "sales_book",
  "purchase-book": "purchase_book",
  "cash-book": "cash_book",
  "bank-book": "bank_book",
  "payroll-book": "payroll_book",
  "petty-cash-book": "petty_cash_book",
  "general-journal": "general_journal",
  "sales-return-book": "sales_return_book",
  "purchase-return-book": "purchase_return_book",
  "bills-receivable-book": "bills_receivable_book",
  "bills-payable-book": "bills_payable_book",
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

      const bookCategory = bookType ? bookCategoryMap[bookType] : "all";

      let query = supabase
        .from("entries")
        .select("*")
        .eq("user_id", user.id);

      if (bookCategory !== "all") {
        query = query.eq("book_category", bookCategory as any);
      }

      const { data, error } = await query.order("transaction_date", { ascending: false });

      if (error) throw error;

      setEntries(data || []);
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
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{entry.party_name || "-"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                          {formatTransactionType(entry.transaction_type)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(parseFloat(entry.total_amount.toString()))}
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
