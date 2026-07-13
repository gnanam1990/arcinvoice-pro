"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/app/actions/customers";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import type { CustomerFormInput } from "@/lib/validation/schemas";

type CustomerFormProps = {
  mode: "create" | "edit";
  customerId?: string;
  initial?: Partial<CustomerFormInput>;
};

export function CustomerForm({ mode, customerId, initial }: CustomerFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const form = new FormData(e.currentTarget);
    const payload: CustomerFormInput = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      company: String(form.get("company") ?? ""),
      walletAddress: String(form.get("walletAddress") ?? ""),
      addressLine1: String(form.get("addressLine1") ?? ""),
      addressLine2: String(form.get("addressLine2") ?? ""),
      city: String(form.get("city") ?? ""),
      region: String(form.get("region") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      country: String(form.get("country") ?? ""),
      notes: String(form.get("notes") ?? ""),
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCustomerAction(payload)
          : await updateCustomerAction(customerId!, payload);

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSuccess(mode === "create" ? "Customer created" : "Customer updated");
      router.push(`/dashboard/customers/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      className="space-y-6"
      noValidate
      data-testid="customer-form"
      data-hydrated={hydrated ? "true" : "false"}
    >
      {error ? (
        <Alert tone="error" title="Could not save customer">
          {error}
        </Alert>
      ) : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            data-testid="customer-name"
          />
          <FieldError message={fieldErrors.name?.[0]} />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={initial?.email ?? ""}
            data-testid="customer-email"
          />
          <FieldError message={fieldErrors.email?.[0]} />
        </div>
        <div>
          <Label htmlFor="walletAddress">Wallet address</Label>
          <Input
            id="walletAddress"
            name="walletAddress"
            placeholder="0x…"
            className="font-mono"
            defaultValue={initial?.walletAddress ?? ""}
            data-testid="customer-wallet"
          />
          <FieldError message={fieldErrors.walletAddress?.[0]} />
        </div>
        <div>
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            name="company"
            defaultValue={initial?.company ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="country">Country (ISO)</Label>
          <Input
            id="country"
            name="country"
            placeholder="US"
            maxLength={2}
            defaultValue={initial?.country ?? ""}
            data-testid="customer-country"
          />
          <FieldError message={fieldErrors.country?.[0]} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="addressLine1">Address line 1</Label>
          <Input
            id="addressLine1"
            name="addressLine1"
            defaultValue={initial?.addressLine1 ?? ""}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="addressLine2">Address line 2</Label>
          <Input
            id="addressLine2"
            name="addressLine2"
            defaultValue={initial?.addressLine2 ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={initial?.city ?? ""} />
        </div>
        <div>
          <Label htmlFor="region">Region / state</Label>
          <Input
            id="region"
            name="region"
            defaultValue={initial?.region ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="postalCode">Postal code</Label>
          <Input
            id="postalCode"
            name="postalCode"
            defaultValue={initial?.postalCode ?? ""}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={initial?.notes ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={pending || !hydrated}
          data-testid="customer-submit"
        >
          {pending
            ? "Saving…"
            : mode === "create"
              ? "Create customer"
              : "Save changes"}
        </Button>
        <Button href="/dashboard/customers" variant="outline">
          Cancel
        </Button>
      </div>
    </form>
  );
}
