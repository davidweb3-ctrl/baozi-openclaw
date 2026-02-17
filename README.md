# BaoziClaw — Prediction Market Skill for OpenClaw

Trade, create, and manage Solana prediction markets from your OpenClaw agent. Autonomous 24/7 market analysis, betting, and market creation — powered by [Baozi.bet](https://baozi.bet).

## Why BaoziClaw?

[PolyClaw](https://github.com/nicejuice-xyz/polyclaw) proved that OpenClaw + prediction markets = real money ($115K/week on Polymarket). BaoziClaw brings the same concept to **Solana-native pari-mutuel markets** with features no other prediction market has:

- **Lab markets** — your agent can CREATE markets, not just bet on them
- **Affiliate system** — earn 1% commission on every bet referred by your agent
- **Creator fees** — earn 0.5% on all volume in markets you create
- **Race markets** — multi-outcome (2-10) markets, not just Yes/No
- **Zero backend dependency** — reads directly from Solana blockchain

## Skill Capabilities

```
Read (no wallet needed):
  baozi_list_markets       — Browse active markets with filters (layer, status, search)
  baozi_get_odds           — Implied probabilities and pool sizes
  baozi_get_portfolio      — View positions for any wallet
  baozi_analyze_market     — Statistical summary with favorite and implied return

Trade (requires SOLANA_PRIVATE_KEY):
  baozi_place_bet          — Bet SOL on any market outcome
  baozi_place_bet_affiliate — Bet with affiliate tracking (1% to referrer)
  baozi_claim_winnings     — Claim SOL from resolved markets

Create (requires SOLANA_PRIVATE_KEY):
  baozi_create_profile     — One-time creator profile setup
  baozi_create_market      — Create a boolean Lab market
  baozi_create_race_market — Create a multi-outcome Lab race market
  baozi_close_market       — Close expired market (permissionless)
  baozi_resolve_market     — Propose resolution for own Lab market

Affiliate:
  baozi_register_affiliate — Register a referral code
  baozi_claim_affiliate    — Claim accumulated referral earnings
```

## Quick Start

```bash
# Install the skill
openclaw skill install baozi-prediction-markets

# Or clone and install locally
git clone https://github.com/bolivian-peru/baozi-openclaw
cd baozi-openclaw
openclaw skill install .
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_RPC_URL` | Yes | Solana RPC endpoint (Helius, QuickNode — NOT public RPC) |
| `SOLANA_PRIVATE_KEY` | For trading | Base58-encoded 64-byte secret key |

### Example Prompts

```
"What prediction markets are active on Baozi right now?"
"Show me the odds for BTC markets"
"Bet 0.1 SOL on Yes for market 847"
"Create a market: Will ETH be above $5000 at 00:00 UTC Mar 1?"
"What's my portfolio worth?"
"Claim all my winnings"
```

## Architecture

```
OpenClaw Agent
    │
    ├── SKILL.md (instructions + tool definitions)
    │
    ├── scripts/
    │   ├── list-markets.sh      → Calls @baozi.bet/mcp-server tools
    │   ├── place-bet.sh         → Signs and sends Solana transactions
    │   ├── create-market.sh     → Creates Lab markets on-chain
    │   └── ...
    │
    └── lib/
        ├── baozi-client.ts      → Shared RPC + transaction logic
        └── borsh-parser.ts      → On-chain account data parsing
```

**Two implementation paths:**

1. **MCP Bridge** (simpler) — Use `openclaw-mcp-adapter` to connect to the existing `@baozi.bet/mcp-server` (68 tools)
2. **Native Skill** (better UX) — Direct Solana RPC calls from scripts/, first-class ClawHub citizen

## Bounties

We're paying SOL for contributions. See **[Open Bounty Issues](../../issues?q=is%3Aissue+is%3Aopen+label%3Abounty)** for available work.

| Bounty | SOL | Description |
|--------|-----|-------------|
| [Core Skill](#) | 3.0 | Foundation skill — read, trade, create markets |
| [Alpha Hunter](#) | 2.0 | Autonomous odds arbitrage with cron |
| [Market Factory](#) | 2.5 | Auto-create markets from news/events |
| [Claw Swarm](#) | 3.0 | Multi-agent coordination for market analysis |
| [Whale Watcher](#) | 1.5 | Track smart money + auto-follow bets |
| [Affiliate Army](#) | 2.0 | Viral social distribution with referral tracking |
| [Resolution Oracle](#) | 1.5 | Auto-fetch and submit resolution proofs |

**Total: 15.5 SOL (~$2,500)**. First working submission wins each bounty.

## Baozi Market Layers

| Layer | Who Creates | Platform Fee | Your Agent Can... |
|-------|------------|-------------|-------------------|
| **Official** | Admin only | 2.5% | Read + Bet |
| **Lab** | Anyone with CreatorProfile | 3.0% | Read + Bet + Create + Resolve |
| **Private** | Anyone with CreatorProfile | 2.0% | Read + Bet (if whitelisted) |

## Fee Structure

| Layer | Platform Fee | Creator Cut | Affiliate Cut | Protocol |
|-------|-------------|-------------|---------------|----------|
| Official | 2.5% | 0.5% | 1.0% | 1.0% |
| Lab | 3.0% | 0.5% | 1.0% | 1.5% |
| Private | 2.0% | 0.5% | 1.0% | 0.5% |

Your agent earns from **three revenue streams simultaneously:**
1. **Betting profits** — win bets, collect winnings
2. **Creator fees (0.5%)** — create popular markets
3. **Affiliate commissions (1%)** — refer other agents/users

## Related Projects

- [@baozi.bet/mcp-server](https://github.com/bolivian-peru/baozi-mcp) — MCP server with 68 tools (the underlying toolset)
- [polyclaw](https://github.com/nicejuice-xyz/polyclaw) — Polymarket skill for OpenClaw (architectural inspiration)
- [Baozi.bet](https://baozi.bet) — The prediction market platform
- [OpenClaw Docs](https://docs.openclaw.ai) — Skill development documentation

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for bounty claim process and development guidelines.

## License

MIT
