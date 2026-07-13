"use server";

import { getDb } from "@/db/client";
import { auditEvents } from "@/db/schema";
import { actionError, actionSuccess, type ActionResult } from "@/lib/errors";
import { requireOrganizationId } from "@/lib/org/context";
import { InvoiceRepository } from "@/repositories/invoices";

/**
 * Record that a merchant copied the public invoice link from the dashboard.
 * Does not log visitor IPs.
 */
export async function recordPublicLinkCopiedAction(
  invoiceId: string,
): Promise<ActionResult<{ ok: true }>> {
  try {
    const organizationId = await requireOrganizationId();
    const repo = new InvoiceRepository(getDb());
    const invoice = await repo.findByIdForOrg(invoiceId, organizationId);
    if (!invoice) {
      return actionError("Invoice not found", "NOT_FOUND");
    }

    await getDb().insert(auditEvents).values({
      organizationId,
      entityType: "invoice",
      entityId: invoice.id,
      action: "link_copied",
      summary: `Public link copied for invoice ${invoice.number}`,
      metadata: { visitorIpLogged: false, source: "dashboard" },
      updatedAt: new Date(),
    });

    return actionSuccess({ ok: true });
  } catch (err) {
    console.error(err);
    return actionError("Could not record link copy", "VALIDATION");
  }
}
