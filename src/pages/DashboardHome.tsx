import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, FileText, Package, Target, Plus, Trash2, Book } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MetricData {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
}

interface Product {
  id: string;
  product_name: string;
  unit_price: number;
  bulk_price: number;
}

interface ProfitTarget {
  id: string;
  monthly_target: number;
  yearly_target: number;
  target_month: number;
  target_year: number;
}

const DashboardHome = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricData>({
    totalRevenue: 0,
    totalCost: 0,
    netProfit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  // Product state
  const [products, setProducts] = useState<Product[]>([]);
  const [productName, setProductName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");

  // Profit target state
  const [profitTargets, setProfitTargets] = useState<ProfitTarget | null>(null);
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [yearlyTarget, setYearlyTarget] = useState("");
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchSetupData();
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
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

      let revenue = 0;
      let cost = 0;

      accounts?.forEach((account: any) => {
        const balance = parseFloat(account.net_balance || 0);

        if (account.account_type === 'income') {
          // Income: Credit is increase (negative net_balance)
          revenue += -balance;
        } else if (account.account_type === 'expense') {
          // Expense: Debit is increase (positive net_balance)
          cost += balance;
        }
      });

      setMetrics({
        totalRevenue: revenue,
        totalCost: cost,
        netProfit: revenue - cost,
      });
    } catch (error: any) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSetupData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Fetch current profit targets
      const { data: targetsData, error: targetsError } = await supabase
        .from("profit_targets")
        .select("*")
        .eq("user_id", user.id)
        .eq("target_month", targetMonth)
        .eq("target_year", targetYear)
        .maybeSingle();

      if (targetsError) throw targetsError;
      if (targetsData) {
        setProfitTargets(targetsData);
        setMonthlyTarget(targetsData.monthly_target.toString());
        setYearlyTarget(targetsData.yearly_target.toString());
      }
    } catch (error: any) {
      console.error("Error fetching setup data:", error);
    }
  };

  const handleAddProduct = async () => {
    if (!productName || !unitPrice || !bulkPrice) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("products").insert({
        user_id: user.id,
        product_name: productName,
        unit_price: parseFloat(unitPrice),
        bulk_price: parseFloat(bulkPrice),
      });

      if (error) throw error;

      toast.success("Product added successfully");
      setProductName("");
      setUnitPrice("");
      setBulkPrice("");
      fetchSetupData();
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast.error("Failed to add product");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;

      toast.success("Product deleted successfully");
      fetchSetupData();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleSaveProfitTargets = async () => {
    if (!monthlyTarget || !yearlyTarget) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("profit_targets").upsert(
        {
          user_id: user.id,
          monthly_target: parseFloat(monthlyTarget),
          yearly_target: parseFloat(yearlyTarget),
          target_month: targetMonth,
          target_year: targetYear,
        },
        { onConflict: "user_id,target_month,target_year" }
      );

      if (error) throw error;

      toast.success("Profit targets saved successfully");
      fetchSetupData();
    } catch (error: any) {
      console.error("Error saving profit targets:", error);
      toast.error("Failed to save profit targets");
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your financial performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-soft hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From sales transactions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <div className="p-2 bg-destructive/10 rounded-lg">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(metrics.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From expenses and purchases
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <div className="p-2 bg-accent/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${metrics.netProfit >= 0 ? "text-success" : "text-destructive"
                }`}
            >
              {formatCurrency(metrics.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue minus total costs
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Setup</CardTitle>
            <CardDescription>
              Configure your products and profit targets
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  Open Setup
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Business Setup</DialogTitle>
                  <DialogDescription>
                    Manage your products and profit targets
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="products" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="products" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Products
                    </TabsTrigger>
                    <TabsTrigger value="targets" className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Profit Targets
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="products" className="space-y-6 mt-4">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="productName">Product Name</Label>
                          <Input
                            id="productName"
                            placeholder="Enter product name"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="unitPrice">Unit Price</Label>
                          <Input
                            id="unitPrice"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={unitPrice}
                            onChange={(e) => setUnitPrice(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bulkPrice">Bulk Price</Label>
                          <Input
                            id="bulkPrice"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={bulkPrice}
                            onChange={(e) => setBulkPrice(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button onClick={handleAddProduct} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </div>

                    {products.length > 0 && (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product Name</TableHead>
                              <TableHead>Unit Price</TableHead>
                              <TableHead>Bulk Price</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {products.map((product) => (
                              <TableRow key={product.id}>
                                <TableCell className="font-medium">
                                  {product.product_name}
                                </TableCell>
                                <TableCell>{formatCurrency(product.unit_price)}</TableCell>
                                <TableCell>{formatCurrency(product.bulk_price)}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="targets" className="space-y-6 mt-4">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="monthlyTarget">Monthly Target</Label>
                          <Input
                            id="monthlyTarget"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={monthlyTarget}
                            onChange={(e) => setMonthlyTarget(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="yearlyTarget">Yearly Target</Label>
                          <Input
                            id="yearlyTarget"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={yearlyTarget}
                            onChange={(e) => setYearlyTarget(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="targetMonth">Month</Label>
                          <Input
                            id="targetMonth"
                            type="number"
                            min="1"
                            max="12"
                            value={targetMonth}
                            onChange={(e) => setTargetMonth(parseInt(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="targetYear">Year</Label>
                          <Input
                            id="targetYear"
                            type="number"
                            min="2000"
                            max="2100"
                            value={targetYear}
                            onChange={(e) => setTargetYear(parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                      <Button onClick={handleSaveProfitTargets} className="w-full">
                        Save Targets
                      </Button>
                    </div>

                    {profitTargets && (
                      <div className="p-4 rounded-lg border border-primary/20 bg-muted/50">
                        <h3 className="font-semibold mb-4">Current Targets for {targetMonth}/{targetYear}</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Monthly Target</p>
                            <p className="text-2xl font-bold text-primary">
                              {formatCurrency(profitTargets.monthly_target)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Yearly Target</p>
                            <p className="text-2xl font-bold text-primary">
                              {formatCurrency(profitTargets.yearly_target)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Financial Statements
            </CardTitle>
          </CardHeader>
          <CardDescription className="px-6 text-muted-foreground">
            Generate comprehensive financial reports
          </CardDescription>
          <CardContent className="pt-6">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  Generate Financial Statements
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Financial Statement</DialogTitle>
                  <DialogDescription>
                    Choose which financial statement you'd like to view
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate("/dashboard/profit-loss");
                      setDialogOpen(false);
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Profit and Loss Statement
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate("/dashboard/balance-sheet");
                      setDialogOpen(false);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Balance Sheet Statement
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              Ledger Books
            </CardTitle>
          </CardHeader>
          <CardDescription className="px-6 text-muted-foreground">
            View detailed transaction logs
          </CardDescription>
          <CardContent className="pt-6">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full" variant="secondary">
                  View Ledgers
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Ledger Book</DialogTitle>
                  <DialogDescription>
                    View transactions for specific accounts
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <Button variant="outline" onClick={() => navigate("/dashboard/cash-book")}>
                    Cash Book
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard/bank-book")}>
                    Bank Book
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard/sales-book")}>
                    Sales Book
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard/purchase-book")}>
                    Purchase Book
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard/book-view")}>
                    General Journal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
