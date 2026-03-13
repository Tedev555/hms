"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Payment = {
  id: string;
  amount: number;
  paymentMethod: string;
  reference: string | null;
  paidAt: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes: string | null;
  patient: { id: string; firstName: string; lastName: string; patientCode: string };
  appointment: { id: string; appointmentCode: string } | null;
  items: InvoiceItem[];
  payments: Payment[];
};

const addItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().min(1, "Min 1"),
  unitPrice: z.number().positive("Must be positive"),
});

const discountSchema = z.object({
  discountAmount: z.number().min(0, "Must be 0 or more"),
});

type AddItemValues = z.infer<typeof addItemSchema>;
type DiscountValues = z.infer<typeof discountSchema>;

function getStatusBadge(status: string) {
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  switch (status) {
    case "draft":
      return <Badge variant="outline">{label}</Badge>;
    case "issued":
      return <Badge variant="default">{label}</Badge>;
    case "partially_paid":
      return <Badge variant="secondary">{label}</Badge>;
    case "paid":
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
          {label}
        </Badge>
      );
    case "overdue":
      return <Badge variant="destructive">{label}</Badge>;
    case "cancelled":
      return <Badge variant="destructive">{label}</Badge>;
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authFetch, user } = useAuth();
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);

  const addItemForm = useForm<AddItemValues>({
    resolver: zodResolver(addItemSchema),
    defaultValues: { description: "", quantity: 1, unitPrice: 0 },
  });

  const discountForm = useForm<DiscountValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: { discountAmount: 0 },
  });

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/v1/invoices/${id}`);
      if (res.ok) {
        const body = await res.json();
        setInvoice(body.data);
      }
    } catch (error) {
      console.error("Failed to fetch invoice:", error);
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  async function handleDeleteItem(itemId: string) {
    try {
      const res = await authFetch(`/api/v1/invoices/${id}/items/${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Item removed");
        fetchInvoice();
      } else {
        const body = await res.json();
        toast.error(body.message || "Failed to remove item");
      }
    } catch {
      toast.error("Failed to remove item");
    }
  }

  async function handleAddItem(values: AddItemValues) {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/v1/invoices/${id}/items`, {
        method: "POST",
        body: JSON.stringify({
          description: values.description,
          quantity: Number(values.quantity),
          unitPrice: Number(values.unitPrice),
        }),
      });
      if (res.ok) {
        toast.success("Item added");
        setAddItemOpen(false);
        addItemForm.reset();
        fetchInvoice();
      } else {
        const body = await res.json();
        toast.error(body.message || "Failed to add item");
      }
    } catch {
      toast.error("Failed to add item");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApplyDiscount(values: DiscountValues) {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/v1/invoices/${id}`, {
        method: "PUT",
        body: JSON.stringify({ discountAmount: Number(values.discountAmount) }),
      });
      if (res.ok) {
        toast.success("Discount applied");
        setDiscountOpen(false);
        discountForm.reset();
        fetchInvoice();
      } else {
        const body = await res.json();
        toast.error(body.message || "Failed to apply discount");
      }
    } catch {
      toast.error("Failed to apply discount");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleIssue() {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/v1/invoices/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "issued" }),
      });
      if (res.ok) {
        toast.success("Invoice issued");
        fetchInvoice();
      } else {
        const body = await res.json();
        toast.error(body.message || "Failed to issue invoice");
      }
    } catch {
      toast.error("Failed to issue invoice");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/v1/invoices/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        toast.success("Invoice cancelled");
        fetchInvoice();
      } else {
        const body = await res.json();
        toast.error(body.message || "Failed to cancel invoice");
      }
    } catch {
      toast.error("Failed to cancel invoice");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
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

  const balance = Number(invoice.totalAmount) - Number(invoice.paidAmount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
            {getStatusBadge(invoice.status)}
          </div>
          <p className="text-muted-foreground">
            Patient: {invoice.patient.firstName} {invoice.patient.lastName} (
            {invoice.patient.patientCode})
          </p>
          {invoice.appointment && (
            <p className="text-sm text-muted-foreground">
              Appointment:{" "}
              <Link
                href={`/appointments/${invoice.appointment.id}`}
                className="underline hover:text-foreground"
              >
                {invoice.appointment.appointmentCode}
              </Link>
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Issued: {new Date(invoice.issueDate).toLocaleDateString()} | Due:{" "}
            {new Date(invoice.dueDate).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/billing")}>
          Back to Billing
        </Button>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          {invoice.status === "draft" && (
            <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Add Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Line Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={addItemForm.handleSubmit(handleAddItem)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-desc">Description</Label>
                    <Input
                      id="add-desc"
                      {...addItemForm.register("description")}
                      placeholder="Item description"
                    />
                    {addItemForm.formState.errors.description && (
                      <p className="text-xs text-destructive">
                        {addItemForm.formState.errors.description.message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="add-qty">Quantity</Label>
                      <Input
                        id="add-qty"
                        type="number"
                        min={1}
                        {...addItemForm.register("quantity", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-price">Unit Price</Label>
                      <Input
                        id="add-price"
                        type="number"
                        step="0.01"
                        min={0}
                        {...addItemForm.register("unitPrice", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={actionLoading}>
                      {actionLoading ? "Adding..." : "Add Item"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {invoice.status === "draft" && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={invoice.status === "draft" ? 5 : 4}
                      className="text-center text-muted-foreground py-6"
                    >
                      No items.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {Number(item.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{Number(item.total).toFixed(2)}</TableCell>
                      {invoice.status === "draft" && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex justify-between w-56">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{Number(invoice.subtotalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-56">
              <span className="text-muted-foreground">Discount:</span>
              <span>-{Number(invoice.discountAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-56">
              <span className="text-muted-foreground">Tax:</span>
              <span>{Number(invoice.taxAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-56 border-t pt-1 font-medium">
              <span>Total:</span>
              <span>{Number(invoice.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-56">
              <span className="text-muted-foreground">Paid:</span>
              <span>{Number(invoice.paidAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-56 border-t pt-1 font-bold">
              <span>Balance:</span>
              <span>{balance.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{new Date(payment.paidAt).toLocaleDateString()}</TableCell>
                      <TableCell className="capitalize">
                        {payment.paymentMethod.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>{payment.reference || "-"}</TableCell>
                      <TableCell className="text-right">
                        {Number(payment.amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {invoice.status === "draft" && (
          <>
            <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Apply Discount</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Apply Discount</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={discountForm.handleSubmit(handleApplyDiscount)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="discount-amount">Discount Amount</Label>
                    <Input
                      id="discount-amount"
                      type="number"
                      step="0.01"
                      min={0}
                      {...discountForm.register("discountAmount", {
                        valueAsNumber: true,
                      })}
                    />
                    {discountForm.formState.errors.discountAmount && (
                      <p className="text-xs text-destructive">
                        {discountForm.formState.errors.discountAmount.message}
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={actionLoading}>
                      {actionLoading ? "Applying..." : "Apply"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={actionLoading}>Issue Invoice</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Issue Invoice?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the invoice as issued and it can no longer be edited. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleIssue}>Issue Invoice</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={actionLoading}>
                  Cancel Invoice
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Invoice?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently cancel the invoice. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go Back</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Cancel Invoice</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {invoice.status === "issued" && (
          <>
            <Button asChild>
              <Link href={`/billing/${id}/payment`}>Record Payment</Link>
            </Button>
            {user?.role === "admin" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={actionLoading}>
                    Cancel Invoice
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Invoice?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently cancel the invoice. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel}>Cancel Invoice</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}

        {(invoice.status === "partially_paid" || invoice.status === "overdue") && (
          <Button asChild>
            <Link href={`/billing/${id}/payment`}>Record Payment</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
