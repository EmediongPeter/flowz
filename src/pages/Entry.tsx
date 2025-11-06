import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const transactionTypes = [
  { value: "cash_sale", label: "Cash Sale" },
  { value: "credit_sale", label: "Credit Sale" },
  { value: "cash_purchase", label: "Cash Purchase" },
  { value: "credit_purchase", label: "Credit Purchase" },
  { value: "sales_return", label: "Sales Return" },
  { value: "purchase_return", label: "Purchase Return" },
  { value: "cash_receipt", label: "Cash Receipt" },
  { value: "cash_payment", label: "Cash Payment" },
  { value: "bank_receipt", label: "Bank Receipt" },
  { value: "bank_payment", label: "Bank Payment" },
  { value: "payroll", label: "Payroll" },
  { value: "expense", label: "Expense" },
  { value: "asset_purchase", label: "Asset Purchase" },
  { value: "asset_disposal", label: "Asset Disposal" },
  { value: "loan_received", label: "Loan Received" },
  { value: "loan_payment", label: "Loan Payment" },
  { value: "adjustment", label: "Adjustment" },
  { value: "opening_balance", label: "Opening Balance" },
];

const partyTypes = [
  { value: "customer", label: "Customer" },
  { value: "supplier", label: "Supplier" },
  { value: "employee", label: "Employee" },
  { value: "other", label: "Other" },
];

const paymentTypes = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "credit", label: "Credit" },
];

const paymentModes = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "pos", label: "POS" },
  { value: "online", label: "Online" },
  { value: "mobile_money", label: "Mobile Money" },
];

export default function Entry() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>();
  
  // Transaction Identity
  const [transactionType, setTransactionType] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");
  
  // Party Details
  const [partyName, setPartyName] = useState("");
  const [partyType, setPartyType] = useState("");
  const [partyContact, setPartyContact] = useState("");
  
  // Transaction Description
  const [category, setCategory] = useState("");
  const [productServiceName, setProductServiceName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [taxRate, setTaxRate] = useState("");
  
  // Payment Information
  const [paymentType, setPaymentType] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  
  // Payroll Fields
  const [employeeId, setEmployeeId] = useState("");
  const [grossPay, setGrossPay] = useState("");
  const [allowances, setAllowances] = useState("");
  const [deductions, setDeductions] = useState("");
  
  // Accounting Tags
  const [debitAccount, setDebitAccount] = useState("");
  const [creditAccount, setCreditAccount] = useState("");
  const [ledgerCategory, setLedgerCategory] = useState("");
  const [notes, setNotes] = useState("");

  const calculateAmounts = () => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    const disc = parseFloat(discount) || 0;
    const tax = parseFloat(taxRate) || 0;
    
    const beforeTax = (qty * price) - disc;
    const taxAmount = (beforeTax * tax) / 100;
    const total = beforeTax + taxAmount;
    const paid = parseFloat(amountPaid) || 0;
    const balance = total - paid;
    
    return {
      amountBeforeTax: beforeTax.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: total.toFixed(2),
      balanceDue: balance.toFixed(2),
    };
  };

  const calculatePayroll = () => {
    const gross = parseFloat(grossPay) || 0;
    const allow = parseFloat(allowances) || 0;
    const deduc = parseFloat(deductions) || 0;
    const netPay = gross + allow - deduc;
    
    return netPay.toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transactionType) {
      toast.error("Please select a transaction type");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create entries");
        return;
      }

      const amounts = transactionType === "payroll" 
        ? { totalAmount: calculatePayroll(), amountBeforeTax: "0", taxAmount: "0", balanceDue: "0" }
        : calculateAmounts();

      // Get book category from backend function
      const { data: bookCategory } = await supabase.rpc('assign_book_category', {
        tx_type: transactionType as any
      });

      const { error } = await supabase.from("entries").insert([{
        user_id: user.id,
        transaction_date: format(date, "yyyy-MM-dd"),
        transaction_type: transactionType as any,
        reference_number: referenceNumber || null,
        book_category: bookCategory as any,
        party_name: partyName || null,
        party_type: (partyType || null) as any,
        party_contact: partyContact || null,
        description,
        category: category || null,
        product_service_name: productServiceName || null,
        quantity: quantity ? parseFloat(quantity) : null,
        unit_price: unitPrice ? parseFloat(unitPrice) : null,
        amount_before_tax: amounts.amountBeforeTax ? parseFloat(amounts.amountBeforeTax) : null,
        discount: discount ? parseFloat(discount) : 0,
        tax_rate: taxRate ? parseFloat(taxRate) : null,
        tax_amount: amounts.taxAmount ? parseFloat(amounts.taxAmount) : null,
        total_amount: parseFloat(amounts.totalAmount),
        payment_type: (paymentType || null) as any,
        payment_mode: (paymentMode || null) as any,
        payment_reference: paymentReference || null,
        bank_name: bankName || null,
        bank_account: bankAccount || null,
        amount_paid: amountPaid ? parseFloat(amountPaid) : null,
        balance_due: amounts.balanceDue ? parseFloat(amounts.balanceDue) : 0,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        employee_id: employeeId || null,
        gross_pay: grossPay ? parseFloat(grossPay) : null,
        allowances: allowances ? parseFloat(allowances) : null,
        deductions: deductions ? parseFloat(deductions) : null,
        net_pay: transactionType === "payroll" ? parseFloat(calculatePayroll()) : null,
        debit_account: debitAccount || null,
        credit_account: creditAccount || null,
        ledger_category: ledgerCategory || null,
        notes: notes || null,
      }]);

      if (error) throw error;

      toast.success("Entry created successfully!");
      navigate("/dashboard/book-view");
    } catch (error: any) {
      console.error("Error creating entry:", error);
      toast.error(error.message || "Failed to create entry");
    } finally {
      setLoading(false);
    }
  };

  const amounts = transactionType === "payroll" ? null : calculateAmounts();
  const netPay = transactionType === "payroll" ? calculatePayroll() : null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Entry</h1>
        <Button variant="outline" onClick={() => navigate("/dashboard/book-view")}>
          View All Entries
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Transaction Details</TabsTrigger>
            <TabsTrigger value="payment">Payment Info</TabsTrigger>
            <TabsTrigger value="accounting">Accounting</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Transaction Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(date, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Transaction Type *</Label>
                    <Select value={transactionType} onValueChange={setTransactionType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {transactionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Invoice #, Receipt #, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the transaction"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Party Name</Label>
                    <Input
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      placeholder="Customer/Supplier name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Party Type</Label>
                    <Select value={partyType} onValueChange={setPartyType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {partyTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Contact</Label>
                    <Input
                      value={partyContact}
                      onChange={(e) => setPartyContact(e.target.value)}
                      placeholder="Phone/Email"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transactionType === "payroll" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Employee ID</Label>
                      <Input
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="Employee identifier"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Gross Pay</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={grossPay}
                          onChange={(e) => setGrossPay(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Allowances</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={allowances}
                          onChange={(e) => setAllowances(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Deductions</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={deductions}
                          onChange={(e) => setDeductions(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {netPay && (
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Net Pay:</span>
                          <span className="text-2xl font-bold">${netPay}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Input
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="Inventory, Asset, etc."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Product/Service Name</Label>
                        <Input
                          value={productServiceName}
                          onChange={(e) => setProductServiceName(e.target.value)}
                          placeholder="Item or service"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={unitPrice}
                          onChange={(e) => setUnitPrice(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Discount</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Tax Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={taxRate}
                          onChange={(e) => setTaxRate(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {amounts && (
                      <div className="space-y-2 p-4 bg-muted rounded-lg">
                        <div className="flex justify-between">
                          <span>Amount Before Tax:</span>
                          <span className="font-semibold">${amounts.amountBeforeTax}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax Amount:</span>
                          <span className="font-semibold">${amounts.taxAmount}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total Amount:</span>
                          <span>${amounts.totalAmount}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select value={paymentType} onValueChange={setPaymentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentModes.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Payment Reference</Label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID, Cheque #, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Bank name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bank Account</Label>
                    <Input
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="Account number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount Paid</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {amounts && amounts.balanceDue !== "0.00" && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Balance Due:</span>
                      <span className="text-2xl font-bold text-destructive">${amounts.balanceDue}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounting">
            <Card>
              <CardHeader>
                <CardTitle>Accounting Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Debit Account</Label>
                    <Input
                      value={debitAccount}
                      onChange={(e) => setDebitAccount(e.target.value)}
                      placeholder="Account to debit"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Credit Account</Label>
                    <Input
                      value={creditAccount}
                      onChange={(e) => setCreditAccount(e.target.value)}
                      placeholder="Account to credit"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ledger Category</Label>
                  <Input
                    value={ledgerCategory}
                    onChange={(e) => setLedgerCategory(e.target.value)}
                    placeholder="Category for trial balance"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional information..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Entry"}
          </Button>
        </div>
      </form>
    </div>
  );
}
