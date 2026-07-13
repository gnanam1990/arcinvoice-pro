"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getDb } from "@/db/client";
import {
  AppError,
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/errors";
import { OrgContextError, requireOrganizationId } from "@/lib/org/context";
import { CustomerRepository } from "@/repositories/customers";
import {
  countryCodeSchema,
  customerFormSchema,
  walletAddressSchema,
  type CustomerFormInput,
} from "@/lib/validation/schemas";

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

function formToCustomerFields(data: CustomerFormInput) {
  let walletAddress = emptyToNull(data.walletAddress);
  let country = emptyToNull(data.country);

  if (walletAddress) {
    walletAddress = walletAddressSchema.parse(walletAddress);
  }
  if (country) {
    country = countryCodeSchema.parse(country);
  }

  return {
    name: data.name,
    email: data.email,
    company: emptyToNull(data.company),
    walletAddress,
    addressLine1: emptyToNull(data.addressLine1),
    addressLine2: emptyToNull(data.addressLine2),
    city: emptyToNull(data.city),
    region: emptyToNull(data.region),
    postalCode: emptyToNull(data.postalCode),
    country,
    notes: emptyToNull(data.notes),
  };
}

export async function createCustomerAction(
  input: CustomerFormInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const organizationId = await requireOrganizationId();
    const parsed = customerFormSchema.parse(input);
    const fields = formToCustomerFields(parsed);
    const repo = new CustomerRepository(getDb());
    const customer = await repo.create({
      organizationId,
      ...fields,
    });
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard");
    return actionSuccess({ id: customer.id });
  } catch (err) {
    return mapError(err);
  }
}

export async function updateCustomerAction(
  id: string,
  input: CustomerFormInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const organizationId = await requireOrganizationId();
    const parsed = customerFormSchema.parse(input);
    const fields = formToCustomerFields(parsed);
    const repo = new CustomerRepository(getDb());
    const customer = await repo.update(id, organizationId, fields);
    if (!customer) return actionError("Customer not found", "NOT_FOUND");
    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${id}`);
    return actionSuccess({ id: customer.id });
  } catch (err) {
    return mapError(err);
  }
}

export async function archiveCustomerAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const organizationId = await requireOrganizationId();
    const repo = new CustomerRepository(getDb());
    const customer = await repo.archive(id, organizationId);
    if (!customer) return actionError("Customer not found", "NOT_FOUND");
    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${id}`);
    return actionSuccess({ id: customer.id });
  } catch (err) {
    return mapError(err);
  }
}
