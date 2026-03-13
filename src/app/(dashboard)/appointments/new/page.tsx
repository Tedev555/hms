"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PatientResult = {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
};

type DoctorResult = {
  id: string;
  firstName: string;
  lastName: string;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
};

type SlotData = {
  startTime: string;
  endTime: string;
  available: boolean;
};

const STEPS = ["Select Patient", "Select Doctor", "Select Slot", "Details"];
const APPOINTMENT_TYPES = [
  { value: "opd", label: "OPD" },
  { value: "follow_up", label: "Follow Up" },
  { value: "emergency", label: "Emergency" },
  { value: "teleconsult", label: "Teleconsult" },
];

export default function NewAppointmentPage() {
  const { authFetch } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 - Patient
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);

  // Step 2 - Doctor
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctorResults, setDoctorResults] = useState<DoctorResult[]>([]);
  const [doctorSearching, setDoctorSearching] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResult | null>(null);

  // Step 3 - Slot
  const [slotDate, setSlotDate] = useState("");
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);

  // Step 4 - Details
  const [appointmentType, setAppointmentType] = useState("opd");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [notes, setNotes] = useState("");

  // Search patients
  const searchPatients = useCallback(
    async (query: string) => {
      if (query.length < 1) {
        setPatientResults([]);
        return;
      }
      setPatientSearching(true);
      try {
        const res = await authFetch(`/api/v1/patients/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const body = await res.json();
          setPatientResults(body.data);
        }
      } catch (error) {
        console.error("Patient search failed:", error);
      } finally {
        setPatientSearching(false);
      }
    },
    [authFetch],
  );

  // Search doctors (using /api/v1/users)
  const searchDoctors = useCallback(
    async (query: string) => {
      if (query.length < 1) {
        setDoctorResults([]);
        return;
      }
      setDoctorSearching(true);
      try {
        const res = await authFetch(
          `/api/v1/users?role=doctor&search=${encodeURIComponent(query)}`,
        );
        if (res.ok) {
          const body = await res.json();
          const users = body.data;
          // Filter to only doctors client-side if needed
          const doctors = Array.isArray(users)
            ? users.filter((u: DoctorResult & { role?: string }) => !u.role || u.role === "doctor")
            : [];
          setDoctorResults(doctors);
        }
      } catch (error) {
        console.error("Doctor search failed:", error);
      } finally {
        setDoctorSearching(false);
      }
    },
    [authFetch],
  );

  // Fetch slots
  const fetchSlots = useCallback(
    async (date: string) => {
      if (!selectedDoctor || !date) return;
      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        const res = await authFetch(
          `/api/v1/appointments/slots?doctorId=${selectedDoctor.id}&date=${date}`,
        );
        if (res.ok) {
          const body = await res.json();
          setSlots(body.data);
        }
      } catch (error) {
        console.error("Fetch slots failed:", error);
      } finally {
        setSlotsLoading(false);
      }
    },
    [authFetch, selectedDoctor],
  );

  // Submit appointment
  const handleSubmit = async () => {
    if (!selectedPatient || !selectedDoctor || !selectedSlot || !slotDate) return;

    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${slotDate}T${selectedSlot.startTime}`).toISOString();

      const body: Record<string, unknown> = {
        patientId: selectedPatient.id,
        doctorId: selectedDoctor.id,
        scheduledAt,
        duration: 15,
        type: appointmentType,
      };
      if (selectedDoctor.departmentId) {
        body.departmentId = selectedDoctor.departmentId;
      }
      if (chiefComplaint) body.chiefComplaint = chiefComplaint;
      if (notes) body.notes = notes;

      const res = await authFetch("/api/v1/appointments", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success("Appointment booked");
        router.push(`/appointments/${result.data.id}`);
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to book appointment");
      }
    } catch (error) {
      console.error("Book appointment error:", error);
      toast.error("Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 0:
        return !!selectedPatient;
      case 1:
        return !!selectedDoctor;
      case 2:
        return !!selectedSlot && !!slotDate;
      case 3:
        return !!appointmentType;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Book Appointment</h1>
        <p className="text-muted-foreground">Follow the steps to schedule a new appointment.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "text-sm hidden sm:inline",
                i === step ? "font-medium" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1 - Select Patient */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, phone, or patient code..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchPatients(patientSearch);
                }}
              />
              <Button onClick={() => searchPatients(patientSearch)} disabled={patientSearching}>
                {patientSearching ? "Searching..." : "Search"}
              </Button>
            </div>

            {patientSearching && (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}

            {!patientSearching && patientResults.length > 0 && (
              <div className="space-y-2">
                {patientResults.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={cn(
                      "p-3 rounded-md border cursor-pointer transition-colors",
                      selectedPatient?.id === patient.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {patient.patientCode} | {patient.phone} | {patient.gender} |{" "}
                          {new Date(patient.dateOfBirth).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedPatient?.id === patient.id && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedPatient && (
              <div className="p-3 rounded-md bg-muted/50 border">
                <p className="text-sm font-medium">Selected Patient</p>
                <p>
                  {selectedPatient.firstName} {selectedPatient.lastName} (
                  {selectedPatient.patientCode})
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2 - Select Doctor */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Doctor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search doctor by name..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchDoctors(doctorSearch);
                }}
              />
              <Button onClick={() => searchDoctors(doctorSearch)} disabled={doctorSearching}>
                {doctorSearching ? "Searching..." : "Search"}
              </Button>
            </div>

            {doctorSearching && (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}

            {!doctorSearching && doctorResults.length > 0 && (
              <div className="space-y-2">
                {doctorResults.map((doctor) => (
                  <div
                    key={doctor.id}
                    onClick={() => setSelectedDoctor(doctor)}
                    className={cn(
                      "p-3 rounded-md border cursor-pointer transition-colors",
                      selectedDoctor?.id === doctor.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          Dr. {doctor.firstName} {doctor.lastName}
                        </p>
                        {doctor.department && (
                          <p className="text-sm text-muted-foreground">{doctor.department.name}</p>
                        )}
                      </div>
                      {selectedDoctor?.id === doctor.id && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedDoctor && (
              <div className="p-3 rounded-md bg-muted/50 border">
                <p className="text-sm font-medium">Selected Doctor</p>
                <p>
                  Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                  {selectedDoctor.department && ` - ${selectedDoctor.department.name}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3 - Select Slot */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Time Slot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={slotDate}
                onChange={(e) => {
                  setSlotDate(e.target.value);
                  fetchSlots(e.target.value);
                }}
                min={new Date().toISOString().split("T")[0]}
                className="w-48 mt-1"
              />
            </div>

            {slotsLoading && (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}

            {!slotsLoading && slots.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Available Slots</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {slots.map((slot) => (
                    <Button
                      key={slot.startTime}
                      variant={
                        selectedSlot?.startTime === slot.startTime
                          ? "default"
                          : slot.available
                            ? "outline"
                            : "ghost"
                      }
                      size="sm"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        !slot.available && "opacity-40 line-through",
                        slot.available &&
                          selectedSlot?.startTime !== slot.startTime &&
                          "border-green-300 text-green-700 hover:bg-green-50",
                      )}
                    >
                      {slot.startTime} - {slot.endTime}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {!slotsLoading && slotDate && slots.length === 0 && (
              <p className="text-sm text-muted-foreground">No slots available for this date.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4 - Details */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Appointment Type</label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Chief Complaint</label>
              <Input
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Primary reason for visit"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                className="mt-1"
              />
            </div>

            {/* Summary */}
            <div className="rounded-md border p-4 space-y-2 bg-muted/30">
              <p className="font-medium">Booking Summary</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Patient:</span>
                <span>
                  {selectedPatient?.firstName} {selectedPatient?.lastName}
                </span>
                <span className="text-muted-foreground">Doctor:</span>
                <span>
                  Dr. {selectedDoctor?.firstName} {selectedDoctor?.lastName}
                </span>
                <span className="text-muted-foreground">Date:</span>
                <span>{slotDate ? new Date(slotDate).toLocaleDateString() : "-"}</span>
                <span className="text-muted-foreground">Time:</span>
                <span>
                  {selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : "-"}
                </span>
                <span className="text-muted-foreground">Type:</span>
                <span>{APPOINTMENT_TYPES.find((t) => t.value === appointmentType)?.label}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canGoNext()}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || !canGoNext()}>
            {submitting ? "Booking..." : "Book Appointment"}
          </Button>
        )}
      </div>
    </div>
  );
}
