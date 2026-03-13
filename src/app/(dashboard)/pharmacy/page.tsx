"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Pill,
  AlertTriangle,
  Clock,
  Package,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";

type DashboardStats = {
  totalDrugs: number;
  lowStockCount: number;
  expiringCount: number;
  pendingPrescriptions: number;
};

export default function PharmacyDashboardPage() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [drugsRes, lowStockRes, expiringRes, prescriptionsRes] = await Promise.all([
        authFetch("/api/v1/drugs?limit=1"),
        authFetch("/api/v1/drugs/low-stock?limit=1"),
        authFetch("/api/v1/drugs/expiring?limit=1&days=90"),
        authFetch("/api/v1/prescriptions?status=pending&limit=1"),
      ]);

      const [drugsData, lowStockData, expiringData, prescriptionsData] = await Promise.all([
        drugsRes.ok ? drugsRes.json() : null,
        lowStockRes.ok ? lowStockRes.json() : null,
        expiringRes.ok ? expiringRes.json() : null,
        prescriptionsRes.ok ? prescriptionsRes.json() : null,
      ]);

      setStats({
        totalDrugs: drugsData?.meta?.total || 0,
        lowStockCount: lowStockData?.meta?.total || 0,
        expiringCount: expiringData?.meta?.total || 0,
        pendingPrescriptions: prescriptionsData?.meta?.total || 0,
      });
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const cards = [
    {
      title: "Total Drugs",
      value: stats?.totalDrugs ?? 0,
      icon: Pill,
      href: "/pharmacy/drugs",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Low Stock Alerts",
      value: stats?.lowStockCount ?? 0,
      icon: AlertTriangle,
      href: "/pharmacy/reports/low-stock",
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
    {
      title: "Expiring Batches",
      value: stats?.expiringCount ?? 0,
      icon: Clock,
      href: "/pharmacy/reports/expiring",
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
    {
      title: "Pending Prescriptions",
      value: stats?.pendingPrescriptions ?? 0,
      icon: Package,
      href: "/pharmacy/prescriptions?status=pending",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pharmacy</h1>
        <p className="text-muted-foreground mt-1">
          Drug catalogue, prescriptions, and inventory management
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{card.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Drug Catalogue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View and manage the drug catalogue, add new drugs, and track stock levels.
            </p>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/pharmacy/drugs">
                View Drugs <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View pending and recent prescriptions, and dispense medications.
            </p>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/pharmacy/prescriptions">
                View Prescriptions <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Low stock alerts, expiring batch reports, and inventory analysis.
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/pharmacy/reports/low-stock">Low Stock</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/pharmacy/reports/expiring">Expiring</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
