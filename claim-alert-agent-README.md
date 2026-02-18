# Claim & Alert Agent

An agent that monitors Baozi prediction market wallets and sends notifications when action is needed: market resolved (claim your winnings), significant odds shifts, markets closing soon, and unclaimed winnings.

## Bounty

This implementation addresses [bolivian-peru/baozi-openclaw#11](https://github.com/bolivian-peru/baozi-openclaw/issues/11)
- **Bounty:** 0.5 SOL (~$80)
- **Status:** Complete implementation with TypeScript

## Features

- ✅ Wallet monitoring with configurable poll interval
- ✅ Claim alerts when winnings are available
- ✅ Market closing soon alerts (configurable hours threshold)
- ✅ Odds shift alerts (configurable percentage threshold)
- ✅ Multiple notification channels: Telegram, Discord, Webhook
- ✅ TypeScript with strict typing
- ✅ Comprehensive error handling

## Alert Types

| Alert | Description | Trigger |
|-------|-------------|---------|
| **Market Resolved** | Notification when a market you bet on resolves | Market status changes to resolved |
| **Unclaimed Winnings** | Summary of available winnings to claim | User has claimable SOL |
| **Closing Soon** | Reminder before market closes | Market closes within threshold hours |
| **Odds Shift** | Notification when odds change significantly | Odds shift exceeds threshold % |

## Quick Start

### 1. Install dependencies

```bash
cd claim-alert-agent
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Configure environment

```bash
export WATCH_WALLETS="WALLET1,WALLET2"
export NOTIFICATION_CHANNEL="telegram"  # or discord, webhook
export POLL_INTERVAL_MINUTES=15

# For Telegram
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"

# For Discord
export DISCORD_WEBHOOK_URL="your_webhook_url"

# For Webhook
export WEBHOOK_URL="your_webhook_url"
```

### 4. Run

```bash
npm start
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WATCH_WALLETS` | Yes | - | Comma-separated list of wallet addresses |
| `NOTIFICATION_CHANNEL` | No | `webhook` | `telegram`, `discord`, or `webhook` |
| `POLL_INTERVAL_MINUTES` | No | `15` | How often to check wallets |
| `ALERT_CLAIMABLE` | No | `true` | Enable claimable winnings alerts |
| `ALERT_CLOSING_SOON` | No | `true` | Enable closing soon alerts |
| `ALERT_CLOSING_HOURS` | No | `6` | Hours before close to alert |
| `ALERT_ODDS_SHIFT` | No | `true` | Enable odds shift alerts |
| `ALERT_ODDS_THRESHOLD` | No | `15` | Percentage shift threshold |
| `BAOZI_API_URL` | No | `https://baozi.bet/api` | Baozi API endpoint |

### Channel-Specific Variables

**Telegram:**
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `TELEGRAM_CHAT_ID` - Chat ID or channel username

**Discord:**
- `DISCORD_WEBHOOK_URL` - Webhook URL from server settings

**Webhook:**
- `WEBHOOK_URL` - Your webhook endpoint
- `WEBHOOK_HEADERS` - Optional JSON headers object

## Architecture

```
src/
├── index.ts              # CLI entry point
├── agent.ts              # Main agent orchestration
├── types.ts              # TypeScript type definitions
├── lib/
│   ├── baozi-client.ts   # Baozi API client
│   └── alert-engine.ts   # Alert generation logic
└── notifications/
    └── providers.ts      # Notification channel implementations
```

## Testing

Run the test suite:

```bash
npm test
```

Run type checking:

```bash
npm run check-types
```

Run linting:

```bash
npm run lint
```

## Example Output

```
═══════════════════════════════════════════
     Baozi Claim & Alert Agent v1.0.0
═══════════════════════════════════════════

🚀 Starting Claim & Alert Agent
   Monitoring 2 wallet(s)
   Poll interval: 15 minutes
   Notifications: telegram

[2026-02-18T09:00:00.000Z] Checking wallets...
   ✓ Sent: Unclaimed Winnings Available!
   ✓ Sent: Market Closing Soon!
[2026-02-18T09:15:00.000Z] Checking wallets...
   No alerts to send
```

## API Integration

The agent integrates with Baozi's read-only APIs:

- `GET /api/positions/{wallet}` - User's current positions
- `GET /api/claimable/{wallet}` - Unclaimed winnings
- `GET /api/resolutions/{wallet}` - Market resolutions for user
- `GET /api/markets/{id}` - Market details
- `GET /api/quote/{id}` - Current odds

## License

MIT