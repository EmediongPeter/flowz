import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Target, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const Setup = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [profitTargets, setProfitTargets] = useState<ProfitTarget | null>(null);
  const [loading, setLoading] = useState(true);

  // Product form state
  const [productName, setProductName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");

  // Profit target form state
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [yearlyTarget, setYearlyTarget] = useState("");
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
        .single();

      if (targetsError && targetsError.code !== "PGRST116") throw targetsError;
      if (targetsData) {
        setProfitTargets(targetsData);
        setMonthlyTarget(targetsData.monthly_target.toString());
        setYearlyTarget(targetsData.yearly_target.toString());
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!productName || !unitPrice || !bulkPrice) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      fetchData();
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
      fetchData();
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
      if (!user) return;

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
      fetchData();
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
        <h1 className="text-3xl font-bold mb-2">Setup</h1>
        <p className="text-muted-foreground">
          Configure your products and profit targets
        </p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="targets" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Profit Targets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add New Product
              </CardTitle>
              <CardDescription>
                Set up your products with unit and bulk pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <Button onClick={handleAddProduct} className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Your Products</CardTitle>
              <CardDescription>
                Manage your product catalog and pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No products added yet. Add your first product above.
                </p>
              ) : (
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Set Profit Targets
              </CardTitle>
              <CardDescription>
                Define your monthly and yearly profit goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <Button onClick={handleSaveProfitTargets} className="w-full md:w-auto">
                Save Targets
              </Button>
            </CardContent>
          </Card>

          {profitTargets && (
            <Card className="shadow-soft border-primary/20">
              <CardHeader>
                <CardTitle>Current Targets</CardTitle>
                <CardDescription>
                  Your active profit targets for {targetMonth}/{targetYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Monthly Target</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(profitTargets.monthly_target)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Yearly Target</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(profitTargets.yearly_target)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Setup;
