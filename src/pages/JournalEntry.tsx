import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface EntryLine {
  id: string;
  accountType: string;
  accountName: string;
  entryType: string;
  amount: string;
  notes: string;
}

const accountTypes = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "sales", label: "Sales" },
  { value: "purchase", label: "Purchase" },
  { value: "accounts_payable", label: "Accounts Payable" },
  { value: "accounts_receivable", label: "Accounts Receivable" },
  { value: "inventory", label: "Inventory" },
  { value: "payroll", label: "Payroll" },
  { value: "other", label: "Other" },
];

const JournalEntry = () => {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [lines, setLines] = useState<EntryLine[]>([
    {
      id: crypto.randomUUID(),
      accountType: "",
      accountName: "",
      entryType: "debit",
      amount: "",
      notes: "",
    },
  ]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: crypto.randomUUID(),
        accountType: "",
        accountName: "",
        entryType: "debit",
        amount: "",
        notes: "",
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter((line) => line.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof EntryLine, value: string) => {
    setLines(
      lines.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
    );
  };

  const calculateTotals = () => {
    let totalDebit = 0;
    let totalCredit = 0;

    lines.forEach((line) => {
      const amount = parseFloat(line.amount) || 0;
      if (line.entryType === "debit") {
        totalDebit += amount;
      } else {
        totalCredit += amount;
      }
    });

    return { totalDebit, totalCredit };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { totalDebit, totalCredit } = calculateTotals();
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        toast.error("Debits and credits must balance!");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: journalEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          user_id: user.id,
          entry_date: entryDate,
          description,
          reference_number: referenceNumber || null,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      const entryLines = lines.map((line) => ({
        journal_entry_id: journalEntry.id,
        account_type: line.accountType as any,
        account_name: line.accountName,
        entry_type: line.entryType as any,
        amount: parseFloat(line.amount),
        notes: line.notes || null,
      }));

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(entryLines);

      if (linesError) throw linesError;

      toast.success("Journal entry created successfully!");
      
      // Reset form
      setDescription("");
      setReferenceNumber("");
      setEntryDate(new Date().toISOString().split("T")[0]);
      setLines([
        {
          id: crypto.randomUUID(),
          accountType: "",
          accountName: "",
          entryType: "debit",
          amount: "",
          notes: "",
        },
      ]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Journal Entry</h1>
        <p className="text-muted-foreground">
          Record transactions that will automatically distribute to relevant books
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Entry Details</CardTitle>
            <CardDescription>Basic information about this journal entry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Entry Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Reference Number (Optional)</Label>
                <Input
                  id="reference"
                  placeholder="e.g., INV-001"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe this transaction..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft mt-6">
          <CardHeader>
            <CardTitle>Entry Lines</CardTitle>
            <CardDescription>Add debit and credit entries (must balance)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.map((line, index) => (
              <div key={line.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Line {index + 1}</h4>
                  {lines.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(line.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Select
                      value={line.accountType}
                      onValueChange={(value) => updateLine(line.id, "accountType", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        {accountTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      placeholder="e.g., Office Supplies"
                      value={line.accountName}
                      onChange={(e) => updateLine(line.id, "accountName", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Entry Type</Label>
                    <Select
                      value={line.entryType}
                      onValueChange={(value) => updateLine(line.id, "entryType", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Debit</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={line.amount}
                      onChange={(e) => updateLine(line.id, "amount", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input
                    placeholder="Additional notes..."
                    value={line.notes}
                    onChange={(e) => updateLine(line.id, "notes", e.target.value)}
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addLine}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Line
            </Button>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Total Debit:</span>
                <span className="font-mono">${totalDebit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Total Credit:</span>
                <span className="font-mono">${totalCredit.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between font-bold ${isBalanced ? "text-success" : "text-destructive"}`}>
                <span>Status:</span>
                <span>{isBalanced ? "Balanced ✓" : "Not Balanced ✗"}</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isBalanced}
            >
              {loading ? "Saving..." : "Save Journal Entry"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default JournalEntry;
