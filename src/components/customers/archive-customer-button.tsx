"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveCustomerAction } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Alert } from "@/components/ui/alert";

export function ArchiveCustomerButton({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await archiveCustomerAction(customerId);
      if (!result.ok) {
        setError(result.error);
        setOpen(false);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {error ? (
        <Alert tone="error" className="mb-3">
          {error}
        </Alert>
      ) : null}
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Archive
      </Button>
      <ConfirmDialog
        open={open}
        title="Archive customer?"
        description={`Archive ${customerName}? They will be hidden from default lists and cannot be selected for new invoices.`}
        confirmLabel="Archive customer"
        variant="danger"
        loading={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
