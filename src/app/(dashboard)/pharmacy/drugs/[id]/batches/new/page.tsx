"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createBatchSchema } from "@/lib/validations";

import type { z } from "zod";

type FormValues = z.infer<typeof createBatchSchema>;

export default function NewBatchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { authFetch } = useAuth();
  const [drugName, setDrugName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchDrug = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/drugs/${id}`);
      if (res.ok) {
        const body = await res.json();
        setDrugName(
          body.data.brandName
            ? `${body.data.genericName} (${body.data.brandName})`
            : body.data.genericName,
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  useEffect(() => {
    fetchDrug();
  }, [fetchDrug]);

  const form = useForm<FormValues>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: {
      batchNo: "",
      quantity: 0,
      expiryDate: "",
      costPrice: 0,
      supplier: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const res = await authFetch(`/api/v1/drugs/${id}/batches`, {
        method: "POST",
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
          toast.error(body.message || "Failed to record batch");
        }
        return;
      }

      toast.success("Stock received successfully");
      router.push(`/pharmacy/drugs/${id}`);
    } catch {
      toast.error("An unexpected error occurred");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Receive Stock</h1>
          <p className="text-muted-foreground">{drugName}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batch Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="batchNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. BTH-2026-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Price *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="Supplier name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Recording..." : "Record Stock Receipt"}
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
