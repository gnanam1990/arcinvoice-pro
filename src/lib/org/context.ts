import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { organizations } from "@/db/schema";

export const DEMO_ORG_SLUG = "demo-northline";

export class OrgContextError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "FORBIDDEN" | "UNAVAILABLE" = "NOT_FOUND",
  ) {
    super(message);
    this.name = "OrgContextError";
  }
}

/**
 * Resolve the active organization for dashboard data access.
 * Uses DEMO_ORGANIZATION_SLUG / DEFAULT_ORGANIZATION_SLUG or the seeded demo org.
 * Auth is not wired yet — all UI operates in this org boundary.
 */
export async function getActiveOrganization() {
  const db = getDb();
  const slug =
    process.env.DEMO_ORGANIZATION_SLUG ??
    process.env.DEFAULT_ORGANIZATION_SLUG ??
    DEMO_ORG_SLUG;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (!org) {
    throw new OrgContextError(
      `Organization "${slug}" not found. Run pnpm db:seed to load demo data.`,
      "UNAVAILABLE",
    );
  }

  return org;
}

export async function requireOrganizationId(): Promise<string> {
  const org = await getActiveOrganization();
  return org.id;
}

export function assertOrgOwnership(
  resourceOrgId: string,
  activeOrgId: string,
  resourceLabel = "Resource",
): void {
  if (resourceOrgId !== activeOrgId) {
    throw new OrgContextError(
      `${resourceLabel} does not belong to this organization`,
      "FORBIDDEN",
    );
  }
}
