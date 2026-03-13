"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

type Patient = {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string | null;
  nationalId: string | null;
  address: string | null;
  bloodGroup: string | null;
  allergies: string[] | null;
  createdAt: string;
  emergencyContacts: { id: string; name: string; relationship: string; phone: string }[];
  medicalHistory: {
    id: string;
    condition: string;
    description: string | null;
    diagnosedAt: string | null;
    isActive: boolean;
    createdAt: string;
  }[];
  documents: {
    id: string;
    title: string;
    fileType: string;
    createdAt: string;
  }[];
  createdBy: { id: string; firstName: string; lastName: string } | null;
};

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { authFetch } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  // Emergency contact dialog state
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactRelationship, setContactRelationship] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const fetchPatient = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/patients/${id}`);
      if (res.ok) {
        const body = await res.json();
        setPatient(body.data);
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  async function handleAddContact() {
    if (!contactName || !contactRelationship || !contactPhone) return;
    try {
      const res = await authFetch(`/api/v1/patients/${id}/emergency-contacts`, {
        method: "POST",
        body: JSON.stringify({
          name: contactName,
          relationship: contactRelationship,
          phone: contactPhone,
        }),
      });
      if (res.ok) {
        toast.success("Emergency contact added");
        setContactDialogOpen(false);
        setContactName("");
        setContactRelationship("");
        setContactPhone("");
        fetchPatient();
      } else {
        const body = await res.json();
        toast.error(body.message || "Failed to add contact");
      }
    } catch {
      toast.error("An unexpected error occurred");
    }
  }

  async function handleDeleteContact(contactId: string) {
    try {
      const res = await authFetch(`/api/v1/patients/${id}/emergency-contacts/${contactId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Contact removed");
        fetchPatient();
      }
    } catch {
      toast.error("Failed to remove contact");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!patient) {
    return <p className="text-muted-foreground">Patient not found.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {patient.patientCode} &middot; Registered{" "}
            {new Date(patient.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/patients/${id}/edit`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Allergies Alert */}
      {patient.allergies && patient.allergies.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <span className="text-sm font-medium">Allergies:</span>
          {patient.allergies.map((allergy) => (
            <Badge key={allergy} variant="destructive">
              {allergy}
            </Badge>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="demographics">
        <TabsList>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="history">Medical History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="contacts">Emergency Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="demographics">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">First Name</p>
                  <p className="font-medium">{patient.firstName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Name</p>
                  <p className="font-medium">{patient.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{patient.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {new Date(patient.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{patient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{patient.email || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">National ID</p>
                  <p className="font-medium">{patient.nationalId || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Blood Group</p>
                  <p className="font-medium">{patient.bloodGroup || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{patient.address || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            {patient.medicalHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No medical history recorded.</p>
            ) : (
              patient.medicalHistory.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{entry.condition}</p>
                        {entry.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {entry.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={entry.isActive ? "default" : "secondary"}>
                          {entry.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {entry.diagnosedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Diagnosed: {new Date(entry.diagnosedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="space-y-4">
            {patient.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
            ) : (
              patient.documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center justify-between pt-6">
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">{doc.fileType}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <div className="space-y-4">
            <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Add Contact</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Emergency Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Input
                      value={contactRelationship}
                      onChange={(e) => setContactRelationship(e.target.value)}
                      placeholder="e.g. Spouse, Parent"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                  <Button onClick={handleAddContact}>Add Contact</Button>
                </div>
              </DialogContent>
            </Dialog>

            {patient.emergencyContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emergency contacts.</p>
            ) : (
              patient.emergencyContacts.map((contact) => (
                <Card key={contact.id}>
                  <CardContent className="flex items-center justify-between pt-6">
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {contact.relationship} &middot; {contact.phone}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDeleteContact(contact.id)}
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
