import { describe, expect, it } from "vitest";
import { AmountError } from "@/lib/domain/amounts";
import {
  addErc20,
  addNative,
  erc20Usdc,
  formatErc20Usdc,
  formatNativeUsdc,
  formatTokenAmount,
  invoiceBaseToErc20Usdc,
  invoiceBaseToNativeUsdc,
  nativeUsdc,
  rejectMixedUnits,
} from "./units";
import { ARC_ERC20_USDC_DECIMALS, ARC_NATIVE_DECIMALS } from "./chain";

describe("Arc unit systems", () => {
  it("formats native 18-decimal USDC", () => {
    const one = nativeUsdc(BigInt(10) ** BigInt(ARC_NATIVE_DECIMALS));
    expect(formatNativeUsdc(one)).toContain("1");
    expect(formatNativeUsdc(one)).toContain("USDC");
  });

  it("formats ERC-20 6-decimal USDC", () => {
    const one = erc20Usdc(BigInt(10) ** BigInt(ARC_ERC20_USDC_DECIMALS));
    expect(formatErc20Usdc(one)).toBe("1 USDC");
  });

  it("converts invoice base (2 decimals) to ERC-20 6 without floats", () => {
    const result = invoiceBaseToErc20Usdc({
      system: "invoice_base",
      value: 1234,
      decimals: 2,
    });
    expect(result.system).toBe("erc20_usdc_6");
    // $12.34 → 1234 (2dp) → 12_340_000 (6dp)
    expect(result.value).toBe(BigInt(12_340_000));
  });

  it("converts invoice base to native 18", () => {
    const result = invoiceBaseToNativeUsdc({
      system: "invoice_base",
      value: 100,
      decimals: 2,
    });
    expect(result.system).toBe("native_usdc_18");
    expect(result.value).toBe(BigInt(10) ** BigInt(18));
  });

  it("allows add within the same system", () => {
    expect(addNative(nativeUsdc(BigInt(1)), nativeUsdc(BigInt(2))).value).toBe(
      BigInt(3),
    );
    expect(addErc20(erc20Usdc(BigInt(5)), erc20Usdc(BigInt(7))).value).toBe(
      BigInt(12),
    );
  });

  it("rejects mixing native and ERC-20 units", () => {
    expect(() =>
      rejectMixedUnits(nativeUsdc(BigInt(1)), erc20Usdc(BigInt(1))),
    ).toThrow(AmountError);
    expect(() =>
      addNative(nativeUsdc(BigInt(1)), nativeUsdc(BigInt(1))),
    ).not.toThrow();
  });

  it("formatTokenAmount is pure integer math", () => {
    expect(formatTokenAmount(BigInt(1_500_000), 6)).toBe("1.5");
    expect(formatTokenAmount(BigInt(1), 18)).toBe("0.000000000000000001");
  });
});
