import { and, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import { customers } from "@/db/schema";
import {
  customerCreateSchema,
  customerUpdateSchema,
  type CustomerCreateInput,
  type CustomerUpdateInput,
} from "@/lib/validation/schemas";

export class CustomerRepository {
  constructor(private readonly db: Database) {}

  async create(input: CustomerCreateInput) {
    const data = customerCreateSchema.parse(input);
    const [customer] = await this.db
      .insert(customers)
      .values({
        organizationId: data.organizationId,
        name: data.name,
        email: data.email,
        company: data.company ?? null,
        addressLine1: data.addressLine1 ?? null,
        addressLine2: data.addressLine2 ?? null,
        city: data.city ?? null,
        region: data.region ?? null,
        postalCode: data.postalCode ?? null,
        country: data.country ?? null,
        notes: data.notes ?? null,
        updatedAt: new Date(),
      })
      .returning();

    if (!customer) throw new Error("Failed to create customer");
    return customer;
  }

  async findById(id: string) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    return customer ?? null;
  }

  async listByOrganization(organizationId: string) {
    return this.db
      .select()
      .from(customers)
      .where(eq(customers.organizationId, organizationId));
  }

  async update(id: string, input: CustomerUpdateInput) {
    const data = customerUpdateSchema.parse(input);
    const [customer] = await this.db
      .update(customers)
      .set({
        ...data,
        company: data.company === undefined ? undefined : data.company,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();
    return customer ?? null;
  }

  async findByOrgAndEmail(organizationId: string, email: string) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          eq(customers.email, email),
        ),
      )
      .limit(1);
    return customer ?? null;
  }
}
