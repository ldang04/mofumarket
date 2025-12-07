'use client';

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DollarRain from "@/components/DollarRain";

export default function Home() {
  const router = useRouter();
  const [partyCode, setPartyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = partyCode.toUpperCase().trim();
    
    if (!code) {
      setError('Please enter a party code');
      return;
    }

    if (code.length !== 6) {
      setError('Party code must be 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/party-by-code?code=${code}`);
      const data = await res.json();

      if (data.error || !data.party) {
        setError('Invalid party code');
        setLoading(false);
        return;
      }

      // Valid code, redirect to join page
      router.push(`/join-party?code=${code}`);
    } catch {
      setError('Failed to validate party code');
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex items-center justify-center px-4 bg-white relative overflow-hidden">
      <DollarRain />
      <main className="max-w-2xl w-full space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <Image 
            src="/assets/images/mofu_party.png" 
            alt="Mofu Party" 
            width={400} 
            height={400}
            className="mx-auto"
          />
          <h1 className="text-4xl font-bold text-slate-900">
            MofuMarket
          </h1>
          <p className="text-sm text-slate-600">Prediction markets for social events</p>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/create-party"
            className="px-6 py-3 bg-black hover:bg-slate-800 text-white rounded-lg font-medium transition-colors text-center shadow-sm"
          >
            Create a Party
          </Link>
          
          <form onSubmit={handleJoinSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={partyCode}
                onChange={(e) => {
                  setPartyCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="Enter party code"
                maxLength={6}
                className={`flex-1 px-4 py-3 border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors text-center font-mono tracking-widest ${
                  error ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-black hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                {loading ? '...' : 'Join Party'}
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
