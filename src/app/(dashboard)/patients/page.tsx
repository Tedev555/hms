"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  const t = useTranslations("patients.list");
  const tc = useTranslations("common");
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {meta.total} {meta.total !== 1 ? tc("nav.patients").toLowerCase() : tc("nav.patients").toLowerCase()}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => router.push("/patients/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("registerPatient")}
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("gender")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("dateOfBirth")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell
                        key={j}
                        className={
                          j >= 3 ? "hidden md:table-cell" : j >= 2 ? "hidden sm:table-cell" : ""
                        }
                      >
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : patients.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-48">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="font-medium text-muted-foreground">{t("empty")}</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        {search ? t("emptySearch") : t("emptyAction")}
                      </p>
                      {canCreate && !search && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => router.push("/patients/new")}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {t("registerPatient")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer transition-colors"
                    onClick={() => router.push(`/patients/${patient.id}`)}
                  >
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {patient.patientCode}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize hidden sm:table-cell">
                      {patient.gender}
                    </TableCell>
                    <TableCell>{patient.phone}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {new Date(patient.dateOfBirth).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!loading && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {tc("pagination.showing", {
              start: (meta.page - 1) * meta.limit + 1,
              end: Math.min(meta.page * meta.limit, meta.total),
              total: meta.total,
            })}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={meta.page <= 1}
              onClick={() => fetchPatients(meta.page - 1, search || undefined)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3 tabular-nums">
              {meta.page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={meta.page >= meta.totalPages}
              onClick={() => fetchPatients(meta.page + 1, search || undefined)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
