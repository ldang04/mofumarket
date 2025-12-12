import { PriceHistory, OutcomePriceHistory } from './types';

export function calculatePrices(yesStake: number, noStake: number): {
  yesProb: number;
  noProb: number;
  yesPrice: number;
  noPrice: number;
} {
  // Laplace smoothing
  const yesProb = (yesStake + 1) / (yesStake + noStake + 2);
  const noProb = 1 - yesProb;
  
  // Price per contract = probability
  const yesPrice = yesProb;
  const noPrice = noProb;
  
  return { yesProb, noProb, yesPrice, noPrice };
}

export function calculateMultiOutcomePrices(stakes: Record<string, number>): {
  probs: Record<string, number>;
  prices: Record<string, number>;
} {
  const outcomeNames = Object.keys(stakes);
  if (outcomeNames.length === 0) {
    return { probs: {}, prices: {} };
  }

  // Laplace smoothing for multiple outcomes
  const totalStake = Object.values(stakes).reduce((sum, stake) => sum + stake, 0);
  const numOutcomes = outcomeNames.length;
  
  const probs: Record<string, number> = {};
  const prices: Record<string, number> = {};

  outcomeNames.forEach((outcome) => {
    const stake = stakes[outcome] || 0;
    // Laplace smoothing: (stake + 1) / (totalStake + numOutcomes)
    const prob = (stake + 1) / (totalStake + numOutcomes);
    probs[outcome] = prob;
    prices[outcome] = prob;
  });

  return { probs, prices };
}

export function calculatePayout(
  betStake: number,
  totalWinningStake: number,
  totalLosingStake: number
): number {
  if (totalWinningStake === 0) return betStake;
  
  const share = betStake / totalWinningStake;
  const payout = betStake + share * totalLosingStake;
  return Math.floor(payout);
}

/**
 * Distributes losing mofus proportionally among winners based on their stake.
 * Returns an array of payouts (whole numbers) where each payout = stake + proportional share of losing stakes.
 * Total payouts will equal totalWinningStake + totalLosingStake.
 * Uses largest remainder method to ensure fair distribution of whole numbers.
 */
export function distributePayouts(
  winningBets: Array<{ stake_mofus: number }>,
  totalWinningStake: number,
  totalLosingStake: number
): number[] {
  if (totalWinningStake === 0 || winningBets.length === 0) {
    // Return original stakes if no winners
    return winningBets.map(bet => bet.stake_mofus);
  }

  if (totalLosingStake === 0) {
    // No losing stakes to distribute, return original stakes
    return winningBets.map(bet => bet.stake_mofus);
  }

  // Calculate proportional shares of losing stakes (as decimals)
  // Each winner gets: their stake + (their stake / totalWinningStake) * totalLosingStake
  const shares = winningBets.map(bet => ({
    stake: bet.stake_mofus,
    shareOfLosing: (bet.stake_mofus / totalWinningStake) * totalLosingStake,
    totalPayout: bet.stake_mofus + (bet.stake_mofus / totalWinningStake) * totalLosingStake,
  }));

  // Calculate floor payouts and remainders
  const floorPayouts = shares.map(s => Math.floor(s.totalPayout));
  const remainders = shares.map((s, i) => ({
    index: i,
    remainder: s.totalPayout - floorPayouts[i],
  }));

  // Calculate total distributed so far
  const totalDistributed = floorPayouts.reduce((sum, p) => sum + p, 0);
  const totalToDistribute = totalWinningStake + totalLosingStake;
  const remainder = totalToDistribute - totalDistributed;

  // Sort remainders descending to distribute remainder to those with largest fractional parts
  remainders.sort((a, b) => b.remainder - a.remainder);

  // Distribute remainder (rounding up for those with largest remainders)
  const payouts = [...floorPayouts];
  for (let i = 0; i < Math.min(Math.floor(remainder), remainders.length); i++) {
    payouts[remainders[i].index]++;
  }

  return payouts;
}
