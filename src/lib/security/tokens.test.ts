import { describe, expect, it } from "vitest";
import {
  generatePublicToken,
  hashPublicToken,
  safeEqualString,
  tokensMatch,
} from "./tokens";

describe("public tokens", () => {
  it("generates high-entropy unique tokens", () => {
    const a = generatePublicToken(32);
    const b = generatePublicToken(32);
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });

  it("hashes deterministically", () => {
    const t = "test-token-value";
    expect(hashPublicToken(t)).toBe(hashPublicToken(t));
    expect(hashPublicToken(t)).not.toBe(hashPublicToken("other"));
  });

  it("matches tokens via hash comparison", () => {
    const t = generatePublicToken();
    expect(tokensMatch(t, t)).toBe(true);
    expect(tokensMatch(t, generatePublicToken())).toBe(false);
  });

  it("safeEqualString rejects different lengths without throwing", () => {
    expect(safeEqualString("abc", "ab")).toBe(false);
    expect(safeEqualString("same", "same")).toBe(true);
  });
});
