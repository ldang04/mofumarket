'use client';

import { useState } from 'react';
import { placeBetAction } from '@/app/actions/eventActions';

interface BetModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  partyMemberId: string;
  outcomeName: string;
  currentPrice: number;
  currentProb: number;
  memberBalance: number;
  onSuccess: () => void;
}

export default function BetModal({
  isOpen,
  onClose,
  eventId,
  partyMemberId,
  outcomeName,
  currentPrice,
  currentProb,
  memberBalance,
  onSuccess,
}: BetModalProps) {
  const [stake, setStake] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stakeNum = parseInt(stake);
    
    if (isNaN(stakeNum) || stakeNum <= 0) {
      setError('Please enter a valid stake amount');
      return;
    }

    if (stakeNum > memberBalance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await placeBetAction({
      eventId,
      partyMemberId,
      outcomeName,
      stakeMofus: stakeNum,
    });

    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onSuccess();
    onClose();
    setStake('');
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-slate-900">
          Bet {outcomeName.toUpperCase()}
        </h2>

        <div className="mb-4 space-y-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
          <p>Current price: <span className="font-semibold text-slate-900">{currentPrice.toFixed(3)}</span> mofus</p>
          <p>Implied probability: <span className="font-semibold text-slate-900">{(currentProb * 100).toFixed(1)}%</span></p>
          <p>Your balance: <span className="font-semibold text-slate-900">{memberBalance}</span> mofus</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="stake" className="block text-sm font-medium text-slate-700 mb-1.5">
              Stake (mofus)
            </label>
            <input
              type="number"
              id="stake"
              required
              min="1"
              max={memberBalance}
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter stake amount"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              {loading ? 'Placing...' : 'Place Bet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
