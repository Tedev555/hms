"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, Check, Shield, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string | null;
  isDispensed: boolean;
  drug: {
    id: string;
    genericName: string;
    brandName: string | null;
    formulation: string;
    strength: string | null;
    unit: string;
    currentStock: number;
    isControlled: boolean;
  };
};

type Prescription = {
  id: string;
  diagnosis: string | null;
  notes: string | null;
  createdAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    patientCode: string;
    allergies: string[] | null;
  };
  doctor: { id: string; firstName: string; lastName: string };
  items: PrescriptionItem[];
};

export default function PrescriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { authFetch, user } = useAuth();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispensing, setDispensing] = useState<string | null>(null);

  const isPharmacist = user?.role === "pharmacist";

  const fetchPrescription = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/prescriptions/${id}`);
      if (res.ok) {
        const body = await res.json();
        setPrescription(body.data);
      } else if (res.status === 404) {
        toast.error("Prescription not found");
        router.push("/pharmacy/prescriptions");
      }
    } catch {
      toast.error("Failed to load prescription");
    } finally {
      setLoading(false);
    }
  }, [authFetch, id, router]);

  useEffect(() => {
    fetchPrescription();
  }, [fetchPrescription]);

  async function handleDispense(itemId: string) {
    setDispensing(itemId);
    try {
      const res = await authFetch(`/api/v1/prescriptions/${id}/items/${itemId}/dispense`, {
        method: "PATCH",
        body: JSON.stringify({ confirm: true }),
      });

      if (res.ok) {
        toast.success("Item dispensed successfully");
        fetchPrescription();
      } else {
        const body = await res.json();
        toast.error(body.message || "Failed to dispense");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setDispensing(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!prescription) return null;

  const allDispensed = prescription.items.every((i) => i.isDispensed);
  const allergies = prescription.patient.allergies as string[] | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/pharmacy/prescriptions")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Prescription Detail</h1>
          <p className="text-muted-foreground">
            {new Date(prescription.createdAt).toLocaleDateString()} — Dr.{" "}
            {prescription.doctor.firstName} {prescription.doctor.lastName}
          </p>
        </div>
        {allDispensed && (
          <Badge className="bg-green-100 text-green-800 border-green-300 gap-1">
            <Check className="h-3 w-3" /> Fully Dispensed
          </Badge>
        )}
      </div>

      {/* Patient & Prescription Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">
              {prescription.patient.firstName} {prescription.patient.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{prescription.patient.patientCode}</p>
            {allergies && allergies.length > 0 && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700">Allergies</p>
                  <p className="text-sm text-red-600">{allergies.join(", ")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prescription Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {prescription.diagnosis && (
              <div>
                <p className="text-sm text-muted-foreground">Diagnosis</p>
                <p className="text-sm">{prescription.diagnosis}</p>
              </div>
            )}
            {prescription.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{prescription.notes}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="text-sm">
                {prescription.items.filter((i) => i.isDispensed).length} of{" "}
                {prescription.items.length} dispensed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Prescription Items */}
      <h2 className="text-xl font-semibold">Medications</h2>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Drug</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead className="hidden md:table-cell">Frequency</TableHead>
                <TableHead className="hidden lg:table-cell">Duration</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Stock</TableHead>
                <TableHead>Status</TableHead>
                {isPharmacist && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescription.items.map((item) => {
                const insufficientStock = item.drug.currentStock < item.quantity;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.drug.genericName}</span>
                        {item.drug.brandName && (
                          <span className="text-sm text-muted-foreground ml-1">
                            ({item.drug.brandName})
                          </span>
                        )}
                        {item.drug.strength && (
                          <span className="text-sm text-muted-foreground ml-1">
                            {item.drug.strength}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {item.drug.isControlled && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-red-50 text-red-700 border-red-200"
                          >
                            <Shield className="h-2 w-2 mr-1" /> Controlled
                          </Badge>
                        )}
                      </div>
                      {item.instructions && (
                        <p className="text-xs text-muted-foreground mt-1">{item.instructions}</p>
                      )}
                    </TableCell>
                    <TableCell>{item.dosage}</TableCell>
                    <TableCell className="hidden md:table-cell">{item.frequency}</TableCell>
                    <TableCell className="hidden lg:table-cell">{item.duration}</TableCell>
                    <TableCell className="text-center tabular-nums">
                      {item.quantity} {item.drug.unit}
                    </TableCell>
                    <TableCell className="text-center tabular-nums hidden sm:table-cell">
                      <span
                        className={
                          insufficientStock && !item.isDispensed ? "text-red-600 font-medium" : ""
                        }
                      >
                        {item.drug.currentStock}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.isDispensed ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 gap-1"
                        >
                          <Check className="h-3 w-3" /> Dispensed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    {isPharmacist && (
                      <TableCell className="text-right">
                        {!item.isDispensed && (
                          <Button
                            size="sm"
                            disabled={dispensing === item.id || insufficientStock}
                            onClick={() => handleDispense(item.id)}
                            className="gap-1"
                          >
                            <Package className="h-3 w-3" />
                            {dispensing === item.id ? "..." : "Dispense"}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
