import { describe, expect, it, beforeEach } from "vitest";
import { rateLimit, resetRateLimitStore } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows requests under the limit", () => {
    const r1 = rateLimit({ key: "k", limit: 2, windowMs: 1000, now: 0 });
    const r2 = rateLimit({ key: "k", limit: 2, windowMs: 1000, now: 1 });
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it("blocks when limit exceeded", () => {
    rateLimit({ key: "k2", limit: 1, windowMs: 1000, now: 0 });
    const blocked = rateLimit({ key: "k2", limit: 1, windowMs: 1000, now: 1 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after window", () => {
    rateLimit({ key: "k3", limit: 1, windowMs: 100, now: 0 });
    const after = rateLimit({ key: "k3", limit: 1, windowMs: 100, now: 150 });
    expect(after.allowed).toBe(true);
  });
});
