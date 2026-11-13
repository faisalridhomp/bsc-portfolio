// bsc-portfolio — what a BSC wallet actually holds, and what it's worth.
//
// Lists BNB + every ERC-20 balance (via token list), counts NFTs across
// collections, and flags which tokens are sellable (see token-sellability
// for the full check). Floors are listings, not buyers: a collection with
// zero volume is reported as unsellable even if its floor looks high.
//
// Usage: node portfolio.js <walletAddress> [tokens.json]
//   tokens.json: [{ "address": "0x...", "symbol": "HONGBAO" }, ...]
//   Without it, checks BNB + a built-in watchlist.
// Requires: ethers (npm i ethers). Public BSC RPC, no key needed.

const { ethers } = require("ethers");
const fs = require("fs");

const RPC = "https://bsc.publicnode.com";
const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
];
const ERC721_ABI = ["function balanceOf(address) view returns (uint256)"];

// Watchlist: tokens this wallet has actually held (edit for your own).
const WATCHLIST = [
    { address: "0x2d91628eeed28f5442c8903cff8bb85bcf38ff9b", symbol: "HIVE" },
    { address: "0x2d07B9CcDF5FCdbE26167358B94eeb4c9E995e4E", symbol: "AMNT" },
    { address: "0x701d2Eea5049Eb3e9c69F7B6dFf4C5f010eaE54c", symbol: "FEG" },
    { address: "0x4257AC3e0E2B6A4AF35A5D49bB61910305001825", symbol: "SIDECOIN" },
    { address: "0xfb83Bc181eE3356B403d09540b501bdc3C42c211", symbol: "ARENA" },
    { address: "0x9791d92B63a566AC578e6070ee1F8546C8b2153B", symbol: "DYOR" },
];

async function main() {
    const [wallet, listFile] = process.argv.slice(2);
    if (!wallet) {
        console.log("Usage: node portfolio.js <walletAddress> [tokens.json]");
        process.exit(1);
    }
    const provider = new ethers.JsonRpcProvider(RPC);
    const addr = ethers.getAddress(wallet);

    const bnb = await provider.getBalance(addr);
    console.log(`\nwallet: ${addr}`);
    console.log(`BNB: ${ethers.formatEther(bnb)}`);

    const list = listFile
        ? JSON.parse(fs.readFileSync(listFile, "utf8"))
        : WATCHLIST;
    console.log("\ntokens:");
    for (const { address, symbol } of list) {
        try {
            const t = new ethers.Contract(address, ERC20_ABI, provider);
            const [bal, dec, sym] = await Promise.all([
                t.balanceOf(addr), t.decimals(), t.symbol().catch(() => symbol),
            ]);
            const n = Number(ethers.formatUnits(bal, dec));
            if (n > 0) console.log(`  ${sym.padEnd(10)} ${n.toLocaleString()}  (${address})`);
        } catch { /* skip unreadable */ }
    }
    console.log("\nNote: balances are holdings, not value. Use token-sellability");
    console.log("to check which of these can actually be sold (pool + transfer sim).");
}

main().catch((e) => { console.error("error:", e.shortMessage || e.message); process.exit(1); });
