"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";

type LowStockDrug = {
  id: string;
  genericName: string;
  brandName: string | null;
  category: string | null;
  formulation: string;
  strength: string | null;
  unit: string;
  reorderLevel: number;
  currentStock: number;
  isControlled: boolean;
};

type Meta = { total: number; page: number; limit: number; totalPages: number };

export default function LowStockReportPage() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [drugs, setDrugs] = useState<LowStockDrug[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const fetchLowStock = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/v1/drugs/low-stock?page=${page}&limit=20`);
        if (res.ok) {
          const body = await res.json();
          setDrugs(body.data);
          setMeta(body.meta);
        }
      } catch {
        // Network error
      } finally {
        setLoading(false);
      }
    },
    [authFetch],
  );

  useEffect(() => {
    fetchLowStock(1);
  }, [fetchLowStock]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/pharmacy")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Low Stock Report</h1>
          <p className="text-muted-foreground mt-1">
            {meta.total} drug{meta.total !== 1 ? "s" : ""} at or below reorder level
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Drug Name</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Reorder Level</TableHead>
                <TableHead className="text-right">Deficit</TableHead>
                <TableHead>Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : drugs.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-48">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="rounded-full bg-green-50 p-4 mb-4">
                        <AlertTriangle className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="font-medium text-muted-foreground">No low stock alerts</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        All drugs are above their reorder levels
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                drugs.map((drug) => {
                  const deficit = drug.reorderLevel - drug.currentStock;
                  return (
                    <TableRow
                      key={drug.id}
                      className="cursor-pointer transition-colors"
                      onClick={() => router.push(`/pharmacy/drugs/${drug.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">{drug.genericName}</span>
                        {drug.brandName && (
                          <span className="text-sm text-muted-foreground ml-1">
                            ({drug.brandName})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {drug.category || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={drug.currentStock === 0 ? "text-red-600 font-medium" : "text-amber-600 font-medium"}>
                          {drug.currentStock}
                        </span>
                        <span className="text-muted-foreground text-xs ml-1">{drug.unit}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {drug.reorderLevel}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-red-600">
                        {deficit > 0 ? `-${deficit}` : "0"}
                      </TableCell>
                      <TableCell>
                        {drug.currentStock === 0 ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Out of Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Low Stock
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!loading && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={meta.page <= 1}
              onClick={() => fetchLowStock(meta.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3 tabular-nums">
              {meta.page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={meta.page >= meta.totalPages}
              onClick={() => fetchLowStock(meta.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
