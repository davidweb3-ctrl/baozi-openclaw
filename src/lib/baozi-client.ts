/**
 * Baozi API Client
 * Handles all interactions with the Baozi platform
 */

import fetch from 'node-fetch';
import type { Market, Position, ClaimableWinnings, MarketResolution } from '../types.js';

const DEFAULT_API_URL = 'https://baozi.bet/api';

export class BaoziClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Get active markets
   */
  async listMarkets(options: {
    status?: 'active' | 'closed' | 'all';
    layer?: 'official' | 'lab' | 'private' | 'all';
    limit?: number;
  } = {}): Promise<Market[]> {
    const params = new URLSearchParams();
    if (options.status && options.status !== 'all') {
      params.append('status', options.status);
    }
    if (options.layer && options.layer !== 'all') {
      params.append('layer', options.layer);
    }
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }

    const url = `${this.baseUrl}/markets?${params.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch markets: ${response.statusText}`);
    }

    const data = await response.json() as { markets: unknown[] };
    return data.markets.map(this.parseMarket);
  }

  /**
   * Get positions for a wallet
   */
  async getPositions(wallet: string): Promise<Position[]> {
    const url = `${this.baseUrl}/positions/${wallet}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch positions: ${response.statusText}`);
    }

    const data = await response.json() as { positions: unknown[] };
    return data.positions.map(this.parsePosition);
  }

  /**
   * Get claimable winnings for a wallet
   */
  async getClaimable(wallet: string): Promise<ClaimableWinnings[]> {
    const url = `${this.baseUrl}/claimable/${wallet}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch claimable: ${response.statusText}`);
    }

    const data = await response.json() as { claimable: unknown[] };
    return data.claimable.map(this.parseClaimable);
  }

  /**
   * Get resolution status for markets a wallet is in
   */
  async getResolutionStatus(wallet: string): Promise<MarketResolution[]> {
    const url = `${this.baseUrl}/resolutions/${wallet}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch resolution status: ${response.statusText}`);
    }

    const data = await response.json() as { resolutions: unknown[] };
    return data.resolutions.map(this.parseResolution);
  }

  /**
   * Get detailed market info
   */
  async getMarket(marketId: string): Promise<Market> {
    const url = `${this.baseUrl}/markets/${marketId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch market: ${response.statusText}`);
    }

    const data = await response.json() as unknown;
    return this.parseMarket(data);
  }

  /**
   * Get quote/odds for a market
   */
  async getQuote(marketId: string): Promise<{ odds: number[]; pool: number }> {
    const url = `${this.baseUrl}/quote/${marketId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch quote: ${response.statusText}`);
    }

    const data = await response.json() as { odds: number[]; pool: number };
    return data;
  }

  // Parser helpers
  private parseMarket(data: unknown): Market {
    const m = data as Record<string, unknown>;
    return {
      id: String(m.id || m.pda || ''),
      pda: String(m.pda || m.id || ''),
      question: String(m.question || ''),
      status: String(m.status || 'active') as Market['status'],
      layer: String(m.layer || 'lab') as Market['layer'],
      outcomes: Array.isArray(m.outcomes) ? m.outcomes.map(String) : ['Yes', 'No'],
      odds: Array.isArray(m.odds) ? m.odds.map(Number) : [50, 50],
      pool: Number(m.pool || m.totalPool || 0),
      closingTime: String(m.closingTime || m.closing_time || new Date().toISOString()),
      resolution: m.resolution ? String(m.resolution) : undefined,
    };
  }

  private parsePosition(data: unknown): Position {
    const p = data as Record<string, unknown>;
    return {
      marketId: String(p.marketId || p.market_id || ''),
      marketQuestion: String(p.marketQuestion || p.market_question || ''),
      outcome: Number(p.outcome || 0),
      outcomeName: String(p.outcomeName || p.outcome_name || ''),
      amount: Number(p.amount || p.stake || 0),
      potentialWinnings: Number(p.potentialWinnings || p.potential_winnings || 0),
      currentOdds: Number(p.currentOdds || p.current_odds || 50),
    };
  }

  private parseClaimable(data: unknown): ClaimableWinnings {
    const c = data as Record<string, unknown>;
    return {
      marketId: String(c.marketId || c.market_id || ''),
      marketQuestion: String(c.marketQuestion || c.market_question || ''),
      winningOutcome: Number(c.winningOutcome || c.winning_outcome || 0),
      winningOutcomeName: String(c.winningOutcomeName || c.winning_outcome_name || ''),
      amount: Number(c.amount || c.winnings || 0),
    };
  }

  private parseResolution(data: unknown): MarketResolution {
    const r = data as Record<string, unknown>;
    return {
      marketId: String(r.marketId || r.market_id || ''),
      marketQuestion: String(r.marketQuestion || r.market_question || ''),
      resolvedOutcome: Number(r.resolvedOutcome || r.resolved_outcome || 0),
      resolvedOutcomeName: String(r.resolvedOutcomeName || r.resolved_outcome_name || ''),
      userBetOutcome: Number(r.userBetOutcome || r.user_bet_outcome || 0),
      userWon: Boolean(r.userWon || r.user_won || false),
      claimableAmount: Number(r.claimableAmount || r.claimable_amount || 0),
    };
  }
}