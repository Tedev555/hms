"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const invoiceFormSchema = z.object({
  patientId: z.string().uuid("Please select a patient"),
  appointmentId: z.string().uuid().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.number().int().min(1, "Min 1"),
        unitPrice: z.number().positive("Must be positive"),
      }),
    )
    .min(1, "At least one item is required"),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

type PatientSearchResult = {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
};

type AppointmentData = {
  id: string;
  appointmentCode: string;
  type: string;
  patient: { id: string; firstName: string; lastName: string; patientCode: string };
};

export default function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const { appointmentId } = use(searchParams);
  const { authFetch } = useAuth();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [loadingAppointment, setLoadingAppointment] = useState(!!appointmentId);

  // Patient search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      patientId: "",
      appointmentId: appointmentId || undefined,
      dueDate: today,
      notes: "",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");

  // Load appointment data if appointmentId is provided
  useEffect(() => {
    if (!appointmentId) return;
    async function loadAppointment() {
      try {
        const res = await authFetch(`/api/v1/appointments/${appointmentId}`);
        if (res.ok) {
          const body = await res.json();
          const apt: AppointmentData = body.data;
          form.setValue("patientId", apt.patient.id);
          form.setValue("appointmentId", apt.id);
          form.setValue("items", [
            { description: "Consultation Fee", quantity: 1, unitPrice: 500 },
          ]);
          setSelectedPatient({
            id: apt.patient.id,
            patientCode: apt.patient.patientCode,
            firstName: apt.patient.firstName,
            lastName: apt.patient.lastName,
          });
        }
      } catch (error) {
        console.error("Failed to load appointment:", error);
      } finally {
        setLoadingAppointment(false);
      }
    }
    loadAppointment();
  }, [appointmentId, authFetch, form]);

  // Patient search
  const searchPatients = useCallback(
    async (query: string) => {
      if (query.length < 1) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await authFetch(`/api/v1/patients/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const body = await res.json();
          setSearchResults(body.data);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Patient search failed:", error);
      } finally {
        setSearching(false);
      }
    },
    [authFetch],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchPatients(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPatients]);

  function selectPatient(patient: PatientSearchResult) {
    setSelectedPatient(patient);
    form.setValue("patientId", patient.id);
    setShowResults(false);
    setSearchQuery("");
  }

  // Calculate totals
  const subtotal = watchedItems.reduce((sum, item) => {
    const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return sum + rowTotal;
  }, 0);
  const total = Math.round(subtotal * 100) / 100;

  async function onSubmit(values: InvoiceFormValues) {
    setSubmitting(true);
    try {
      const res = await authFetch("/api/v1/invoices", {
        method: "POST",
        body: JSON.stringify({
          patientId: values.patientId,
          appointmentId: values.appointmentId || undefined,
          dueDate: values.dueDate,
          notes: values.notes || undefined,
          items: values.items.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        }),
      });

      if (res.ok) {
        const body = await res.json();
        toast.success("Invoice created");
        router.push(`/billing/${body.data.id}`);
      } else {
        const body = await res.json();
        toast.error(body.message || "Failed to create invoice");
      }
    } catch (error) {
      console.error("Failed to create invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingAppointment) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Invoice</h1>
        <p className="text-muted-foreground">Create a new invoice for a patient</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Patient</CardTitle>
            <CardDescription>Select the patient for this invoice</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedPatient.patientCode}</p>
                </div>
                {!appointmentId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(null);
                      form.setValue("patientId", "");
                    }}
                  >
                    Change
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Search patients by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowResults(true);
                  }}
                  onBlur={() => {
                    // Delay to allow click on result
                    setTimeout(() => setShowResults(false), 200);
                  }}
                />
                {searching && <p className="text-sm text-muted-foreground mt-1">Searching...</p>}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-60 overflow-auto">
                    {searchResults.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                        onClick={() => selectPatient(patient)}
                      >
                        <span className="font-medium">
                          {patient.firstName} {patient.lastName}
                        </span>
                        <span className="text-muted-foreground ml-2">{patient.patientCode}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showResults && searchResults.length === 0 && searchQuery && !searching && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg p-3">
                    <p className="text-sm text-muted-foreground">No patients found.</p>
                  </div>
                )}
              </div>
            )}
            {form.formState.errors.patientId && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.patientId.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
            <CardDescription>Add items to the invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const qty = Number(watchedItems[index]?.quantity) || 0;
              const price = Number(watchedItems[index]?.unitPrice) || 0;
              const rowTotal = Math.round(qty * price * 100) / 100;

              return (
                <div key={field.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Input
                      {...form.register(`items.${index}.description`)}
                      placeholder="Item description"
                    />
                    {form.formState.errors.items?.[index]?.description && (
                      <p className="text-xs text-destructive mt-0.5">
                        {form.formState.errors.items[index]?.description?.message}
                      </p>
                    )}
                  </div>
                  <div className="w-20">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="w-28">
                    <Label className="text-xs text-muted-foreground">Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <div className="h-9 flex items-center px-3 text-sm font-medium border rounded-md bg-muted">
                      {rowTotal.toFixed(2)}
                    </div>
                  </div>
                  <div className="pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
            >
              Add Item
            </Button>

            {form.formState.errors.items?.root && (
              <p className="text-sm text-destructive">{form.formState.errors.items.root.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Due Date & Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" {...form.register("dueDate")} className="w-44" />
              {form.formState.errors.dueDate && (
                <p className="text-sm text-destructive">{form.formState.errors.dueDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex justify-between w-48">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-48 border-t pt-1">
                <span className="font-medium">Total:</span>
                <span className="font-bold">{total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Invoice"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/billing")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
