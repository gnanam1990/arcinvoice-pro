import { describe, expect, it } from "vitest";
import {
  isProviderNotFoundError,
  isUserRejectionError,
} from "./detect-provider";

describe("wallet error classification", () => {
  it("detects provider-not-found errors", () => {
    expect(
      isProviderNotFoundError(
        Object.assign(new Error("Provider not found"), {
          name: "ProviderNotFoundError",
        }),
      ),
    ).toBe(true);
    expect(isProviderNotFoundError(new Error("Provider not found"))).toBe(true);
    expect(isProviderNotFoundError(new Error("something else"))).toBe(false);
  });

  it("detects user rejection separately", () => {
    expect(
      isUserRejectionError(
        Object.assign(new Error("User rejected the request"), {
          name: "UserRejectedRequestError",
          code: 4001,
        }),
      ),
    ).toBe(true);
    expect(isUserRejectionError(new Error("Provider not found"))).toBe(false);
  });
});
