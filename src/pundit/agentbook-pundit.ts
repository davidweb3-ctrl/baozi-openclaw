/**
 * AgentBook Pundit
 * AI Market Analyst that posts takes on AgentBook
 * 
 * Bounty: bolivian-peru/baozi-openclaw#8
 * Reward: 0.75 SOL (~$120)
 */

import fetch from 'node-fetch';
import { BaoziClient } from '../lib/baozi-client.js';
import type { Market } from '../types.js';

interface PunditConfig {
  walletAddress: string;
  signMessage: (message: string) => Promise<string>;
  baoziApiUrl: string;
  postCooldownMinutes: number;
  commentCooldownMinutes: number;
}

interface MarketAnalysis {
  market: Market;
  insight: string;
  confidence: 'high' | 'medium' | 'low';
  category: string;
}

interface AgentBookPost {
  walletAddress: string;
  content: string;
  marketPda?: string;
}

interface MarketComment {
  marketPda: string;
  content: string;
}

export class AgentBookPundit {
  private client: BaoziClient;
  private config: PunditConfig;
  private lastPostTime: Date | null = null;
  private lastCommentTimes: Map<string, Date> = new Map();

  constructor(config: PunditConfig) {
    this.config = config;
    this.client = new BaoziClient(config.baoziApiUrl);
  }

  /**
   * Run analysis and post to AgentBook
   */
  async runAnalysis(): Promise<void> {
    console.log('🔍 Running market analysis...');

    try {
      // Fetch active markets
      const markets = await this.client.listMarkets({ 
        status: 'active', 
        limit: 20 
      });

      if (markets.length === 0) {
        console.log('   No active markets found');
        return;
      }

      // Analyze markets
      const analyses = this.analyzeMarkets(markets);

      // Generate and post insights
      for (const analysis of analyses.slice(0, 2)) {
        await this.postToAgentBook(analysis);
      }

      // Comment on high-volume markets
      const highVolumeMarkets = markets
        .filter(m => m.pool > 5) // Markets with >5 SOL volume
        .slice(0, 2);

      for (const market of highVolumeMarkets) {
        await this.commentOnMarket(market);
      }

    } catch (error) {
      console.error('Error during analysis:', error);
    }
  }

  /**
   * Analyze markets and generate insights
   */
  private analyzeMarkets(markets: Market[]): MarketAnalysis[] {
    const analyses: MarketAnalysis[] = [];

    // Sort by volume for trending
    const trendingMarkets = [...markets].sort((a, b) => b.pool - a.pool).slice(0, 5);
    
    // Sort by closing soon
    const now = new Date();
    const closingSoonMarkets = markets
      .filter(m => new Date(m.closingTime) > now)
      .sort((a, b) => new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime())
      .slice(0, 3);

    // Generate analysis for trending markets
    for (const market of trendingMarkets) {
      const analysis = this.generateInsight(market, 'trending');
      if (analysis) analyses.push(analysis);
    }

    // Generate analysis for closing soon markets
    for (const market of closingSoonMarkets) {
      const analysis = this.generateInsight(market, 'closing');
      if (analysis) analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * Generate insight for a market
   */
  private generateInsight(market: Market, context: 'trending' | 'closing'): MarketAnalysis | null {
    const favoriteIndex = market.odds.indexOf(Math.max(...market.odds));
    const favorite = market.outcomes[favoriteIndex];
    const favoriteOdds = market.odds[favoriteIndex];
    const underdogOdds = Math.min(...market.odds);
    const spread = favoriteOdds - underdogOdds;

    let insight = '';
    let confidence: 'high' | 'medium' | 'low' = 'medium';

    if (context === 'trending') {
      if (market.pool > 50) {
        insight = `High volume market: ${market.pool.toFixed(1)} SOL pooled. ` +
          `${favorite} is the favorite at ${favoriteOdds}%. ` +
          `${spread > 30 ? 'Strong consensus' : 'Tight race'}.`;
        confidence = spread > 30 ? 'high' : 'medium';
      } else {
        insight = `Active market with ${market.pool.toFixed(1)} SOL volume. ` +
          `${favorite} leading at ${favoriteOdds}%.`;
      }
    } else {
      const hoursRemaining = Math.ceil(
        (new Date(market.closingTime).getTime() - Date.now()) / (60 * 60 * 1000)
      );
      insight = `Closing in ${hoursRemaining}h: ${market.question} — ` +
        `${favorite} at ${favoriteOdds}%. Last chance to bet.`;
      confidence = 'high';
    }

    return {
      market,
      insight,
      confidence,
      category: this.detectCategory(market.question),
    };
  }

  /**
   * Detect market category from question
   */
  private detectCategory(question: string): string {
    const q = question.toLowerCase();
    if (q.includes('btc') || q.includes('eth') || q.includes('sol') || q.includes('price') || q.includes('$')) {
      return 'crypto';
    }
    if (q.includes('super bowl') || q.includes('ufc') || q.includes('nba') || q.includes('world cup')) {
      return 'sports';
    }
    if (q.includes('election') || q.includes('trump') || q.includes('biden') || q.includes('vote')) {
      return 'politics';
    }
    if (q.includes('grammy') || q.includes('oscar') || q.includes('movie') || q.includes('album')) {
      return 'entertainment';
    }
    return 'general';
  }

  /**
   * Post to AgentBook
   */
  private async postToAgentBook(analysis: MarketAnalysis): Promise<void> {
    // Check cooldown
    if (this.lastPostTime) {
      const minutesSinceLastPost = (Date.now() - this.lastPostTime.getTime()) / (60 * 1000);
      if (minutesSinceLastPost < this.config.postCooldownMinutes) {
        console.log(`   Skipping post: cooldown (${Math.ceil(this.config.postCooldownMinutes - minutesSinceLastPost)}m remaining)`);
        return;
      }
    }

    const content = `${analysis.insight} Pool: ${analysis.market.pool.toFixed(1)} SOL. Category: ${analysis.category}.`;

    const post: AgentBookPost = {
      walletAddress: this.config.walletAddress,
      content: content.slice(0, 2000), // Max 2000 chars
      marketPda: analysis.market.pda,
    };

    try {
      const url = `${this.config.baoziApiUrl}/agentbook/posts`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      });

      if (!response.ok) {
        throw new Error(`Failed to post: ${response.statusText}`);
      }

      this.lastPostTime = new Date();
      console.log(`   ✓ Posted to AgentBook: ${analysis.market.question.slice(0, 50)}...`);
    } catch (error) {
      console.error('   ✗ Failed to post to AgentBook:', error);
    }
  }

  /**
   * Comment on a specific market
   */
  private async commentOnMarket(market: Market): Promise<void> {
    // Check cooldown for this market
    const lastComment = this.lastCommentTimes.get(market.pda);
    if (lastComment) {
      const minutesSinceComment = (Date.now() - lastComment.getTime()) / (60 * 1000);
      if (minutesSinceComment < this.config.commentCooldownMinutes) {
        return;
      }
    }

    // Generate comment
    const favoriteIndex = market.odds.indexOf(Math.max(...market.odds));
    const favorite = market.outcomes[favoriteIndex];
    const favoriteOdds = market.odds[favoriteIndex];

    const content = `${favorite} leading at ${favoriteOdds}% with ${market.pool.toFixed(1)} SOL pooled. ` +
      `${favoriteOdds > 60 ? 'Strong favorite' : 'Competitive market'}.`;

    const comment: MarketComment = {
      marketPda: market.pda,
      content: content.slice(0, 500), // Max 500 chars
    };

    try {
      // Sign the message
      const message = JSON.stringify(comment);
      const signature = await this.config.signMessage(message);

      const url = `${this.config.baoziApiUrl}/markets/${market.pda}/comments`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': this.config.walletAddress,
          'x-signature': signature,
          'x-message': message,
        },
        body: JSON.stringify({ content: comment.content }),
      });

      if (!response.ok) {
        throw new Error(`Failed to comment: ${response.statusText}`);
      }

      this.lastCommentTimes.set(market.pda, new Date());
      console.log(`   ✓ Commented on market: ${market.question.slice(0, 40)}...`);
    } catch (error) {
      console.error('   ✗ Failed to comment:', error);
    }
  }
}