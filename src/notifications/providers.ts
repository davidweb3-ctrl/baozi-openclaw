/**
 * Notification providers for the Claim & Alert Agent
 */

import fetch from 'node-fetch';
import type { Alert, TelegramConfig, DiscordConfig, WebhookConfig, NotificationProvider } from '../types.js';

/**
 * Telegram notification provider
 */
export class TelegramProvider implements NotificationProvider {
  private botToken: string;
  private chatId: string;
  private baseUrl = 'https://api.telegram.org/bot';

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
  }

  async send(alert: Alert): Promise<void> {
    const message = this.formatMessage(alert);
    const url = `${this.baseUrl}${this.botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram send failed: ${error}`);
    }
  }

  private formatMessage(alert: Alert): string {
    const emoji = this.getEmoji(alert.type);
    const timestamp = alert.timestamp.toISOString().slice(0, 19).replace('T', ' ');
    
    let message = `<b>${emoji} ${alert.title}</b>\n\n`;
    message += `${alert.message}\n\n`;
    message += `<i>Wallet: ${alert.wallet.slice(0, 8)}...${alert.wallet.slice(-8)}</i>\n`;
    message += `<i>Time: ${timestamp} UTC</i>`;
    
    return message;
  }

  private getEmoji(type: Alert['type']): string {
    switch (type) {
      case 'market_resolved': return '🎉';
      case 'unclaimed_winnings': return '💰';
      case 'closing_soon': return '⏰';
      case 'odds_shift': return '📊';
      default: return 'ℹ️';
    }
  }
}

/**
 * Discord webhook notification provider
 */
export class DiscordProvider implements NotificationProvider {
  private webhookUrl: string;

  constructor(config: DiscordConfig) {
    this.webhookUrl = config.webhookUrl;
  }

  async send(alert: Alert): Promise<void> {
    const embed = this.formatEmbed(alert);
    
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord send failed: ${error}`);
    }
  }

  private formatEmbed(alert: Alert): Record<string, unknown> {
    const color = this.getColor(alert.type);
    const timestamp = alert.timestamp.toISOString();
    
    return {
      title: alert.title,
      description: alert.message,
      color: color,
      timestamp: timestamp,
      footer: {
        text: `Wallet: ${alert.wallet.slice(0, 8)}...${alert.wallet.slice(-8)}`,
      },
    };
  }

  private getColor(type: Alert['type']): number {
    switch (type) {
      case 'market_resolved': return 0x00ff00; // Green
      case 'unclaimed_winnings': return 0xffd700; // Gold
      case 'closing_soon': return 0xffa500; // Orange
      case 'odds_shift': return 0x3498db; // Blue
      default: return 0x95a5a6; // Gray
    }
  }
}

/**
 * Generic webhook notification provider
 */
export class WebhookProvider implements NotificationProvider {
  private url: string;
  private headers: Record<string, string>;

  constructor(config: WebhookConfig) {
    this.url = config.url;
    this.headers = config.headers || { 'Content-Type': 'application/json' };
  }

  async send(alert: Alert): Promise<void> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        type: alert.type,
        title: alert.title,
        message: alert.message,
        wallet: alert.wallet,
        data: alert.data,
        timestamp: alert.timestamp.toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Webhook send failed: ${error}`);
    }
  }
}