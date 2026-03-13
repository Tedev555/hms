"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { User, Phone, Mail, Building2, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/auth-context";
import { updateOwnProfileSchema } from "@/lib/validations";

import type { z } from "zod";

type FormValues = z.infer<typeof updateOwnProfileSchema>;

type Profile = {
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
  createdAt: string;
  updatedAt: string;
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

export default function ProfilePage() {
  const { authFetch } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(updateOwnProfileSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await authFetch("/api/v1/users/me");
      if (res.ok) {
        const body = await res.json();
        setProfile(body.data);
        form.reset({
          email: body.data.email,
          firstName: body.data.firstName,
          lastName: body.data.lastName,
          phone: body.data.phone || "",
        });
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, [authFetch, form]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function onSubmit(values: FormValues) {
    try {
      const res = await authFetch("/api/v1/users/me", {
        method: "PUT",
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = await res.json();
        if (body.errors) {
          Object.entries(body.errors).forEach(([field, messages]) => {
            form.setError(field as keyof FormValues, {
              message: (messages as string[])[0],
            });
          });
        } else {
          toast.error(body.message || "Failed to update profile");
        }
        return;
      }

      toast.success("Profile updated successfully");
      setEditing(false);
      fetchProfile();
    } catch {
      toast.error("An unexpected error occurred");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <User className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="font-medium text-muted-foreground">Unable to load profile</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Profile</h1>
        {!editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit Profile
          </Button>
        )}
      </div>

      {/* Read-only info */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xl font-semibold flex-shrink-0">
          {profile.firstName[0]?.toUpperCase()}
          {profile.lastName[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-bold">
            {profile.firstName} {profile.lastName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-muted-foreground font-mono">@{profile.username}</span>
            <Badge variant="outline">{roleLabels[profile.role] || profile.role}</Badge>
          </div>
        </div>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      form.reset({
                        email: profile.email,
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        phone: profile.phone || "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <InfoItem icon={User} label="First Name" value={profile.firstName} />
              <InfoItem icon={User} label="Last Name" value={profile.lastName} />
              <InfoItem icon={Mail} label="Email" value={profile.email} />
              <InfoItem icon={Phone} label="Phone" value={profile.phone || "—"} />
              <InfoItem
                icon={Shield}
                label="Role"
                value={roleLabels[profile.role] || profile.role}
              />
              <InfoItem
                icon={Building2}
                label="Department"
                value={profile.department?.name || "—"}
              />
              <InfoItem
                icon={Clock}
                label="Last Login"
                value={
                  profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "Never"
                }
              />
              <InfoItem
                icon={Clock}
                label="Member Since"
                value={new Date(profile.createdAt).toLocaleDateString()}
              />
            </div>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Username, role, and department can only be changed by an administrator.
              </p>
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
