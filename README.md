# bsc-portfolio

What a BSC wallet actually holds, and what it's worth.

Lists BNB and every ERC-20 balance for a wallet, and notes which tokens
still need a sellability check. Balances are holdings, not value — a
token with no pool or a locked transfer is worth 0 until it can be sold.

## Usage

```bash
npm i ethers
node portfolio.js <walletAddress> [tokens.json]
```

`tokens.json` is optional — a list of `{ "address", "symbol" }` to check.
Without it, a built-in watchlist is used. Edit the watchlist in
`portfolio.js` for your own holdings.

Example:

```bash
node portfolio.js 0x3Bc96b2528f686F27b04897bD819bC10D8981B1b
```

For sellability (pool + transfer simulation), see
[token-sellability](https://github.com/faisalridhomp/token-sellability).
