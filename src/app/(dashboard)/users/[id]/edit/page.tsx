"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { updateUserSchema } from "@/lib/validations";

import type { z } from "zod";

type FormValues = z.infer<typeof updateUserSchema>;

type Department = {
  id: string;
  name: string;
  code: string;
};

const roleOptions = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "paramedic", label: "Paramedic" },
  { value: "receptionist", label: "Receptionist" },
  { value: "admin", label: "Administrator" },
  { value: "lab_tech", label: "Lab Technician" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "director", label: "Director" },
];

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { authFetch, user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);

  const isDirector = currentUser?.role === "director";

  const form = useForm<FormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      role: undefined,
      departmentId: undefined,
      phone: "",
    },
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [userRes, deptRes] = await Promise.all([
          authFetch(`/api/v1/users/${id}`),
          authFetch("/api/v1/departments"),
        ]);

        if (userRes.ok) {
          const body = await userRes.json();
          const u = body.data;
          setUsername(u.username);
          setCreatedAt(u.createdAt);
          form.reset({
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            departmentId: u.department?.id || undefined,
            phone: u.phone || "",
          });
        }

        if (deptRes.ok) {
          const body = await deptRes.json();
          setDepartments(body.data);
        }
      } catch {
        // Network error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [authFetch, id, form]);

  async function onSubmit(values: FormValues) {
    try {
      const res = await authFetch(`/api/v1/users/${id}`, {
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
          toast.error(body.message || "Failed to update user");
        }
        return;
      }

      toast.success("User updated successfully");
      router.push(`/users/${id}`);
    } catch {
      toast.error("An unexpected error occurred");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2 text-muted-foreground"
        onClick={() => router.push(`/users/${id}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Button>

      <h1 className="text-2xl font-semibold">Edit Staff Member</h1>

      <div className="flex gap-6 text-sm text-muted-foreground">
        <span>Username: {username}</span>
        <span>Created: {new Date(createdAt).toLocaleDateString()}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role {!isDirector && "(Director only)"}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={!isDirector}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roleOptions.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Department</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
