import { test, expect } from "@playwright/test";
import { config } from "dotenv";
import { createDbClient } from "../src/db/client";
import { invoices, organizations } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { DEMO_ORG_SLUG } from "../src/lib/org/context";
import { ARC_TESTNET_CHAIN_ID } from "../src/lib/arc/chain";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Minimal EIP-1193 mock provider for Playwright.
 * Supports connect, chainId, switch/add network, accounts, and balance.
 */
function mockWalletInitScript(opts: {
  chainIdHex: string;
  address: string;
  wrongChainIdHex?: string;
}) {
  const startChain = opts.wrongChainIdHex ?? opts.chainIdHex;
  return `
    (() => {
      let chainId = ${JSON.stringify(startChain)};
      const address = ${JSON.stringify(opts.address)};
      const targetChain = ${JSON.stringify(opts.chainIdHex)};
      const listeners = {};
      const provider = {
        isMetaMask: true,
        request: async ({ method, params }) => {
          if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
            return [address];
          }
          if (method === 'eth_chainId') return chainId;
          if (method === 'wallet_switchEthereumChain') {
            const next = params?.[0]?.chainId;
            if (next !== targetChain && next !== chainId) {
              const err = new Error('Unrecognized chain');
              err.code = 4902;
              throw err;
            }
            chainId = next || targetChain;
            (listeners['chainChanged'] || []).forEach((cb) => cb(chainId));
            return null;
          }
          if (method === 'wallet_addEthereumChain') {
            chainId = params?.[0]?.chainId || targetChain;
            (listeners['chainChanged'] || []).forEach((cb) => cb(chainId));
            return null;
          }
          if (method === 'eth_getBalance') {
            // 10 native USDC (18 decimals)
            return '0x' + (10n * 10n ** 18n).toString(16);
          }
          if (method === 'eth_blockNumber') return '0x1';
          if (method === 'eth_estimateGas') return '0x5208';
          if (method === 'eth_gasPrice' || method === 'eth_maxPriorityFeePerGas') return '0x1';
          if (method === 'eth_getTransactionCount') return '0x0';
          if (method === 'eth_call') return '0x';
          if (method === 'personal_sign' || method === 'eth_sign') return '0x' + 'ab'.repeat(65);
          return null;
        },
        on(event, cb) {
          listeners[event] = listeners[event] || [];
          listeners[event].push(cb);
        },
        removeListener(event, cb) {
          listeners[event] = (listeners[event] || []).filter((x) => x !== cb);
        },
      };
      window.ethereum = provider;
    })();
  `;
}

async function getIssuedToken(): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  const { db, sql } = createDbClient();
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, DEMO_ORG_SLUG))
      .limit(1);
    if (!org) return null;

    // Ensure merchant wallet exists for payment preparation demos
    if (!org.merchantWalletAddress) {
      await db
        .update(organizations)
        .set({
          merchantWalletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, org.id));
    }

    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, org.id));
    const issued = rows.find(
      (i) =>
        ["issued", "partially_paid", "overdue"].includes(i.status) &&
        i.amountDue > 0,
    );
    return issued?.publicPaymentToken ?? null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

test.describe("Wallet connect and payment preparation", () => {
  test("connect, wrong network, switch, prepare payment", async ({ page }) => {
    const token = await getIssuedToken();
    test.skip(!token, "No issued demo invoice");

    const address = "0xdddddddddddddddddddddddddddddddddddddddd";
    const arcHex = `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`;
    const ethMainnet = "0x1";

    await page.addInitScript(
      mockWalletInitScript({
        chainIdHex: arcHex,
        address,
        wrongChainIdHex: ethMainnet,
      }),
    );

    await page.goto(`/pay/${token}`);
    await expect(page.getByTestId("payment-prepare-panel")).toBeVisible();

    // Connect
    await page.getByTestId("connect-wallet").first().click();
    await expect(page.getByTestId("disconnect-wallet").first()).toBeVisible({
      timeout: 15_000,
    });

    // Wrong network state
    await expect(page.getByTestId("wrong-network")).toBeVisible();
    await page.getByTestId("switch-network").click();
    // After switch, wrong-network should clear
    await expect(page.getByTestId("wrong-network")).toHaveCount(0, {
      timeout: 15_000,
    });

    // Prepare payment
    await expect(page.getByTestId("prepare-payment")).toBeEnabled({
      timeout: 10_000,
    });
    await page.getByTestId("prepare-payment").click();
    await expect(page.getByTestId("prepare-review")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Payment intent ready/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Pay \(unavailable\)/i })).toBeDisabled();
  });
});
