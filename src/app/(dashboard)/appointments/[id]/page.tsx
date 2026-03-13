"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Timer,
  Stethoscope,
  User,
  Phone,
  Droplets,
  Building2,
  AlertTriangle,
  FileText,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { ApiResponse } from "@/types";

type AppointmentDetail = {
  id: string;
  appointmentCode: string;
  scheduledAt: string;
  duration: number;
  type: string;
  status: string;
  chiefComplaint: string | null;
  notes: string | null;
  cancelReason: string | null;
  patient: {
    id: string;
    patientCode: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    bloodGroup: string | null;
    allergies: string[];
  };
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    department: { id: string; name: string } | null;
  };
  department: { id: string; name: string } | null;
};

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

function getStatusBadge(status: string) {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const style = statusStyles[status] || "";
  return (
    <Badge variant="outline" className={`${style} text-sm px-3 py-1`}>
      {label}
    </Badge>
  );
}

function getTypeBadge(type: string) {
  const label = type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (type === "emergency") {
    return (
      <Badge variant="destructive" className="text-sm px-3 py-1">
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-sm px-3 py-1">
      {label}
    </Badge>
  );
}

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { authFetch, user } = useAuth();
  const router = useRouter();

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const fetchAppointment = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/appointments/${id}`);
      if (res.ok) {
        const body: ApiResponse<AppointmentDetail> = await res.json();
        setAppointment(body.data);
      } else {
        toast.error("Appointment not found");
        router.push("/appointments");
      }
    } catch (error) {
      console.error("Failed to fetch appointment:", error);
    } finally {
      setLoading(false);
    }
  }, [authFetch, id, router]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  const updateStatus = async (status: string, extra?: Record<string, string>) => {
    setActionLoading(true);
    try {
      const body: Record<string, string> = { status, ...extra };
      const res = await authFetch(`/api/v1/appointments/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(`Appointment ${status.replace(/_/g, " ")}`);
        fetchAppointment();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Status update error:", error);
      toast.error("Failed to update status");
    } finally {
      setActionLoading(false);
      setCancelReason("");
    }
  };

  const canPerformAction = (action: string): boolean => {
    if (!user) return false;
    const role = user.role;
    switch (action) {
      case "confirmed":
        return role === "receptionist" || role === "admin";
      case "checked_in":
        return role === "receptionist" || role === "admin" || role === "nurse";
      case "cancelled":
        return role === "receptionist" || role === "admin";
      case "no_show":
        return role === "receptionist" || role === "admin";
      case "in_progress":
        return role === "doctor" || role === "admin";
      case "completed":
        return role === "doctor" || role === "admin";
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!appointment) return null;

  const status = appointment.status;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2 text-muted-foreground"
        onClick={() => router.push("/appointments")}
      >
        <ArrowLeft className="h-4 w-4" />
        Appointments
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{appointment.appointmentCode}</h1>
            {getStatusBadge(status)}
            {getTypeBadge(appointment.type)}
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(appointment.scheduledAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {status === "scheduled" && canPerformAction("confirmed") && (
            <Button size="sm" onClick={() => updateStatus("confirmed")} disabled={actionLoading}>
              Confirm
            </Button>
          )}

          {(status === "scheduled" || status === "confirmed") && canPerformAction("no_show") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus("no_show")}
              disabled={actionLoading}
            >
              Mark No-Show
            </Button>
          )}

          {status === "confirmed" && canPerformAction("checked_in") && (
            <Button size="sm" onClick={() => updateStatus("checked_in")} disabled={actionLoading}>
              Check In
            </Button>
          )}

          {status === "checked_in" && canPerformAction("in_progress") && (
            <Button size="sm" onClick={() => updateStatus("in_progress")} disabled={actionLoading}>
              Start Consultation
            </Button>
          )}

          {status === "in_progress" && canPerformAction("completed") && (
            <Button size="sm" onClick={() => updateStatus("completed")} disabled={actionLoading}>
              Complete
            </Button>
          )}

          {status === "completed" && (
            <Button size="sm" variant="outline" asChild className="gap-2">
              <Link href={`/billing/new?appointmentId=${id}`}>
                <FileText className="h-4 w-4" />
                Generate Invoice
              </Link>
            </Button>
          )}

          {["scheduled", "confirmed", "checked_in"].includes(status) &&
            canPerformAction("cancelled") && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={actionLoading}>
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Please provide a reason for cancellation.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    placeholder="Cancellation reason (required)"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setCancelReason("")}>
                      Go Back
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={!cancelReason.trim()}
                      onClick={() => updateStatus("cancelled", { cancelReason })}
                    >
                      Confirm Cancellation
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
        </div>
      </div>

      {/* Allergies Alert */}
      {appointment.patient.allergies && appointment.patient.allergies.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 dark:text-red-400" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-red-700 dark:text-red-300">
              Patient Allergies:
            </span>
            {appointment.patient.allergies.map((allergy) => (
              <Badge key={allergy} variant="destructive" className="text-xs">
                {allergy}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Patient Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-sm font-semibold">
                {appointment.patient.firstName[0]}
                {appointment.patient.lastName[0]}
              </div>
              <div>
                <p className="font-medium">
                  {appointment.patient.firstName} {appointment.patient.lastName}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {appointment.patient.patientCode}
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm pt-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>Phone</span>
              </div>
              <span>{appointment.patient.phone}</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Gender</span>
              </div>
              <span className="capitalize">{appointment.patient.gender}</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>DOB</span>
              </div>
              <span>{new Date(appointment.patient.dateOfBirth).toLocaleDateString()}</span>
              {appointment.patient.bloodGroup && (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Droplets className="h-3.5 w-3.5" />
                    <span>Blood</span>
                  </div>
                  <span>{appointment.patient.bloodGroup}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Doctor Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              Doctor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-sm font-semibold">
                {appointment.doctor.firstName[0]}
                {appointment.doctor.lastName[0]}
              </div>
              <div>
                <p className="font-medium">
                  Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {appointment.doctor.department?.name || appointment.department?.name || "N/A"}
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm pt-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>Department</span>
              </div>
              <span>
                {appointment.doctor.department?.name || appointment.department?.name || "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Schedule Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">
                  {new Date(appointment.scheduledAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-medium">
                  {new Date(appointment.scheduledAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-medium">{appointment.duration} min</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-medium capitalize">
                  {appointment.type.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {(appointment.chiefComplaint || appointment.notes || appointment.cancelReason) && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointment.chiefComplaint && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Chief Complaint
                </p>
                <p className="text-sm">{appointment.chiefComplaint}</p>
              </div>
            )}
            {appointment.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Additional Notes
                </p>
                <p className="text-sm">{appointment.notes}</p>
              </div>
            )}
            {appointment.cancelReason && (
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                  Cancellation Reason
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">{appointment.cancelReason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
