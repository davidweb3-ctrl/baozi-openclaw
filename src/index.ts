/**
 * Claim & Alert Agent - CLI Entry Point
 */

import { ClaimAlertAgent } from './agent.js';
import type { AgentConfig } from './types.js';

function loadConfig(): AgentConfig {
  // Load from environment variables
  const wallets = process.env.WATCH_WALLETS?.split(',').map(w => w.trim()) || [];
  
  if (wallets.length === 0) {
    throw new Error('WATCH_WALLETS environment variable is required (comma-separated list)');
  }

  const channelType = process.env.NOTIFICATION_CHANNEL || 'webhook';
  const pollInterval = parseInt(process.env.POLL_INTERVAL_MINUTES || '15', 10);

  // Alert configuration
  const alerts = {
    claimable: process.env.ALERT_CLAIMABLE !== 'false',
    closingSoon: process.env.ALERT_CLOSING_SOON !== 'false',
    closingSoonHours: parseInt(process.env.ALERT_CLOSING_HOURS || '6', 10),
    oddsShift: process.env.ALERT_ODDS_SHIFT !== 'false',
    oddsShiftThreshold: parseInt(process.env.ALERT_ODDS_THRESHOLD || '15', 10),
  };

  // Channel configuration
  let channel: AgentConfig['channel'];
  
  switch (channelType) {
    case 'telegram': {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (!botToken || !chatId) {
        throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID required for Telegram notifications');
      }
      channel = { type: 'telegram', config: { botToken, chatId } };
      break;
    }
    case 'discord': {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error('DISCORD_WEBHOOK_URL required for Discord notifications');
      }
      channel = { type: 'discord', config: { webhookUrl } };
      break;
    }
    case 'webhook':
    default: {
      const webhookUrl = process.env.WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error('WEBHOOK_URL required for webhook notifications');
      }
      const headers = process.env.WEBHOOK_HEADERS 
        ? JSON.parse(process.env.WEBHOOK_HEADERS) 
        : undefined;
      channel = { type: 'webhook', config: { url: webhookUrl, headers } };
      break;
    }
  }

  return {
    wallets,
    alerts,
    channel,
    pollIntervalMinutes: pollInterval,
    baoziApiUrl: process.env.BAOZI_API_URL || 'https://baozi.bet/api',
  };
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════');
    console.log('     Baozi Claim & Alert Agent v1.0.0');
    console.log('═══════════════════════════════════════════\n');

    const config = loadConfig();
    const agent = new ClaimAlertAgent(config);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nReceived SIGINT, shutting down...');
      agent.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\nReceived SIGTERM, shutting down...');
      agent.stop();
      process.exit(0);
    });

    agent.start();
  } catch (error) {
    console.error('Failed to start agent:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();