import { getProducts } from "@/actions/products";
import { ProductsTable } from "@/components/manufacturing/products/products-table";

export default async function ProductsPage() {
  const result = await getProducts();
  const products = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
        <p className="text-muted-foreground">
          Manage products, SKUs, and ideal cycle times.
        </p>
      </div>

      <ProductsTable data={products} />
    </div>
  );
}
