'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinPartyAction } from '@/app/actions/partyActions';
import { setStoredMember } from '@/lib/utils';

function JoinPartyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partyCodeFromUrl = searchParams.get('code') || '';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (!partyCodeFromUrl) {
      router.push('/');
    }
  }, [partyCodeFromUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await joinPartyAction({
      partyCode: partyCodeFromUrl.toUpperCase().trim(),
      displayName: displayName.trim(),
    });

    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Get party slug for redirect
    const res = await fetch(`/api/party-by-code?code=${partyCodeFromUrl.toUpperCase()}`);
    const data = await res.json();

    if (data.party) {
      setStoredMember(result.partyId, result.memberId, displayName.trim());
      router.push(`/party/${data.party.slug}`);
    } else {
      setError('Failed to find party');
      setLoading(false);
    }
  };

  if (!partyCodeFromUrl) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Join a Party</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <label htmlFor="partyCode" className="block text-sm font-medium text-slate-700 mb-1.5">
              Party Code
            </label>
            <input
              type="text"
              id="partyCode"
              value={partyCodeFromUrl.toUpperCase()}
              disabled
              className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 text-center text-2xl font-mono tracking-widest cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1.5">
              Your Display Name
            </label>
            <input
              type="text"
              id="displayName"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
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
            className="w-full px-4 py-2.5 bg-black hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            {loading ? 'Joining...' : 'Join Party'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function JoinPartyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    }>
      <JoinPartyForm />
    </Suspense>
  );
}

