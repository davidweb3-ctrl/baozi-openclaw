/**
 * Claim & Alert Agent
 * Main entry point for the monitoring agent
 */

import { AlertEngine } from './lib/alert-engine.js';
import { TelegramProvider, DiscordProvider, WebhookProvider } from './notifications/providers.js';
import type { AgentConfig, NotificationProvider } from './types.js';

export class ClaimAlertAgent {
  private engine: AlertEngine;
  private notifier: NotificationProvider;
  private config: AgentConfig;
  private intervalId?: NodeJS.Timeout;

  constructor(config: AgentConfig) {
    this.config = config;
    this.engine = new AlertEngine(config);
    this.notifier = this.createNotifier(config.channel);
  }

  /**
   * Start the monitoring agent
   */
  start(): void {
    console.log(`🚀 Starting Claim & Alert Agent`);
    console.log(`   Monitoring ${this.config.wallets.length} wallet(s)`);
    console.log(`   Poll interval: ${this.config.pollIntervalMinutes} minutes`);
    console.log(`   Notifications: ${this.config.channel.type}`);

    // Run immediately
    this.checkAndNotify();

    // Schedule subsequent runs
    const intervalMs = this.config.pollIntervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => this.checkAndNotify(), intervalMs);
  }

  /**
   * Stop the monitoring agent
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('🛑 Agent stopped');
    }
  }

  /**
   * Run a single check and send notifications
   */
  async checkAndNotify(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Checking wallets...`);

    try {
      const alerts = await this.engine.checkWallets();
      
      if (alerts.length === 0) {
        console.log('   No alerts to send');
        return;
      }

      console.log(`   Sending ${alerts.length} alert(s)...`);

      for (const alert of alerts) {
        try {
          await this.notifier.send(alert);
          console.log(`   ✓ Sent: ${alert.title}`);
        } catch (error) {
          console.error(`   ✗ Failed to send alert:`, error);
        }
      }
    } catch (error) {
      console.error('Error during check:', error);
    }
  }

  /**
   * Create the appropriate notification provider
   */
  private createNotifier(channel: AgentConfig['channel']): NotificationProvider {
    switch (channel.type) {
      case 'telegram':
        return new TelegramProvider(channel.config as { botToken: string; chatId: string });
      case 'discord':
        return new DiscordProvider(channel.config as { webhookUrl: string });
      case 'webhook':
        return new WebhookProvider(channel.config as { url: string; headers?: Record<string, string> });
      default:
        throw new Error(`Unknown notification channel type: ${(channel as {type: string}).type}`);
    }
  }
}

// Export types and components
export { AlertEngine } from './lib/alert-engine.js';
export { BaoziClient } from './lib/baozi-client.js';
export { TelegramProvider, DiscordProvider, WebhookProvider } from './notifications/providers.js';
export * from './types.js';