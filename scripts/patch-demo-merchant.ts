import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { createDbClient } from "../src/db/client";
import { invoices, organizations } from "../src/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { db, sql } = createDbClient();
  const wallet = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, "demo-northline"))
      .limit(1);
    if (!org) {
      console.log("No demo org");
      return;
    }
    await db
      .update(organizations)
      .set({
        merchantWalletAddress: org.merchantWalletAddress ?? wallet,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, org.id));

    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, org.id));

    for (const inv of rows) {
      if (inv.issuedSnapshot && !inv.issuedSnapshot.merchant) {
        const snap = {
          ...inv.issuedSnapshot,
          merchant: {
            walletAddress: wallet,
            organizationName: org.name,
            capturedAt: new Date().toISOString(),
          },
          allowPartialPayments: true,
        };
        await db
          .update(invoices)
          .set({ issuedSnapshot: snap, updatedAt: new Date() })
          .where(eq(invoices.id, inv.id));
        console.log("patched", inv.number);
      }
    }
    console.log("done");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
