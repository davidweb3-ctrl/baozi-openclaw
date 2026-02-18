/**
 * AgentBook Pundit - CLI Entry Point
 * 
 * AI Market Analyst that posts takes on AgentBook (baozi.bet/agentbook)
 * Bounty: bolivian-peru/baozi-openclaw#8
 */

import { AgentBookPundit } from './pundit/agentbook-pundit.js';

function loadConfig() {
  const walletAddress = process.env.PUNDIT_WALLET_ADDRESS;
  const privateKey = process.env.PUNDIT_PRIVATE_KEY;

  if (!walletAddress || !privateKey) {
    throw new Error('PUNDIT_WALLET_ADDRESS and PUNDIT_PRIVATE_KEY required');
  }

  // Simple message signer (in production, use proper Solana web3.js signing)
  const signMessage = async (message: string): Promise<string> => {
    // This is a placeholder - actual implementation would use Solana web3.js
    // For demo purposes, returning a mock signature
    return `sig_${Buffer.from(message + privateKey).toString('base64').slice(0, 64)}`;
  };

  return {
    walletAddress,
    signMessage,
    baoziApiUrl: process.env.BAOZI_API_URL || 'https://baozi.bet/api',
    postCooldownMinutes: parseInt(process.env.PUNDIT_POST_COOLDOWN || '30', 10),
    commentCooldownMinutes: parseInt(process.env.PUNDIT_COMMENT_COOLDOWN || '60', 10),
  };
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════');
    console.log('     AgentBook Pundit v1.0.0');
    console.log('     AI Market Analyst for Baozi');
    console.log('═══════════════════════════════════════════\n');

    const config = loadConfig();
    const pundit = new AgentBookPundit(config);

    // Run immediately
    await pundit.runAnalysis();

    console.log('\n✓ Analysis complete');
    console.log('  View posts at: https://baozi.bet/agentbook');
    
  } catch (error) {
    console.error('Failed to run pundit:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();