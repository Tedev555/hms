"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Filter, Receipt, X, Plus } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
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
import type { PaginatedResponse } from "@/types";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  patient: { id: string; firstName: string; lastName: string; patientCode: string };
};

const STATUS_KEYS = ["all", "draft", "issued", "partially_paid", "paid", "overdue", "cancelled"] as const;

const statusStyles: Record<string, string> = {
  draft:
    "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
  issued:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  partially_paid:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  paid: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  overdue:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  cancelled:
    "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function BillingPage() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const t = useTranslations("billing");
  const tc = useTranslations("common");

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasFilters = statusFilter !== "all" || dateFrom || dateTo;

  function getStatusBadge(status: string) {
    const label = t(`status.${status}` as Parameters<typeof t>[0]);
    const style = statusStyles[status] || "";
    return (
      <Badge variant="outline" className={style}>
        {label}
      </Badge>
    );
  }

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await authFetch(`/api/v1/invoices?${params.toString()}`);
      if (res.ok) {
        const body: PaginatedResponse<InvoiceRow> = await res.json();
        setInvoices(body.data);
        setTotalPages(body.meta.totalPages);
        setTotal(body.meta.total);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [authFetch, page, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFrom, dateTo]);

  function clearFilters() {
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("list.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {total} {t("list.title").toLowerCase()}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/billing/new">
            <Plus className="h-4 w-4" />
            {t("list.createInvoice")}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">{tc("filters.label")}</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={tc("fields.status")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`status.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-44"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-44"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3 w-3" />
            {tc("filters.clear")}
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("list.invoiceNumber")}</TableHead>
                  <TableHead>{t("list.patient")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("list.issueDate")}</TableHead>
                  <TableHead className="text-right">{t("list.total")}</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">{t("list.paid")}</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">{t("list.balance")}</TableHead>
                  <TableHead>{t("list.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="h-48">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-muted p-4 mb-4">
                          <Receipt className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p className="font-medium text-muted-foreground">{t("list.empty")}</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                          {hasFilters
                            ? tc("table.tryAdjustingFilters")
                            : t("list.emptyAction")}
                        </p>
                        {hasFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={clearFilters}
                          >
                            {tc("filters.clearFilters")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => {
                    const balance = Number(invoice.totalAmount) - Number(invoice.paidAmount);
                    return (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer transition-colors"
                        onClick={() => router.push(`/billing/${invoice.id}`)}
                      >
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {invoice.patient.firstName} {invoice.patient.lastName}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(Number(invoice.totalAmount))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden sm:table-cell">
                          {formatCurrency(Number(invoice.paidAmount))}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums hidden lg:table-cell font-medium ${
                            balance > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {formatCurrency(balance)}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tc("pagination.page", { page, totalPages })}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3 tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
