"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import {
  AppError,
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/errors";
import { OrgContextError, requireOrganizationId } from "@/lib/org/context";
import { InvoiceRepository } from "@/repositories/invoices";
import {
  invoiceFormSchema,
  type InvoiceFormInput,
} from "@/lib/validation/schemas";
import { ZodError } from "zod";

function mapError(err: unknown): ActionResult<never> {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_form";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key].push(issue.message);
    }
    return actionError("Validation failed", "VALIDATION", fieldErrors);
  }
  if (err instanceof OrgContextError) {
    return actionError(
      err.message,
      err.code === "FORBIDDEN" ? "FORBIDDEN" : "UNAVAILABLE",
    );
  }
  if (err instanceof AppError) {
    return actionError(err.message, err.code);
  }
  console.error(err);
  return actionError("Unexpected error", "VALIDATION");
}

function emptyToNull(v: string | undefined | null) {
  if (v === undefined || v === null || v.trim() === "") return null;
  return v.trim();
}

export async function createInvoiceDraftAction(
  input: InvoiceFormInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const organizationId = await requireOrganizationId();
    const data = invoiceFormSchema.parse(input);
    const repo = new InvoiceRepository(getDb());
    const result = await repo.create({
      organizationId,
      customerId: data.customerId,
      currency: data.currency,
      tokenDecimals: data.tokenDecimals,
      tax: data.tax,
      discount: data.discount,
      issueDate: emptyToNull(data.issueDate),
      dueDate: emptyToNull(data.dueDate),
      notes: emptyToNull(data.notes),
      memo: emptyToNull(data.memo),
      lines: data.lines.map((line, index) => ({
        ...line,
        position: index,
      })),
    });
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard");
    return actionSuccess({ id: result.invoice.id });
  } catch (err) {
    return mapError(err);
  }
}

export async function updateInvoiceDraftAction(
  id: string,
  input: InvoiceFormInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const organizationId = await requireOrganizationId();
    const data = invoiceFormSchema.parse(input);
    const repo = new InvoiceRepository(getDb());
    const updated = await repo.updateDraft(id, organizationId, {
      customerId: data.customerId,
      currency: data.currency,
      tokenDecimals: data.tokenDecimals,
      tax: data.tax,
      discount: data.discount,
      issueDate: emptyToNull(data.issueDate),
      dueDate: emptyToNull(data.dueDate),
      notes: emptyToNull(data.notes),
      memo: emptyToNull(data.memo),
      lines: data.lines.map((line, index) => ({
        ...line,
        position: index,
      })),
    });
    if (!updated) return actionError("Invoice not found", "NOT_FOUND");
    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${id}`);
    revalidatePath(`/dashboard/invoices/${id}/edit`);
    return actionSuccess({ id: updated.id });
  } catch (err) {
    return mapError(err);
  }
}

export async function issueInvoiceAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const organizationId = await requireOrganizationId();
    const repo = new InvoiceRepository(getDb());
    const invoice = await repo.issue(id, organizationId);
    if (!invoice) return actionError("Invoice not found", "NOT_FOUND");
    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${id}`);
    return actionSuccess({ id: invoice.id });
  } catch (err) {
    return mapError(err);
  }
}

export async function cancelInvoiceAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const organizationId = await requireOrganizationId();
    const repo = new InvoiceRepository(getDb());
    const invoice = await repo.cancel(id, organizationId);
    if (!invoice) return actionError("Invoice not found", "NOT_FOUND");
    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/invoices/${id}`);
    return actionSuccess({ id: invoice.id });
  } catch (err) {
    return mapError(err);
  }
}

export async function duplicateInvoiceAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const organizationId = await requireOrganizationId();
    const repo = new InvoiceRepository(getDb());
    const result = await repo.duplicate(id, organizationId);
    revalidatePath("/dashboard/invoices");
    return actionSuccess({ id: result.invoice.id });
  } catch (err) {
    return mapError(err);
  }
}
