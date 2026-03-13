"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import { createDrugSchema } from "@/lib/validations";

import type { z } from "zod";

type FormValues = z.input<typeof createDrugSchema>;

const FORMULATIONS = [
  "tablet", "capsule", "syrup", "injection", "cream", "inhaler", "drops", "other",
] as const;

const CATEGORIES = [
  "Analgesics", "Antibiotics", "Antihypertensives", "Antidiabetics",
  "Gastrointestinal", "Respiratory", "Vitamins", "Other",
];

export default function NewDrugPage() {
  const router = useRouter();
  const { authFetch } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(createDrugSchema),
    defaultValues: {
      genericName: "",
      brandName: "",
      category: "",
      formulation: undefined,
      strength: "",
      unit: "",
      reorderLevel: 10,
      unitPrice: 0,
      isControlled: false,
      requiresPrescription: true,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const res = await authFetch("/api/v1/drugs", {
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
          toast.error(body.message || "Failed to add drug");
        }
        return;
      }

      const body = await res.json();
      toast.success("Drug added to catalogue");
      router.push(`/pharmacy/drugs/${body.data.id}`);
    } catch {
      toast.error("An unexpected error occurred");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Add Drug to Catalogue</h1>

      <Card>
        <CardHeader>
          <CardTitle>Drug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="genericName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Generic Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Paracetamol" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brandName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Tylenol" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="formulation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formulation *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select formulation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FORMULATIONS.map((f) => (
                            <SelectItem key={f} value={f} className="capitalize">
                              {f}
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="strength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Strength</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 500mg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. tablet, ml, vial" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price *</FormLabel>
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
                <FormField
                  control={form.control}
                  name="reorderLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Level</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Alert when stock falls to this level</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isControlled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Controlled Substance</FormLabel>
                        <FormDescription>Requires stricter tracking</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requiresPrescription"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Requires Prescription</FormLabel>
                        <FormDescription>Cannot be dispensed OTC</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Adding..." : "Add Drug"}
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
