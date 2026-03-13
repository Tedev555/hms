"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Package,
  X,
  Check,
} from "lucide-react";
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

type PrescriptionItem = {
  id: string;
  dosage: string;
  quantity: number;
  isDispensed: boolean;
  drug: { id: string; genericName: string; brandName: string | null };
};

type PrescriptionRow = {
  id: string;
  diagnosis: string | null;
  createdAt: string;
  patient: { id: string; firstName: string; lastName: string; patientCode: string };
  doctor: { id: string; firstName: string; lastName: string };
  items: PrescriptionItem[];
};

type Meta = { total: number; page: number; limit: number; totalPages: number };

export default function PrescriptionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authFetch } = useAuth();

  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");

  const fetchPrescriptions = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await authFetch(`/api/v1/prescriptions?${params.toString()}`);
        if (res.ok) {
          const body = await res.json();
          setPrescriptions(body.data);
          setMeta(body.meta);
        }
      } catch {
        // Network error
      } finally {
        setLoading(false);
      }
    },
    [authFetch, statusFilter],
  );

  useEffect(() => {
    fetchPrescriptions(1);
  }, [fetchPrescriptions]);

  function getPrescriptionStatus(items: PrescriptionItem[]) {
    const allDispensed = items.every((i) => i.isDispensed);
    const someDispensed = items.some((i) => i.isDispensed);

    if (allDispensed) return { label: "Dispensed", style: "bg-green-50 text-green-700 border-green-200" };
    if (someDispensed) return { label: "Partial", style: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "Pending", style: "bg-blue-50 text-blue-700 border-blue-200" };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prescriptions</h1>
        <p className="text-muted-foreground mt-1">
          {meta.total} prescription{meta.total !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filter:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="dispensed">Dispensed</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter("all")}
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
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead className="hidden md:table-cell">Diagnosis</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
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
              ) : prescriptions.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-48">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <Package className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="font-medium text-muted-foreground">No prescriptions found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                prescriptions.map((rx) => {
                  const status = getPrescriptionStatus(rx.items);
                  const dispensedCount = rx.items.filter((i) => i.isDispensed).length;
                  return (
                    <TableRow
                      key={rx.id}
                      className="cursor-pointer transition-colors"
                      onClick={() => router.push(`/pharmacy/prescriptions/${rx.id}`)}
                    >
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {rx.patient.firstName} {rx.patient.lastName}
                          </span>
                          <p className="text-xs text-muted-foreground">{rx.patient.patientCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        Dr. {rx.doctor.firstName} {rx.doctor.lastName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground max-w-48 truncate">
                        {rx.diagnosis || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="tabular-nums">
                          {dispensedCount}/{rx.items.length}
                        </span>
                        {dispensedCount === rx.items.length && (
                          <Check className="inline h-3 w-3 ml-1 text-green-600" />
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(rx.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.style}>
                          {status.label}
                        </Badge>
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
              onClick={() => fetchPrescriptions(meta.page - 1)}
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
              onClick={() => fetchPrescriptions(meta.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
