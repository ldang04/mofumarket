'use client';

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [partyCode, setPartyCode] = useState('');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = partyCode.toUpperCase().trim();
    if (code) {
      router.push(`/join-party?code=${code}`);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex items-center justify-center px-4 bg-[#faf8f5]">
      <main className="max-w-2xl w-full space-y-8">
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
          
          <form onSubmit={handleJoinSubmit} className="flex gap-2">
            <input
              type="text"
              value={partyCode}
              onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
              placeholder="Enter party code"
              maxLength={6}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors text-center font-mono tracking-widest"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-black hover:bg-slate-800 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              Join Party
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
