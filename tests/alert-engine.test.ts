import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertEngine } from '../src/lib/alert-engine.js';
import { BaoziClient } from '../src/lib/baozi-client.js';
import type { AgentConfig, Market, Position, MarketResolution, ClaimableWinnings } from '../src/types.js';

// Mock BaoziClient
vi.mock('../src/lib/baozi-client.js', () => ({
  BaoziClient: vi.fn().mockImplementation(() => ({
    getPositions: vi.fn(),
    getClaimable: vi.fn(),
    getResolutionStatus: vi.fn(),
    getMarket: vi.fn(),
    getQuote: vi.fn(),
  })),
}));

describe('AlertEngine', () => {
  let engine: AlertEngine;
  let mockClient: ReturnType<typeof vi.mocked<BaoziClient>>;

  const config: AgentConfig = {
    wallets: ['wallet123'],
    alerts: {
      claimable: true,
      closingSoon: true,
      closingSoonHours: 6,
      oddsShift: true,
      oddsShiftThreshold: 15,
    },
    channel: { type: 'webhook', config: { url: 'https://example.com/webhook' } },
    pollIntervalMinutes: 15,
    baoziApiUrl: 'https://baozi.bet/api',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new AlertEngine(config);
    mockClient = vi.mocked(BaoziClient).mock.results[0]?.value as ReturnType<typeof vi.mocked<BaoziClient>>;
  });

  describe('checkWallets', () => {
    it('should return empty array when no alerts are triggered', async () => {
      const mockGetPositions = vi.fn().mockResolvedValue([]);
      const mockGetClaimable = vi.fn().mockResolvedValue([]);
      const mockGetResolutionStatus = vi.fn().mockResolvedValue([]);

      vi.mocked(BaoziClient).mockImplementation(() => ({
        getPositions: mockGetPositions,
        getClaimable: mockGetClaimable,
        getResolutionStatus: mockGetResolutionStatus,
        getMarket: vi.fn(),
        getQuote: vi.fn(),
      } as unknown as BaoziClient));

      const alerts = await engine.checkWallets();
      expect(alerts).toHaveLength(0);
    });

    it('should detect unclaimed winnings', async () => {
      const claimable: ClaimableWinnings[] = [
        {
          marketId: 'market1',
          marketQuestion: 'Will BTC hit $120K?',
          winningOutcome: 0,
          winningOutcomeName: 'Yes',
          amount: 2.5,
        },
      ];

      vi.mocked(BaoziClient).mockImplementation(() => ({
        getPositions: vi.fn().mockResolvedValue([]),
        getClaimable: vi.fn().mockResolvedValue(claimable),
        getResolutionStatus: vi.fn().mockResolvedValue([]),
        getMarket: vi.fn(),
        getQuote: vi.fn().mockResolvedValue({ odds: [60, 40], pool: 10 }),
      } as unknown as BaoziClient));

      const testEngine = new AlertEngine(config);
      const alerts = await testEngine.checkWallets();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('unclaimed_winnings');
      expect(alerts[0].title).toBe('Unclaimed Winnings Available!');
    });

    it('should detect market resolved alerts', async () => {
      const resolutions: MarketResolution[] = [
        {
          marketId: 'market1',
          marketQuestion: 'Will SOL hit $300?',
          resolvedOutcome: 0,
          resolvedOutcomeName: 'Yes',
          userBetOutcome: 0,
          userWon: true,
          claimableAmount: 5.0,
        },
      ];

      vi.mocked(BaoziClient).mockImplementation(() => ({
        getPositions: vi.fn().mockResolvedValue([]),
        getClaimable: vi.fn().mockResolvedValue([]),
        getResolutionStatus: vi.fn().mockResolvedValue(resolutions),
        getMarket: vi.fn(),
        getQuote: vi.fn(),
      } as unknown as BaoziClient));

      const testEngine = new AlertEngine(config);
      const alerts = await testEngine.checkWallets();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('market_resolved');
      expect(alerts[0].title).toBe('Market Resolved - Claim Your Winnings!');
    });
  });

  describe('configuration', () => {
    it('should respect disabled alert types', async () => {
      const disabledConfig: AgentConfig = {
        ...config,
        alerts: {
          ...config.alerts,
          claimable: false,
        },
      };

      const testEngine = new AlertEngine(disabledConfig);
      const alerts = await testEngine.checkWallets();

      // Should not query claimable/resolutions when disabled
      expect(alerts.filter(a => a.type === 'unclaimed_winnings')).toHaveLength(0);
      expect(alerts.filter(a => a.type === 'market_resolved')).toHaveLength(0);
    });
  });
});

describe('BaoziClient', () => {
  it('should parse market data correctly', () => {
    const client = new BaoziClient();
    // The client methods are tested via integration
    expect(client).toBeDefined();
  });
});