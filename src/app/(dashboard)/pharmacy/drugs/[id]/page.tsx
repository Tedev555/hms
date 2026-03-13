"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  Shield,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";

type DrugBatch = {
  id: string;
  batchNo: string;
  quantity: number;
  expiryDate: string;
  costPrice: number;
  supplier: string | null;
  receivedAt: string;
};

type Drug = {
  id: string;
  genericName: string;
  brandName: string | null;
  category: string | null;
  formulation: string;
  strength: string | null;
  unit: string;
  reorderLevel: number;
  currentStock: number;
  unitPrice: number;
  isControlled: boolean;
  requiresPrescription: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  batches: DrugBatch[];
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export default function DrugDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { authFetch, user } = useAuth();
  const [drug, setDrug] = useState<Drug | null>(null);
  const [loading, setLoading] = useState(true);

  const canManage = user && ["pharmacist", "admin"].includes(user.role);

  const fetchDrug = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/drugs/${id}`);
      if (res.ok) {
        const body = await res.json();
        setDrug(body.data);
      } else if (res.status === 404) {
        toast.error("Drug not found");
        router.push("/pharmacy/drugs");
      }
    } catch {
      toast.error("Failed to load drug details");
    } finally {
      setLoading(false);
    }
  }, [authFetch, id, router]);

  useEffect(() => {
    fetchDrug();
  }, [fetchDrug]);

  async function toggleStatus() {
    if (!drug) return;
    try {
      const res = await authFetch(`/api/v1/drugs/${drug.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !drug.isActive }),
      });
      if (res.ok) {
        toast.success(drug.isActive ? "Drug deactivated" : "Drug activated");
        fetchDrug();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("An error occurred");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!drug) return null;

  const isLowStock = drug.currentStock <= drug.reorderLevel;
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/pharmacy/drugs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{drug.genericName}</h1>
            {drug.brandName && (
              <span className="text-lg text-muted-foreground">({drug.brandName})</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm capitalize text-muted-foreground">{drug.formulation}</span>
            {drug.strength && (
              <span className="text-sm text-muted-foreground">- {drug.strength}</span>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={toggleStatus}>
              {drug.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {!drug.isActive && (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Inactive</Badge>
        )}
        {drug.isControlled && (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <Shield className="h-3 w-3 mr-1" /> Controlled
          </Badge>
        )}
        {drug.requiresPrescription && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <FileText className="h-3 w-3 mr-1" /> Rx Required
          </Badge>
        )}
        {drug.currentStock === 0 ? (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Out of Stock</Badge>
        ) : isLowStock ? (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertTriangle className="h-3 w-3 mr-1" /> Low Stock
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Stock</Badge>
        )}
      </div>

      {/* Drug Details */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Current Stock</p>
            <p className={`text-2xl font-bold ${isLowStock ? "text-amber-600" : ""}`}>
              {drug.currentStock} <span className="text-sm font-normal text-muted-foreground">{drug.unit}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Reorder at: {drug.reorderLevel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Unit Price</p>
            <p className="text-2xl font-bold">{formatCurrency(Number(drug.unitPrice))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Category</p>
            <p className="text-lg font-medium">{drug.category || "Uncategorized"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Batches</p>
            <p className="text-2xl font-bold">
              {drug.batches.filter((b) => b.quantity > 0 && new Date(b.expiryDate) > now).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Batch History */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Batch History</h2>
        {canManage && (
          <Button asChild size="sm" className="gap-2">
            <Link href={`/pharmacy/drugs/${drug.id}/batches/new`}>
              <Plus className="h-4 w-4" />
              Receive Stock
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Batch No.</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Cost Price</TableHead>
                <TableHead className="hidden md:table-cell">Supplier</TableHead>
                <TableHead className="hidden lg:table-cell">Received</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drug.batches.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No batches recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                drug.batches.map((batch) => {
                  const expiry = new Date(batch.expiryDate);
                  const isExpired = expiry < now;
                  const isExpiringSoon = !isExpired && expiry.getTime() - now.getTime() < 90 * 24 * 60 * 60 * 1000;
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="font-mono text-sm">{batch.batchNo}</TableCell>
                      <TableCell className="text-right">
                        {batch.quantity} {drug.unit}
                      </TableCell>
                      <TableCell>
                        <span className={isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : ""}>
                          {expiry.toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden sm:table-cell">
                        {formatCurrency(Number(batch.costPrice))}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">
                        {batch.supplier || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden lg:table-cell">
                        {new Date(batch.receivedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {batch.quantity === 0 ? (
                          <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                            Depleted
                          </Badge>
                        ) : isExpired ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Expired
                          </Badge>
                        ) : isExpiringSoon ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Expiring Soon
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
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
    </div>
  );
}
