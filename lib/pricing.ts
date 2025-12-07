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
