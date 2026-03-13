"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
      return (
        <Badge variant="default" className="bg-blue-600 hover:bg-blue-500">
          {label}
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
          {label}
        </Badge>
      );
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{appointment.appointmentCode}</h1>
            {getStatusBadge(status)}
            {getTypeBadge(appointment.type)}
          </div>
          <Button
            variant="link"
            className="p-0 h-auto"
            onClick={() => router.push("/appointments")}
          >
            Back to Appointments
          </Button>
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
            <Button size="sm" variant="outline" asChild>
              <Link href={`/billing/new?appointmentId=${id}`}>Generate Invoice</Link>
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Patient Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">
                {appointment.patient.firstName} {appointment.patient.lastName}
              </span>
              <span className="text-muted-foreground">Code</span>
              <span className="font-mono">{appointment.patient.patientCode}</span>
              <span className="text-muted-foreground">Phone</span>
              <span>{appointment.patient.phone}</span>
              <span className="text-muted-foreground">Gender</span>
              <span className="capitalize">{appointment.patient.gender}</span>
              <span className="text-muted-foreground">Date of Birth</span>
              <span>{new Date(appointment.patient.dateOfBirth).toLocaleDateString()}</span>
              {appointment.patient.bloodGroup && (
                <>
                  <span className="text-muted-foreground">Blood Group</span>
                  <span>{appointment.patient.bloodGroup}</span>
                </>
              )}
            </div>
            {appointment.patient.allergies && appointment.patient.allergies.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Allergies</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {appointment.patient.allergies.map((allergy) => (
                    <Badge key={allergy} variant="destructive">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Doctor Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Doctor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Doctor</span>
              <span className="font-medium">
                Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
              </span>
              <span className="text-muted-foreground">Department</span>
              <span>
                {appointment.doctor.department?.name || appointment.department?.name || "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Date</span>
              <p className="font-medium">
                {new Date(appointment.scheduledAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Time</span>
              <p className="font-medium">
                {new Date(appointment.scheduledAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p className="font-medium">{appointment.duration} minutes</p>
            </div>
            <div>
              <span className="text-muted-foreground">Type</span>
              <p className="font-medium capitalize">{appointment.type.replace(/_/g, " ")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {(appointment.chiefComplaint || appointment.notes || appointment.cancelReason) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointment.chiefComplaint && (
              <div>
                <span className="text-sm text-muted-foreground">Chief Complaint</span>
                <p className="text-sm mt-1">{appointment.chiefComplaint}</p>
              </div>
            )}
            {appointment.notes && (
              <div>
                <span className="text-sm text-muted-foreground">Notes</span>
                <p className="text-sm mt-1">{appointment.notes}</p>
              </div>
            )}
            {appointment.cancelReason && (
              <div>
                <span className="text-sm text-muted-foreground">Cancel Reason</span>
                <p className="text-sm mt-1 text-destructive">{appointment.cancelReason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
