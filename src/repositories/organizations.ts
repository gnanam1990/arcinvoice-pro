import { eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { members, organizations } from "@/db/schema";
import {
  memberCreateSchema,
  organizationCreateSchema,
  type OrganizationCreateInput,
} from "@/lib/validation/schemas";
import { z } from "zod";

export class OrganizationRepository {
  constructor(private readonly db: Database) {}

  async create(input: OrganizationCreateInput) {
    const data = organizationCreateSchema.parse(input);
    const [org] = await this.db
      .insert(organizations)
      .values({
        name: data.name,
        slug: data.slug,
        updatedAt: new Date(),
      })
      .returning();

    if (!org) throw new Error("Failed to create organization");
    return org;
  }

  async findById(id: string) {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    return org ?? null;
  }

  async findBySlug(slug: string) {
    const [org] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    return org ?? null;
  }

  async addMember(
    input: z.input<typeof memberCreateSchema>,
  ) {
    const data = memberCreateSchema.parse(input);
    const [member] = await this.db
      .insert(members)
      .values({
        organizationId: data.organizationId,
        email: data.email,
        name: data.name,
        role: data.role,
        updatedAt: new Date(),
      })
      .returning();

    if (!member) throw new Error("Failed to create member");
    return member;
  }

  async listMembers(organizationId: string) {
    return this.db
      .select()
      .from(members)
      .where(eq(members.organizationId, organizationId));
  }
}
