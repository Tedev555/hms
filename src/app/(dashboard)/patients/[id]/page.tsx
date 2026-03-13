"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Droplets,
  AlertTriangle,
  Plus,
  Trash2,
  FileText,
  Heart,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <User className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-muted-foreground">Patient not found</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/patients")}
        >
          Back to Patients
        </Button>
      </div>
    );
  }

  const age = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2 text-muted-foreground"
        onClick={() => router.push("/patients")}
      >
        <ArrowLeft className="h-4 w-4" />
        Patients
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xl font-semibold flex-shrink-0">
            {patient.firstName[0]}
            {patient.lastName[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{patient.patientCode}</span>
              <span>&middot;</span>
              <span className="capitalize">{patient.gender}</span>
              <span>&middot;</span>
              <span>{age} years old</span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/patients/${id}/edit`)}
          className="gap-2"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Allergies Alert */}
      {patient.allergies && patient.allergies.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 dark:text-red-400" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-red-700 dark:text-red-300">Allergies:</span>
            {patient.allergies.map((allergy) => (
              <Badge key={allergy} variant="destructive" className="text-xs">
                {allergy}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="demographics">
        <TabsList>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="history">
            Medical History
            {patient.medicalHistory.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 text-xs">
                {patient.medicalHistory.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts
            {patient.emergencyContacts.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 text-xs">
                {patient.emergencyContacts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demographics">
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <InfoItem icon={User} label="First Name" value={patient.firstName} />
                <InfoItem icon={User} label="Last Name" value={patient.lastName} />
                <InfoItem icon={User} label="Gender" value={patient.gender} capitalize />
                <InfoItem
                  icon={User}
                  label="Date of Birth"
                  value={new Date(patient.dateOfBirth).toLocaleDateString()}
                />
                <InfoItem icon={Phone} label="Phone" value={patient.phone} />
                <InfoItem icon={Mail} label="Email" value={patient.email || "—"} />
                <InfoItem icon={Shield} label="National ID" value={patient.nationalId || "—"} />
                <InfoItem icon={Droplets} label="Blood Group" value={patient.bloodGroup || "—"} />
                <InfoItem icon={MapPin} label="Address" value={patient.address || "—"} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-3">
            {patient.medicalHistory.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <Heart className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No medical history recorded</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              patient.medicalHistory.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="py-4 px-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium">{entry.condition}</p>
                        {entry.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={
                            entry.isActive
                              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                              : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700"
                          }
                        >
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
          <div className="space-y-3">
            {patient.documents.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <FileText className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No documents uploaded</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              patient.documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center justify-between py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.fileType}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <div className="space-y-3">
            <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Emergency Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Contact name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Input
                      value={contactRelationship}
                      onChange={(e) => setContactRelationship(e.target.value)}
                      placeholder="e.g. Spouse, Parent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                  <Button onClick={handleAddContact} className="w-full">
                    Add Contact
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {patient.emergencyContacts.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <Phone className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No emergency contacts added</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Add an emergency contact for this patient
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              patient.emergencyContacts.map((contact) => (
                <Card key={contact.id}>
                  <CardContent className="flex items-center justify-between py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {contact.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {contact.relationship} &middot; {contact.phone}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteContact(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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

function InfoItem({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-md bg-muted p-2 mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${capitalize ? "capitalize" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
