"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked In" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "opd", label: "OPD" },
  { value: "follow_up", label: "Follow Up" },
  { value: "emergency", label: "Emergency" },
  { value: "teleconsult", label: "Teleconsult" },
];

function getStatusBadge(status: string) {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  switch (status) {
    case "scheduled":
      return <Badge variant="default">{label}</Badge>;
    case "confirmed":
      return <Badge variant="secondary">{label}</Badge>;
    case "checked_in":
      return <Badge variant="outline">{label}</Badge>;
    case "in_progress":
      return <Badge variant="default" className="bg-blue-600 hover:bg-blue-500">{label}</Badge>;
    case "completed":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">{label}</Badge>;
    case "cancelled":
      return <Badge variant="destructive">{label}</Badge>;
    case "no_show":
      return <Badge variant="destructive">{label}</Badge>;
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
}

function getTypeBadge(type: string) {
  const label = type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (type === "emergency") {
    return <Badge variant="destructive">{label}</Badge>;
  }
  return <Badge variant="outline">{label}</Badge>;
}

export default function AppointmentsPage() {
  const { authFetch } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filters
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [dateFilter, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            {total} appointment{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button asChild>
          <Link href="/appointments/new">Book Appointment</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-44"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(dateFilter || statusFilter !== "all" || typeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFilter("");
              setStatusFilter("all");
              setTypeFilter("all");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((apt) => (
                  <TableRow
                    key={apt.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/appointments/${apt.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{apt.appointmentCode}</TableCell>
                    <TableCell>
                      {apt.patient.firstName} {apt.patient.lastName}
                    </TableCell>
                    <TableCell>
                      Dr. {apt.doctor.firstName} {apt.doctor.lastName}
                    </TableCell>
                    <TableCell>
                      {new Date(apt.scheduledAt).toLocaleDateString()}{" "}
                      {new Date(apt.scheduledAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{getTypeBadge(apt.type)}</TableCell>
                    <TableCell>{getStatusBadge(apt.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
