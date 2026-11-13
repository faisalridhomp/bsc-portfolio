// bsc-portfolio — what a BSC wallet actually holds.
//
// Lists BNB + every ERC-20 balance (via token list). Balances are holdings,
// not value: a token with no pool or no buyers is worth ~0 even if the
// balance looks big. Use token-sellability to check which of these can
// actually be sold (pool + transfer sim).
//
// Token checks run IN PARALLEL with an 8s timeout each: public RPCs can
// stall, and a sequential loop without a timeout hangs the whole run.
//
// Usage: node portfolio.js <walletAddress> [tokens.json]
//   tokens.json: [{ "address": "0x...", "symbol": "HONGBAO" }, ...]
//   Without it, checks BNB + a built-in watchlist.
// Requires: ethers (npm i ethers). Public BSC RPC, no key needed.

const { ethers } = require("ethers");
const fs = require("fs");

const RPCS = [
    "https://bsc-dataseed1.ninicoin.io",
    "https://bsc-dataseed1.binance.org",
    "https://bsc-dataseed.bnbchain.org",
    "https://bsc.publicnode.com",
];
const TIMEOUT_MS = 8000;
const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
];

// Watchlist: tokens this wallet has actually held (edit for your own).
const WATCHLIST = [
    { address: "0x2d91628eeed28f5442c8903cff8bb85bcf38ff9b", symbol: "HIVE" },
    { address: "0x2d07B9CcDF5FCdbE26167358B94eeb4c9E995e4E", symbol: "AMNT" },
    { address: "0x701d2Eea5049Eb3e9c69F7B6dFf4C5f010eaE54c", symbol: "FEG" },
    { address: "0x4257AC3e0E2B6A4AF35A5D49bB61910305001825", symbol: "SIDECOIN" },
    { address: "0xfb83Bc181eE3356B403d09540b501bdc3C42c211", symbol: "ARENA" },
    { address: "0x9791d92B63a566AC578e6070ee1F8546C8b2153B", symbol: "DYOR" },
];

function withTimeout(promise, ms = TIMEOUT_MS) {
    return Promise.race([
        promise,
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
    ]);
}

async function pickProvider() {
    // First RPC that answers getBlockNumber wins (public RPCs stall often).
    for (const url of RPCS) {
        const p = new ethers.JsonRpcProvider(url);
        try {
            await withTimeout(p.getBlockNumber());
            return p;
        } catch {
            p.destroy();
        }
    }
    throw new Error("no RPC responded");
}

async function main() {
    const [wallet, listFile] = process.argv.slice(2);
    if (!wallet) {
        console.log("Usage: node portfolio.js <walletAddress> [tokens.json]");
        process.exit(1);
    }
    if (!ethers.isAddress(wallet)) {
        console.error(`ERROR: "${wallet}" is not a valid EVM wallet address (0x + 40 hex chars).`);
        process.exit(1);
    }
    const provider = await pickProvider();
    const addr = ethers.getAddress(wallet);

    const bnb = await withTimeout(provider.getBalance(addr));
    console.log(`\nwallet: ${addr}`);
    console.log(`BNB: ${ethers.formatEther(bnb)}`);

    const list = listFile
        ? JSON.parse(fs.readFileSync(listFile, "utf8"))
        : WATCHLIST;
    console.log("\ntokens:");
    const rows = await Promise.all(list.map(async ({ address, symbol }) => {
        try {
            const t = new ethers.Contract(address, ERC20_ABI, provider);
            const [bal, dec, sym] = await withTimeout(Promise.all([
                t.balanceOf(addr), t.decimals(), t.symbol().catch(() => symbol),
            ]));
            const n = Number(ethers.formatUnits(bal, dec));
            return n > 0 ? `  ${sym.padEnd(10)} ${n.toLocaleString()}  (${address})` : null;
        } catch {
            return `  ${symbol.padEnd(10)} (unreadable — RPC timeout or bad contract)`;
        }
    }));
    for (const row of rows) if (row) console.log(row);
    console.log("\nNote: balances are holdings, not value. Use token-sellability");
    console.log("to check which of these can actually be sold (pool + transfer sim).");
    provider.destroy();
}

main().catch((e) => { console.error("error:", e.shortMessage || e.message); process.exit(1); });
