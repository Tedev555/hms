"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";

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

type AppointmentRow = {
  id: string;
  appointmentCode: string;
  scheduledAt: string;
  duration: number;
  type: string;
  status: string;
  patient: { id: string; patientCode: string; firstName: string; lastName: string };
  doctor: { id: string; firstName: string; lastName: string };
  department: { id: string; name: string } | null;
};

const STATUS_KEYS = ["all", "scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"] as const;
const TYPE_KEYS = ["all", "opd", "follow_up", "emergency", "teleconsult"] as const;

const statusStyles: Record<string, string> = {
  scheduled:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  confirmed:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
  checked_in:
    "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800",
  in_progress:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800",
  completed:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  cancelled:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  no_show:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
};

export default function AppointmentsPage() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const t = useTranslations("appointments");
  const tc = useTranslations("common");

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const hasFilters = dateFilter || statusFilter !== "all" || typeFilter !== "all";

  function getStatusBadge(status: string) {
    const label = t(`status.${status}` as Parameters<typeof t>[0]);
    const style = statusStyles[status] || "";
    return (
      <Badge variant="outline" className={style}>
        {label}
      </Badge>
    );
  }

  function getTypeBadge(type: string) {
    const label = t(`type.${type}` as Parameters<typeof t>[0]);
    if (type === "emergency") {
      return <Badge variant="destructive">{label}</Badge>;
    }
    return <Badge variant="outline">{label}</Badge>;
  }

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (dateFilter) params.set("date", dateFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await authFetch(`/api/v1/appointments?${params.toString()}`);
      if (res.ok) {
        const body: PaginatedResponse<AppointmentRow> = await res.json();
        setAppointments(body.data);
        setTotalPages(body.meta.totalPages);
        setTotal(body.meta.total);
      }
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
    } finally {
      setLoading(false);
    }
  }, [authFetch, page, dateFilter, statusFilter, typeFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, statusFilter, typeFilter]);

  function clearFilters() {
    setDateFilter("");
    setStatusFilter("all");
    setTypeFilter("all");
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
          <Link href="/appointments/new">
            <CalendarDays className="h-4 w-4" />
            {t("list.bookAppointment")}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">{tc("filters.label")}</span>
        </div>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-44"
        />
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={tc("fields.type")} />
          </SelectTrigger>
          <SelectContent>
            {TYPE_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`type.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  <TableHead>{t("list.code")}</TableHead>
                  <TableHead>{t("list.patient")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("list.doctor")}</TableHead>
                  <TableHead>{t("list.dateTime")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("list.type")}</TableHead>
                  <TableHead>{t("list.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="h-48">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-muted p-4 mb-4">
                          <CalendarDays className="h-8 w-8 text-muted-foreground/50" />
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
                  appointments.map((apt) => (
                    <TableRow
                      key={apt.id}
                      className="cursor-pointer transition-colors"
                      onClick={() => router.push(`/appointments/${apt.id}`)}
                    >
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {apt.appointmentCode}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {apt.patient.firstName} {apt.patient.lastName}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        Dr. {apt.doctor.firstName} {apt.doctor.lastName}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {new Date(apt.scheduledAt).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(apt.scheduledAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {getTypeBadge(apt.type)}
                      </TableCell>
                      <TableCell>{getStatusBadge(apt.status)}</TableCell>
                    </TableRow>
                  ))
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
