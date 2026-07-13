import { describe, expect, it } from "vitest";
import {
  isPublicViewableStatus,
  toPublicCustomer,
  toPublicLines,
} from "./invoice-dto";

describe("public invoice DTO", () => {
  it("allows issued family statuses only", () => {
    expect(isPublicViewableStatus("issued")).toBe(true);
    expect(isPublicViewableStatus("partially_paid")).toBe(true);
    expect(isPublicViewableStatus("paid")).toBe(true);
    expect(isPublicViewableStatus("overdue")).toBe(true);
    expect(isPublicViewableStatus("draft")).toBe(false);
    expect(isPublicViewableStatus("cancelled")).toBe(false);
  });

  it("strips internal customer id from public view", () => {
    const pub = toPublicCustomer({
      customerId: "secret-id",
      name: "Ada",
      email: "ada@example.com",
      walletAddress: "0xabc",
      company: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      region: null,
      postalCode: null,
      country: "US",
    });
    expect(pub).not.toHaveProperty("customerId");
    expect(pub).not.toHaveProperty("walletAddress");
    expect(pub?.name).toBe("Ada");
    expect(pub?.email).toBe("ada@example.com");
  });

  it("maps line snapshots without internal line ids", () => {
    const lines = toPublicLines([
      {
        lineId: "line-1",
        description: "Work",
        quantity: 1,
        unitPrice: 100,
        amount: 100,
        position: 0,
      },
    ]);
    expect(lines[0]).not.toHaveProperty("lineId");
    expect(lines[0]?.description).toBe("Work");
  });
});
