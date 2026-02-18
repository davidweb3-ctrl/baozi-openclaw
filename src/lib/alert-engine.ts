/**
 * Alert Engine
 * Monitors wallets and generates alerts based on configured triggers
 */

import { BaoziClient } from './baozi-client.js';
import type {
  AgentConfig,
  Alert,
  Market,
  Position,
  MarketResolution,
  ClaimableWinnings,
  OddsShiftAlert,
  ClosingSoonAlert,
  MarketResolvedAlert,
  UnclaimedWinningsAlert,
} from '../types.js';

interface CachedData {
  positions: Position[];
  odds: Map<string, number[]>;
  lastCheck: Date;
}

export class AlertEngine {
  private client: BaoziClient;
  private config: AgentConfig;
  private cache: Map<string, CachedData> = new Map();

  constructor(config: AgentConfig) {
    this.config = config;
    this.client = new BaoziClient(config.baoziApiUrl);
  }

  /**
   * Check all configured wallets for alerts
   */
  async checkWallets(): Promise<Alert[]> {
    const allAlerts: Alert[] = [];

    for (const wallet of this.config.wallets) {
      try {
        const alerts = await this.checkWallet(wallet);
        allAlerts.push(...alerts);
      } catch (error) {
        console.error(`Error checking wallet ${wallet}:`, error);
      }
    }

    return allAlerts;
  }

  /**
   * Check a single wallet for alerts
   */
  private async checkWallet(wallet: string): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const cached = this.cache.get(wallet);

    // Fetch current data
    const [positions, claimable, resolutions] = await Promise.all([
      this.client.getPositions(wallet),
      this.config.alerts.claimable ? this.client.getClaimable(wallet) : Promise.resolve([]),
      this.config.alerts.claimable ? this.client.getResolutionStatus(wallet) : Promise.resolve([]),
    ]);

    // Update cache
    const currentOdds = new Map<string, number[]>();
    for (const position of positions) {
      try {
        const quote = await this.client.getQuote(position.marketId);
        currentOdds.set(position.marketId, quote.odds);
      } catch {
        // Skip if quote fails
      }
    }

    this.cache.set(wallet, {
      positions,
      odds: currentOdds,
      lastCheck: new Date(),
    });

    // Check for market resolved alerts
    if (this.config.alerts.claimable) {
      const resolvedAlerts = this.checkMarketResolved(wallet, resolutions);
      alerts.push(...resolvedAlerts);
    }

    // Check for unclaimed winnings
    if (this.config.alerts.claimable && claimable.length > 0) {
      const unclaimedAlert = this.checkUnclaimedWinnings(wallet, claimable);
      if (unclaimedAlert) {
        alerts.push(unclaimedAlert);
      }
    }

    // Check for closing soon alerts
    if (this.config.alerts.closingSoon) {
      const closingAlerts = await this.checkClosingSoon(wallet, positions);
      alerts.push(...closingAlerts);
    }

    // Check for odds shift alerts
    if (this.config.alerts.oddsShift && cached) {
      const oddsAlerts = this.checkOddsShift(wallet, positions, cached.odds, currentOdds);
      alerts.push(...oddsAlerts);
    }

    return alerts;
  }

  /**
   * Check for resolved markets that user bet on
   */
  private checkMarketResolved(wallet: string, resolutions: MarketResolution[]): MarketResolvedAlert[] {
    const alerts: MarketResolvedAlert[] = [];

    for (const resolution of resolutions) {
      if (resolution.userWon && resolution.claimableAmount > 0) {
        alerts.push({
          type: 'market_resolved',
          wallet,
          title: 'Market Resolved - Claim Your Winnings!',
          message: `Market "${resolution.marketQuestion}" resolved ${resolution.resolvedOutcomeName}. ` +
            `You bet ${resolution.userBetOutcome === resolution.resolvedOutcome ? 'correctly' : 'incorrectly'}. ` +
            `Claim ${resolution.claimableAmount.toFixed(4)} SOL at baozi.bet/my-bets`,
          data: resolution,
          timestamp: new Date(),
        });
      }
    }

    return alerts;
  }

  /**
   * Check for unclaimed winnings
   */
  private checkUnclaimedWinnings(wallet: string, claimable: ClaimableWinnings[]): UnclaimedWinningsAlert | null {
    if (claimable.length === 0) return null;

    const totalAmount = claimable.reduce((sum, c) => sum + c.amount, 0);
    
    return {
      type: 'unclaimed_winnings',
      wallet,
      title: 'Unclaimed Winnings Available!',
      message: `You have ${totalAmount.toFixed(4)} SOL unclaimed across ${claimable.length} market(s). ` +
        `Claim at baozi.bet/my-bets`,
      data: {
        totalAmount,
        markets: claimable,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Check for markets closing soon
   */
  private async checkClosingSoon(wallet: string, positions: Position[]): Promise<ClosingSoonAlert[]> {
    const alerts: ClosingSoonAlert[] = [];
    const thresholdMs = this.config.alerts.closingSoonHours * 60 * 60 * 1000;
    const now = new Date().getTime();

    for (const position of positions) {
      try {
        const market = await this.client.getMarket(position.marketId);
        const closingTime = new Date(market.closingTime).getTime();
        const timeRemaining = closingTime - now;

        if (timeRemaining > 0 && timeRemaining <= thresholdMs && market.status === 'active') {
          const hoursRemaining = Math.ceil(timeRemaining / (60 * 60 * 1000));
          
          alerts.push({
            type: 'closing_soon',
            wallet,
            title: 'Market Closing Soon!',
            message: `Market "${market.question}" closes in ${hoursRemaining} hours. ` +
              `Your position: ${position.amount.toFixed(4)} SOL on ${position.outcomeName} (${position.currentOdds}%)`,
            data: {
              marketId: market.id,
              marketQuestion: market.question,
              hoursRemaining,
              userPosition: position,
            },
            timestamp: new Date(),
          });
        }
      } catch {
        // Skip if market fetch fails
      }
    }

    return alerts;
  }

  /**
   * Check for significant odds shifts
   */
  private checkOddsShift(
    wallet: string,
    positions: Position[],
    oldOdds: Map<string, number[]>,
    newOdds: Map<string, number[]>
  ): OddsShiftAlert[] {
    const alerts: OddsShiftAlert[] = [];
    const threshold = this.config.alerts.oddsShiftThreshold;

    for (const position of positions) {
      const marketOldOdds = oldOdds.get(position.marketId);
      const marketNewOdds = newOdds.get(position.marketId);

      if (!marketOldOdds || !marketNewOdds) continue;

      const oldUserOdds = marketOldOdds[position.outcome] || 0;
      const newUserOdds = marketNewOdds[position.outcome] || 0;

      if (oldUserOdds === 0) continue;

      const shiftPercentage = Math.abs(newUserOdds - oldUserOdds);

      if (shiftPercentage >= threshold) {
        const direction = newUserOdds > oldUserOdds ? 'up' : 'down';
        
        alerts.push({
          type: 'odds_shift',
          wallet,
          title: 'Significant Odds Shift Detected!',
          message: `Odds on "${position.marketQuestion}" shifted ${direction} from ${oldUserOdds.toFixed(1)}% to ${newUserOdds.toFixed(1)}% ` +
            `for ${position.outcomeName}. You hold ${position.amount.toFixed(4)} SOL on this outcome.`,
          data: {
            marketId: position.marketId,
            marketQuestion: position.marketQuestion,
            oldOdds: oldUserOdds,
            newOdds: newUserOdds,
            shiftPercentage,
            userOutcome: position.outcome,
            userOutcomeName: position.outcomeName,
          },
          timestamp: new Date(),
        });
      }
    }

    return alerts;
  }
}