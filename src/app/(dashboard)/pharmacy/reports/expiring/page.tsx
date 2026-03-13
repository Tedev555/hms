"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

type ExpiringBatch = {
  id: string;
  batchNo: string;
  quantity: number;
  expiryDate: string;
  isExpired: boolean;
  drug: {
    id: string;
    genericName: string;
    brandName: string | null;
    unit: string;
  };
};

type Meta = { total: number; page: number; limit: number; totalPages: number };

export default function ExpiringReportPage() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [batches, setBatches] = useState<ExpiringBatch[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("90");

  const fetchExpiring = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/v1/drugs/expiring?page=${page}&limit=20&days=${days}`);
        if (res.ok) {
          const body = await res.json();
          setBatches(body.data);
          setMeta(body.meta);
        }
      } catch {
        // Network error
      } finally {
        setLoading(false);
      }
    },
    [authFetch, days],
  );

  useEffect(() => {
    fetchExpiring(1);
  }, [fetchExpiring]);

  function daysUntilExpiry(expiryDate: string) {
    const diff = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/pharmacy")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Expiring Batches Report</h1>
          <p className="text-muted-foreground mt-1">
            {meta.total} batch{meta.total !== 1 ? "es" : ""} expiring or expired
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Next 30 days</SelectItem>
            <SelectItem value="60">Next 60 days</SelectItem>
            <SelectItem value="90">Next 90 days</SelectItem>
            <SelectItem value="180">Next 180 days</SelectItem>
            <SelectItem value="365">Next year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Drug</TableHead>
                <TableHead>Batch No.</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Days Left</TableHead>
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
              ) : batches.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-48">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="rounded-full bg-green-50 p-4 mb-4">
                        <Clock className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="font-medium text-muted-foreground">No expiring batches</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        No batches are expiring within the selected period
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => {
                  const daysLeft = daysUntilExpiry(batch.expiryDate);
                  return (
                    <TableRow
                      key={batch.id}
                      className="cursor-pointer transition-colors"
                      onClick={() => router.push(`/pharmacy/drugs/${batch.drug.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium">{batch.drug.genericName}</span>
                        {batch.drug.brandName && (
                          <span className="text-sm text-muted-foreground ml-1">
                            ({batch.drug.brandName})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{batch.batchNo}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {batch.quantity} {batch.drug.unit}
                      </TableCell>
                      <TableCell>
                        <span className={batch.isExpired ? "text-red-600" : daysLeft <= 30 ? "text-amber-600" : ""}>
                          {new Date(batch.expiryDate).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums hidden sm:table-cell">
                        {batch.isExpired ? (
                          <span className="text-red-600 font-medium">Expired</span>
                        ) : (
                          <span className={daysLeft <= 30 ? "text-amber-600 font-medium" : ""}>
                            {daysLeft}d
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {batch.isExpired ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Expired
                          </Badge>
                        ) : daysLeft <= 30 ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Expiring Soon
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Approaching
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
              onClick={() => fetchExpiring(meta.page - 1)}
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
              onClick={() => fetchExpiring(meta.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
