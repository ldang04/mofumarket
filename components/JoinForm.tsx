'use client';

import { useState } from 'react';
import { joinPartyAction } from '@/app/actions/partyActions';
import { setStoredMember } from '@/lib/utils';

interface JoinFormProps {
  partyId: string;
  onJoinSuccess: (memberId: string) => void;
}

export default function JoinForm({ partyId, onJoinSuccess }: JoinFormProps) {
  const [displayName, setDisplayName] = useState('');
  const [partyCode, setPartyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await joinPartyAction({
      partyCode: partyCode.toUpperCase().trim(),
      displayName: displayName.trim(),
    });

    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setStoredMember(result.partyId, result.memberId, displayName);
    onJoinSuccess(result.memberId);
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-4 text-slate-900">Join Party</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="partyCode" className="block text-sm font-medium text-slate-700 mb-1.5">
            Party Code
          </label>
          <input
            type="text"
            id="partyCode"
            required
            value={partyCode}
            onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center text-xl font-mono tracking-widest"
            placeholder="ABC123"
            maxLength={6}
          />
        </div>

        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            id="displayName"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Your name"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          {loading ? 'Joining...' : 'Join Party'}
        </button>
      </form>
    </div>
  );
}
