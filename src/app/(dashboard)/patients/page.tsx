"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";

type Patient = {
  id: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  gender: string;
  phone: string;
  dateOfBirth: string;
};

type Meta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function PatientsPage() {
  const router = useRouter();
  const { authFetch, user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchPatients = useCallback(
    async (page: number, query?: string) => {
      setLoading(true);
      try {
        const url = query
          ? `/api/v1/patients/search?q=${encodeURIComponent(query)}&page=${page}&limit=20`
          : `/api/v1/patients?page=${page}&limit=20`;
        const res = await authFetch(url);
        if (res.ok) {
          const body = await res.json();
          setPatients(body.data);
          setMeta(body.meta);
        }
      } catch {
        // Network error
      } finally {
        setLoading(false);
      }
    },
    [authFetch],
  );

  useEffect(() => {
    fetchPatients(1);
  }, [fetchPatients]);

  function handleSearch(value: string) {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      fetchPatients(1, value || undefined);
    }, 300);
    setSearchTimeout(timeout);
  }

  const canCreate = user && ["receptionist", "admin"].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Patients</h1>
        {canCreate && (
          <Button onClick={() => router.push("/patients/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Register Patient
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, code, phone, or national ID..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Date of Birth</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No patients found.
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow
                  key={patient.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/patients/${patient.id}`)}
                >
                  <TableCell className="font-mono text-sm">{patient.patientCode}</TableCell>
                  <TableCell className="font-medium">
                    {patient.firstName} {patient.lastName}
                  </TableCell>
                  <TableCell className="capitalize">{patient.gender}</TableCell>
                  <TableCell>{patient.phone}</TableCell>
                  <TableCell>{new Date(patient.dateOfBirth).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {patients.length} of {meta.total} patients
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => fetchPatients(meta.page - 1, search || undefined)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {meta.page} of {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => fetchPatients(meta.page + 1, search || undefined)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
