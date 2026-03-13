"use client";

import { useEffect, useState, useCallback, useRef } from "react";

import { useAuth } from "@/contexts/auth-context";
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
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Collect unique departments from queue data
  const departments = Array.from(
    new Map(
      queue.filter((d) => d.department).map((d) => [d.department!.id, d.department!]),
    ).values(),
  );

  const fetchQueue = useCallback(async () => {
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
    }
  }, [authFetch, departmentFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(fetchQueue, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchQueue]);

  const filteredQueue =
    departmentFilter === "all" ? queue : queue.filter((d) => d.department?.id === departmentFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queue Dashboard</h1>
          {generatedAt && (
            <p className="text-sm text-muted-foreground">
              Last updated:{" "}
              {new Date(generatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}
        </div>
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
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No doctors in queue.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredQueue.map((item) => (
            <Card key={item.doctor.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Dr. {item.doctor.firstName} {item.doctor.lastName}
                </CardTitle>
                {item.department && (
                  <p className="text-sm text-muted-foreground">{item.department.name}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Currently seeing */}
                {item.inProgress && (
                  <div className="rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                      Currently Seeing
                    </p>
                    <p className="text-sm font-medium">
                      {item.inProgress.patient.firstName} {item.inProgress.patient.lastName}
                      <span className="text-muted-foreground ml-1">
                        ({item.inProgress.appointmentCode})
                      </span>
                    </p>
                    {item.inProgress.type === "emergency" && (
                      <Badge variant="destructive" className="mt-1">
                        Emergency
                      </Badge>
                    )}
                  </div>
                )}

                {/* Waiting list */}
                {item.waiting.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Waiting ({item.totalWaiting})
                    </p>
                    <div className="space-y-1.5">
                      {item.waiting.map((apt, idx) => (
                        <div
                          key={apt.id}
                          className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/40"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono text-xs w-5">
                              {idx + 1}.
                            </span>
                            <span>
                              {apt.patient.firstName} {apt.patient.lastName}
                            </span>
                            {apt.type === "emergency" && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Emergency
                              </Badge>
                            )}
                          </div>
                          {apt.estimatedWaitMinutes !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              ~{apt.estimatedWaitMinutes} min
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : !item.inProgress ? (
                  <p className="text-sm text-muted-foreground">No patients in queue</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
