"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Pill,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";

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
};

type Meta = { total: number; page: number; limit: number; totalPages: number };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export default function DrugCataloguePage() {
  const router = useRouter();
  const { authFetch, user } = useAuth();
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const canManage = user && ["pharmacist", "admin"].includes(user.role);

  const fetchDrugs = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (search) params.set("search", search);
        if (categoryFilter !== "all") params.set("category", categoryFilter);

        const res = await authFetch(`/api/v1/drugs?${params.toString()}`);
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
    [authFetch, search, categoryFilter],
  );

  useEffect(() => {
    fetchDrugs(1);
  }, [fetchDrugs]);

  function handleSearch(value: string) {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      fetchDrugs(1);
    }, 300);
    setSearchTimeout(timeout);
  }

  const hasFilters = categoryFilter !== "all" || search;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drug Catalogue</h1>
          <p className="text-muted-foreground mt-1">
            {meta.total} drug{meta.total !== 1 ? "s" : ""} in catalogue
          </p>
        </div>
        {canManage && (
          <Button asChild className="gap-2">
            <Link href="/pharmacy/drugs/new">
              <Plus className="h-4 w-4" />
              Add Drug
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by generic or brand name..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Analgesics">Analgesics</SelectItem>
            <SelectItem value="Antibiotics">Antibiotics</SelectItem>
            <SelectItem value="Antihypertensives">Antihypertensives</SelectItem>
            <SelectItem value="Antidiabetics">Antidiabetics</SelectItem>
            <SelectItem value="Gastrointestinal">Gastrointestinal</SelectItem>
            <SelectItem value="Respiratory">Respiratory</SelectItem>
            <SelectItem value="Vitamins">Vitamins</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setCategoryFilter("all");
            }}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Drug Name</TableHead>
                <TableHead className="hidden md:table-cell">Formulation</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Price</TableHead>
                <TableHead>Status</TableHead>
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
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <Pill className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="font-medium text-muted-foreground">No drugs found</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        {hasFilters
                          ? "Try adjusting your search or filters"
                          : "Add drugs to the catalogue to get started"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                drugs.map((drug) => {
                  const isLowStock = drug.currentStock <= drug.reorderLevel;
                  return (
                    <TableRow
                      key={drug.id}
                      className="cursor-pointer transition-colors"
                      onClick={() => router.push(`/pharmacy/drugs/${drug.id}`)}
                    >
                      <TableCell>
                        <div>
                          <span className="font-medium">{drug.genericName}</span>
                          {drug.brandName && (
                            <span className="text-sm text-muted-foreground ml-1">
                              ({drug.brandName})
                            </span>
                          )}
                          {drug.strength && (
                            <span className="text-sm text-muted-foreground ml-1">
                              {drug.strength}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {drug.isControlled && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                              Controlled
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize hidden md:table-cell">
                        {drug.formulation}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {drug.category || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isLowStock && (
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                          )}
                          <span
                            className={
                              drug.currentStock === 0
                                ? "text-red-600 font-medium"
                                : isLowStock
                                  ? "text-amber-600 font-medium"
                                  : ""
                            }
                          >
                            {drug.currentStock}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {drug.unit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden sm:table-cell">
                        {formatCurrency(Number(drug.unitPrice))}
                      </TableCell>
                      <TableCell>
                        {drug.currentStock === 0 ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Out of Stock
                          </Badge>
                        ) : isLowStock ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            In Stock
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
            Showing {(meta.page - 1) * meta.limit + 1}-
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={meta.page <= 1}
              onClick={() => fetchDrugs(meta.page - 1)}
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
              onClick={() => fetchDrugs(meta.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
