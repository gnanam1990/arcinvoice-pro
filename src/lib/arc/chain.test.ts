import { describe, expect, it } from "vitest";
import {
  ARC_NATIVE_DECIMALS,
  ARC_TESTNET_CHAIN_ID,
  arcTestnet,
  getArcFaucetUrl,
  getArcRpcUrl,
  getArcWalletAddParams,
  isArcTestnetChainId,
} from "./chain";

describe("Arc Testnet chain config", () => {
  it("uses chain id 5042002", () => {
    expect(ARC_TESTNET_CHAIN_ID).toBe(5042002);
    expect(arcTestnet.id).toBe(5042002);
  });

  it("native currency is USDC not ETH", () => {
    expect(arcTestnet.nativeCurrency.symbol).toBe("USDC");
    expect(arcTestnet.nativeCurrency.symbol).not.toBe("ETH");
    expect(arcTestnet.nativeCurrency.decimals).toBe(ARC_NATIVE_DECIMALS);
  });

  it("defaults official RPC and faucet", () => {
    expect(getArcRpcUrl()).toContain("arc");
    expect(getArcFaucetUrl()).toContain("faucet");
  });

  it("wallet add params include USDC", () => {
    const params = getArcWalletAddParams();
    expect(params.nativeCurrency.symbol).toBe("USDC");
    expect(params.chainId).toBe(`0x${(5042002).toString(16)}`);
  });

  it("detects Arc chain id", () => {
    expect(isArcTestnetChainId(5042002)).toBe(true);
    expect(isArcTestnetChainId(1)).toBe(false);
  });
});
