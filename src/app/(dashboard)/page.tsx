"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  CalendarDays,
  BedDouble,
  FlaskConical,
  Plus,
  ArrowRight,
  UserPlus,
  ClipboardList,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

type DashboardStats = {
  totalPatients: number;
  appointmentsToday: number;
  bedOccupancy: string;
  pendingLabResults: number;
};

const statConfig = [
  {
    key: "totalPatients" as const,
    title: "Total Patients",
    description: "Registered patients",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950",
  },
  {
    key: "appointmentsToday" as const,
    title: "Appointments Today",
    description: "Scheduled for today",
    icon: CalendarDays,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950",
  },
  {
    key: "bedOccupancy" as const,
    title: "Bed Occupancy",
    description: "Current occupancy rate",
    icon: BedDouble,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950",
  },
  {
    key: "pendingLabResults" as const,
    title: "Pending Lab Results",
    description: "Awaiting processing",
    icon: FlaskConical,
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950",
  },
];

const quickActions = [
  {
    label: "Register Patient",
    href: "/patients/new",
    icon: UserPlus,
    description: "Add a new patient record",
    roles: ["receptionist", "admin"],
  },
  {
    label: "Book Appointment",
    href: "/appointments/new",
    icon: CalendarDays,
    description: "Schedule a new appointment",
    roles: ["receptionist", "admin", "doctor", "nurse"],
  },
  {
    label: "View Queue",
    href: "/appointments/queue",
    icon: ClipboardList,
    description: "Check today's appointment queue",
    roles: ["receptionist", "admin", "doctor", "nurse", "paramedic"],
  },
  {
    label: "Create Invoice",
    href: "/billing/new",
    icon: Receipt,
    description: "Generate a new invoice",
    roles: ["receptionist", "admin"],
  },
];

export default function DashboardPage() {
  const { authFetch, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [patientsRes, appointmentsRes] = await Promise.allSettled([
        authFetch("/api/v1/patients?limit=1"),
        authFetch("/api/v1/appointments?limit=1&date=" + new Date().toISOString().split("T")[0]),
      ]);

      const totalPatients =
        patientsRes.status === "fulfilled" && patientsRes.value.ok
          ? (await patientsRes.value.json()).meta?.total ?? 0
          : 0;

      const appointmentsToday =
        appointmentsRes.status === "fulfilled" && appointmentsRes.value.ok
          ? (await appointmentsRes.value.json()).meta?.total ?? 0
          : 0;

      setStats({
        totalPatients,
        appointmentsToday,
        bedOccupancy: "—",
        pendingLabResults: 0,
      });
    } catch {
      // Use fallback values
      setStats({
        totalPatients: 0,
        appointmentsToday: 0,
        bedOccupancy: "—",
        pendingLabResults: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const userActions = quickActions.filter(
    (action) => !user || action.roles.includes(user.role),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your hospital operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statConfig.map((stat) => (
          <Card key={stat.key} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold">
                  {stats ? stats[stat.key] : "—"}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      {userActions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {userActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Card className="group hover:border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer h-full dark:hover:border-blue-800">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="rounded-lg bg-blue-50 p-2.5 group-hover:bg-blue-100 transition-colors dark:bg-blue-950 dark:group-hover:bg-blue-900">
                      <action.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm group-hover:text-blue-700 transition-colors dark:group-hover:text-blue-300">
                        {action.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Placeholder */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Patients</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/patients" className="gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Navigate to Patients to view records
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Today&apos;s Appointments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/appointments" className="gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Navigate to Appointments to view schedule
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
