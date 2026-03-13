"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ClipboardList, RefreshCw, Stethoscope, Users } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type QueueAppointment = {
  id: string;
  appointmentCode: string;
  type: string;
  status: string;
  estimatedWaitMinutes?: number;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    patientCode: string;
  };
};

type DoctorQueue = {
  doctor: { id: string; firstName: string; lastName: string };
  department: { id: string; name: string } | null;
  inProgress: QueueAppointment | null;
  waiting: QueueAppointment[];
  totalWaiting: number;
};

type QueueResponse = {
  data: {
    queue: DoctorQueue[];
    generatedAt: string;
  };
};

export default function QueueDashboardPage() {
  const { authFetch } = useAuth();

  const [queue, setQueue] = useState<DoctorQueue[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const departments = Array.from(
    new Map(
      queue.filter((d) => d.department).map((d) => [d.department!.id, d.department!]),
    ).values(),
  );

  const fetchQueue = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (departmentFilter !== "all") params.set("departmentId", departmentFilter);
      const url = `/api/v1/appointments/queue${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await authFetch(url);
      if (res.ok) {
        const body: QueueResponse = await res.json();
        setQueue(body.data.queue);
        setGeneratedAt(body.data.generatedAt);
      }
    } catch (error) {
      console.error("Failed to fetch queue:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authFetch, departmentFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    intervalRef.current = setInterval(() => fetchQueue(), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchQueue]);

  const filteredQueue =
    departmentFilter === "all" ? queue : queue.filter((d) => d.department?.id === departmentFilter);

  const totalWaiting = filteredQueue.reduce((sum, d) => sum + d.totalWaiting, 0);
  const totalInProgress = filteredQueue.filter((d) => d.inProgress).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queue Dashboard</h1>
          <div className="flex items-center gap-3 mt-1">
            {generatedAt && (
              <p className="text-sm text-muted-foreground">
                Updated{" "}
                {new Date(generatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            )}
            <span className="text-muted-foreground/30">|</span>
            <p className="text-sm text-muted-foreground">Auto-refreshes every 30s</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchQueue(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && (
        <div className="grid gap-3 grid-cols-3 max-w-md">
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold">{filteredQueue.length}</p>
            <p className="text-xs text-muted-foreground">Doctors</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalInProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalWaiting}</p>
            <p className="text-xs text-muted-foreground">Waiting</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="font-medium text-muted-foreground">No doctors in queue</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            The queue will populate when appointments are scheduled for today
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredQueue.map((item) => (
            <Card key={item.doctor.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-sm font-semibold flex-shrink-0">
                    {item.doctor.firstName[0]}{item.doctor.lastName[0]}
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Dr. {item.doctor.firstName} {item.doctor.lastName}
                    </CardTitle>
                    {item.department && (
                      <p className="text-xs text-muted-foreground">{item.department.name}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Currently seeing */}
                {item.inProgress && (
                  <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                      Currently Seeing
                    </p>
                    <p className="text-sm font-medium">
                      {item.inProgress.patient.firstName} {item.inProgress.patient.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {item.inProgress.appointmentCode}
                    </p>
                    {item.inProgress.type === "emergency" && (
                      <Badge variant="destructive" className="mt-1.5 text-[10px]">
                        Emergency
                      </Badge>
                    )}
                  </div>
                )}

                {/* Waiting list */}
                {item.waiting.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Waiting ({item.totalWaiting})
                      </p>
                    </div>
                    <div className="space-y-1">
                      {item.waiting.map((apt, idx) => (
                        <div
                          key={apt.id}
                          className="flex items-center justify-between text-sm py-1.5 px-2.5 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono text-xs w-5 text-right">
                              {idx + 1}.
                            </span>
                            <span className="text-sm">
                              {apt.patient.firstName} {apt.patient.lastName}
                            </span>
                            {apt.type === "emergency" && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                                Emergency
                              </Badge>
                            )}
                          </div>
                          {apt.estimatedWaitMinutes !== undefined && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              ~{apt.estimatedWaitMinutes}m
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : !item.inProgress ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground/70">No patients in queue</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
