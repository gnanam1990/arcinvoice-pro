import { describe, expect, it } from "vitest";
import { parseMoneyField, parseMoneyToBaseUnits } from "./parse";
import { AmountError } from "@/lib/domain/amounts";

describe("parseMoneyToBaseUnits", () => {
  it("parses major units to integer base units", () => {
    expect(parseMoneyToBaseUnits("12.34", 2)).toBe(1234);
    expect(parseMoneyToBaseUnits("0.05", 2)).toBe(5);
    expect(parseMoneyToBaseUnits("100", 2)).toBe(10000);
  });

  it("rejects excess decimal places", () => {
    expect(() => parseMoneyToBaseUnits("1.234", 2)).toThrow(AmountError);
  });

  it("rejects non-numeric strings", () => {
    expect(() => parseMoneyToBaseUnits("abc", 2)).toThrow(AmountError);
  });
});

describe("parseMoneyField", () => {
  it("treats empty as zero", () => {
    expect(parseMoneyField("", 2)).toBe(0);
    expect(parseMoneyField(null, 2)).toBe(0);
  });
});
