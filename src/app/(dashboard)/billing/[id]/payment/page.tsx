"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  patient: { firstName: string; lastName: string };
};

const paymentFormSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "insurance"], {
    message: "Please select a payment method",
  }),
  reference: z.string().max(100).optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "insurance", label: "Insurance" },
];

export default function RecordPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { authFetch } = useAuth();
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: undefined,
      reference: "",
    },
  });

  const selectedMethod = form.watch("paymentMethod");

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/v1/invoices/${id}`);
      if (res.ok) {
        const body = await res.json();
        const inv = body.data;
        setInvoice(inv);
        const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);
        form.setValue("amount", Math.round(outstanding * 100) / 100);
      }
    } catch (error) {
      console.error("Failed to fetch invoice:", error);
    } finally {
      setLoading(false);
    }
  }, [authFetch, id, form]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  async function onSubmit(values: PaymentFormValues) {
    if (!invoice) return;

    const outstanding = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    if (values.amount > outstanding) {
      form.setError("amount", {
        message: `Amount cannot exceed outstanding balance of ${outstanding.toFixed(2)}`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        amount: Number(values.amount),
        paymentMethod: values.paymentMethod,
      };
      if (values.reference && values.paymentMethod !== "cash") {
        body.reference = values.reference;
      }

      const res = await authFetch(`/api/v1/invoices/${id}/payments`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("Payment recorded");
        router.push(`/billing/${id}`);
      } else {
        const errBody = await res.json();
        toast.error(errBody.message || "Failed to record payment");
      }
    } catch (error) {
      console.error("Failed to record payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-lg">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Invoice Not Found</h1>
        <Button variant="outline" onClick={() => router.push("/billing")}>
          Back to Billing
        </Button>
      </div>
    );
  }

  const outstanding = Math.round(
    (Number(invoice.totalAmount) - Number(invoice.paidAmount)) * 100
  ) / 100;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Record Payment</h1>
        <p className="text-muted-foreground">
          Record a payment for invoice {invoice.invoiceNumber}
        </p>
      </div>

      {/* Invoice Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Summary</CardTitle>
          <CardDescription>
            {invoice.patient.firstName} {invoice.patient.lastName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice:</span>
              <span className="font-mono">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount:</span>
              <span>{Number(invoice.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid Amount:</span>
              <span>{Number(invoice.paidAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Outstanding Balance:</span>
              <span>{outstanding.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                max={outstanding}
                {...form.register("amount", { valueAsNumber: true })}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={selectedMethod}
                onValueChange={(value) =>
                  form.setValue("paymentMethod", value as PaymentFormValues["paymentMethod"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.paymentMethod && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.paymentMethod.message}
                </p>
              )}
            </div>

            {selectedMethod && selectedMethod !== "cash" && (
              <div className="space-y-2">
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  {...form.register("reference")}
                  placeholder="Transaction reference number"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Recording..." : "Record Payment"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/billing/${id}`}>Back to Invoice</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
