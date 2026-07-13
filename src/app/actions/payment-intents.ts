"use server";

import { headers } from "next/headers";
import { getDb } from "@/db/client";
import {
  AppError,
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/errors";
import {
  PaymentIntentRepository,
  type PublicPaymentIntentView,
} from "@/repositories/payment-intents";
import { ZodError, z } from "zod";

const prepareSchema = z.object({
  publicToken: z.string().min(16).max(128),
  payerAddress: z.string().min(1),
  idempotencyKey: z.string().min(8).max(128),
  requestedAmount: z.number().int().positive().optional(),
});

function mapError(err: unknown): ActionResult<never> {
  if (err instanceof ZodError) {
    return actionError("Validation failed", "VALIDATION");
  }
  if (err instanceof AppError) {
    return actionError(err.message, err.code);
  }
  console.error(err);
  return actionError("Could not prepare payment", "VALIDATION");
}

/**
 * Prepare a payment intent for a public invoice.
 * Recalculates all payment details on the server.
 * Does not sign or broadcast any transaction.
 */
export async function preparePaymentAction(
  input: z.input<typeof prepareSchema>,
): Promise<ActionResult<PublicPaymentIntentView>> {
  try {
    const data = prepareSchema.parse(input);
    const hdrs = await headers();
    const ip =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      "unknown";

    const repo = new PaymentIntentRepository(getDb());
    const view = await repo.preparePayment(
      {
        publicToken: data.publicToken,
        payerAddress: data.payerAddress,
        idempotencyKey: data.idempotencyKey,
        requestedAmount: data.requestedAmount,
      },
      ip,
    );
    return actionSuccess(view);
  } catch (err) {
    return mapError(err);
  }
}
