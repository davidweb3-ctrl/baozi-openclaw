/**
 * Configuration types for the Claim & Alert Agent
 */

export interface AlertConfig {
  claimable: boolean;
  closingSoon: boolean;
  closingSoonHours: number;
  oddsShift: boolean;
  oddsShiftThreshold: number; // percentage
}

export interface NotificationChannel {
  type: 'telegram' | 'discord' | 'webhook';
  config: TelegramConfig | DiscordConfig | WebhookConfig;
}

export interface NotificationProvider {
  send(alert: Alert): Promise<void>;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface DiscordConfig {
  webhookUrl: string;
}

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
}

export interface AgentConfig {
  wallets: string[];
  alerts: AlertConfig;
  channel: NotificationChannel;
  pollIntervalMinutes: number;
  baoziApiUrl: string;
}

// Market types
export interface Market {
  id: string;
  pda: string;
  question: string;
  status: 'active' | 'closed' | 'resolved';
  layer: 'official' | 'lab' | 'private';
  outcomes: string[];
  odds: number[];
  pool: number;
  closingTime: string;
  resolution?: string;
}

export interface Position {
  marketId: string;
  marketQuestion: string;
  outcome: number;
  outcomeName: string;
  amount: number;
  potentialWinnings: number;
  currentOdds: number;
}

export interface ClaimableWinnings {
  marketId: string;
  marketQuestion: string;
  winningOutcome: number;
  winningOutcomeName: string;
  amount: number;
}

export interface MarketResolution {
  marketId: string;
  marketQuestion: string;
  resolvedOutcome: number;
  resolvedOutcomeName: string;
  userBetOutcome: number;
  userWon: boolean;
  claimableAmount: number;
}

// Alert types
export interface Alert {
  type: 'market_resolved' | 'unclaimed_winnings' | 'closing_soon' | 'odds_shift';
  wallet: string;
  title: string;
  message: string;
  data: unknown;
  timestamp: Date;
}

export interface OddsShiftAlert extends Alert {
  type: 'odds_shift';
  data: {
    marketId: string;
    marketQuestion: string;
    oldOdds: number;
    newOdds: number;
    shiftPercentage: number;
    userOutcome: number;
    userOutcomeName: string;
  };
}

export interface ClosingSoonAlert extends Alert {
  type: 'closing_soon';
  data: {
    marketId: string;
    marketQuestion: string;
    hoursRemaining: number;
    userPosition: Position;
  };
}

export interface MarketResolvedAlert extends Alert {
  type: 'market_resolved';
  data: MarketResolution;
}

export interface UnclaimedWinningsAlert extends Alert {
  type: 'unclaimed_winnings';
  data: {
    totalAmount: number;
    markets: ClaimableWinnings[];
  };
}