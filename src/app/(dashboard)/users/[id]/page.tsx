"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Building2,
  Shield,
  Clock,
  KeyRound,
  UserCheck,
  UserX,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

type StaffUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  phone: string | null;
  department: { id: string; name: string } | null;
  lastLoginAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; firstName: string; lastName: string } | null;
  recentActivity: {
    id: string;
    action: string;
    oldData: unknown;
    newData: unknown;
    createdAt: string;
    user: { firstName: string; lastName: string } | null;
  }[];
};

const roleLabels: Record<string, string> = {
  doctor: "Doctor",
  nurse: "Nurse",
  paramedic: "Paramedic",
  receptionist: "Receptionist",
  admin: "Administrator",
  lab_tech: "Lab Technician",
  pharmacist: "Pharmacist",
  director: "Director",
};

const roleBadgeColors: Record<string, string> = {
  director:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  admin:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  doctor:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  nurse:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
};

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { authFetch, user: currentUser } = useAuth();
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const isAdminOrDirector = currentUser && ["admin", "director"].includes(currentUser.role);
  const isLocked = staffUser?.lockedUntil && new Date(staffUser.lockedUntil) > new Date();

  const fetchUser = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/users/${id}`);
      if (res.ok) {
        const body = await res.json();
        setStaffUser(body.data);
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  async function handleResetPassword() {
    if (!newPassword) return;
    try {
      const res = await authFetch(`/api/v1/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        toast.success("Password reset successfully");
        setResetDialogOpen(false);
        setNewPassword("");
      } else {
        const body = await res.json();
        if (body.errors?.newPassword) {
          toast.error(body.errors.newPassword[0]);
        } else {
          toast.error(body.message || "Failed to reset password");
        }
      }
    } catch {
      toast.error("An unexpected error occurred");
    }
  }

  async function handleToggleStatus() {
    if (!staffUser) return;
    try {
      const res = await authFetch(`/api/v1/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !staffUser.isActive }),
      });
      if (res.ok) {
        toast.success(staffUser.isActive ? "Account deactivated" : "Account reactivated");
        setStatusDialogOpen(false);
        fetchUser();
      } else {
        const body = await res.json();
        toast.error(body.message || "Failed to update status");
      }
    } catch {
      toast.error("An unexpected error occurred");
    }
  }

  async function handleUnlock() {
    try {
      const res = await authFetch(`/api/v1/users/${id}/unlock`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Account unlocked successfully");
        fetchUser();
      } else {
        const body = await res.json();
        toast.error(body.message || "Failed to unlock account");
      }
    } catch {
      toast.error("An unexpected error occurred");
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

  if (!staffUser) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <User className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-muted-foreground">User not found</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/users")}>
          Back to Staff Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2 text-muted-foreground"
        onClick={() => router.push("/users")}
      >
        <ArrowLeft className="h-4 w-4" />
        Staff Directory
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xl font-semibold flex-shrink-0">
            {staffUser.firstName[0]?.toUpperCase()}
            {staffUser.lastName[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {staffUser.firstName} {staffUser.lastName}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground font-mono">@{staffUser.username}</span>
              <Badge variant="outline" className={roleBadgeColors[staffUser.role] || ""}>
                {roleLabels[staffUser.role] || staffUser.role}
              </Badge>
              {staffUser.isActive ? (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                >
                  Active
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
                >
                  Inactive
                </Badge>
              )}
              {isLocked && <Badge variant="destructive">Locked</Badge>}
            </div>
          </div>
        </div>
        {isAdminOrDirector && (
          <Button
            variant="outline"
            onClick={() => router.push(`/users/${id}/edit`)}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <InfoItem icon={User} label="First Name" value={staffUser.firstName} />
              <InfoItem icon={User} label="Last Name" value={staffUser.lastName} />
              <InfoItem icon={Mail} label="Email" value={staffUser.email} />
              <InfoItem icon={Phone} label="Phone" value={staffUser.phone || "—"} />
              <InfoItem
                icon={Shield}
                label="Role"
                value={roleLabels[staffUser.role] || staffUser.role}
              />
              <InfoItem
                icon={Building2}
                label="Department"
                value={staffUser.department?.name || "—"}
              />
              <InfoItem
                icon={Clock}
                label="Last Login"
                value={
                  staffUser.lastLoginAt ? new Date(staffUser.lastLoginAt).toLocaleString() : "Never"
                }
              />
              <InfoItem
                icon={Clock}
                label="Account Created"
                value={new Date(staffUser.createdAt).toLocaleDateString()}
              />
            </div>

            {staffUser.createdBy && (
              <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                Created by {staffUser.createdBy.firstName} {staffUser.createdBy.lastName}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions */}
        {isAdminOrDirector && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Reset Password */}
              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <KeyRound className="h-4 w-4" />
                    Reset Password
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                      Set a new password for {staffUser.firstName} {staffUser.lastName}. They should
                      change it on next login.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                      <p className="text-xs text-muted-foreground">
                        Min 10 chars, uppercase, lowercase, number, and special character
                      </p>
                    </div>
                    <Button onClick={handleResetPassword} className="w-full">
                      Reset Password
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Unlock Account */}
              {isLocked && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleUnlock}
                >
                  <Unlock className="h-4 w-4" />
                  Unlock Account
                </Button>
              )}

              <Separator />

              {/* Activate/Deactivate */}
              {currentUser?.id !== staffUser.id && (
                <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                  <DialogTrigger asChild>
                    {staffUser.isActive ? (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        <UserX className="h-4 w-4" />
                        Deactivate Account
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                      >
                        <UserCheck className="h-4 w-4" />
                        Reactivate Account
                      </Button>
                    )}
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {staffUser.isActive ? "Deactivate" : "Reactivate"} Account
                      </DialogTitle>
                      <DialogDescription>
                        {staffUser.isActive
                          ? `Are you sure you want to deactivate ${staffUser.firstName} ${staffUser.lastName}'s account? They will no longer be able to log in.`
                          : `Are you sure you want to reactivate ${staffUser.firstName} ${staffUser.lastName}'s account? They will be able to log in again.`}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant={staffUser.isActive ? "destructive" : "default"}
                        onClick={handleToggleStatus}
                      >
                        {staffUser.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      {isAdminOrDirector && staffUser.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staffUser.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{formatAction(activity.action)}</p>
                    {activity.user && (
                      <p className="text-xs text-muted-foreground">
                        by {activity.user.firstName} {activity.user.lastName}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-md bg-muted p-2 mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    CREATE_USER: "Account created",
    UPDATE_USER: "Profile updated",
    UPDATE_OWN_PROFILE: "Profile self-updated",
    DEACTIVATE_USER: "Account deactivated",
    REACTIVATE_USER: "Account reactivated",
    RESET_PASSWORD: "Password reset",
    UNLOCK_ACCOUNT: "Account unlocked",
    LOGIN_SUCCESS: "Logged in",
    LOGIN_FAILED: "Failed login attempt",
  };
  return labels[action] || action;
}
