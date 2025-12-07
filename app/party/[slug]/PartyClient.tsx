'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredMember } from '@/lib/utils';
import { Party, EventWithPrices, PartyMember } from '@/lib/types';
import JoinForm from '@/components/JoinForm';
import CreateEventForm from '@/components/CreateEventForm';
import EventGrid from '@/components/EventGrid';
import GlobalBetsLog from '@/components/GlobalBetsLog';
import { kickMemberAction } from '@/app/actions/partyActions';

interface PartyClientProps {
  party: Party;
  events: EventWithPrices[];
  initialMember?: PartyMember | null;
  allBets?: Array<{
    id: string;
    event_id: string;
    event_title: string;
    side: 'yes' | 'no';
    stake_mofus: number;
    price_at_bet: number;
    created_at: string;
    display_name: string;
  }>;
  partyMembers?: PartyMember[];
}

export default function PartyClient({ party, events: initialEvents, initialMember, allBets = [], partyMembers = [] }: PartyClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [member, setMember] = useState<PartyMember | null>(initialMember || null);
  const [events, setEvents] = useState<EventWithPrices[]>(initialEvents);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    if (initialMember) {
      setMember(initialMember);
      return;
    }

    // Check localStorage for stored member
    const stored = getStoredMember(party.id);
    if (stored) {
      // Fetch member from API
      fetch(`/api/member?id=${stored.partyMemberId}&partyId=${party.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.member) {
            setMember(data.member);
          }
        })
        .catch(() => {
          // If API fails, member will remain null and join form will show
        });
    }
  }, [party.id, initialMember]);

  // Sync events state when initialEvents changes (after refresh)
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  const handleJoinSuccess = async (memberId: string) => {
    // Fetch updated member data
    const res = await fetch(`/api/member?id=${memberId}&partyId=${party.id}`);
    const data = await res.json();
    if (data.member) {
      setMember(data.member);
    }
    router.refresh();
  };

  const handleEventCreated = async () => {
    router.refresh();
  };

  const handleBetSuccess = async () => {
    // Fetch updated member balance immediately
    if (member) {
      const res = await fetch(`/api/member?id=${member.id}&partyId=${party.id}`);
      const data = await res.json();
      if (data.member) {
        setMember(data.member);
      }
    }
    // Refresh the page to get updated data
    startTransition(() => {
      router.refresh();
    });
  };

  const handleEventUpdated = async () => {
    // Refresh the page to get updated data
    router.refresh();
  };

  const handleKickMember = async (targetMemberId: string) => {
    if (!member || !member.is_creator) return;
    
    if (!confirm('Are you sure you want to kick this member? This action cannot be undone.')) {
      return;
    }

    const result = await kickMemberAction({
      partyId: party.id,
      partyMemberId: member.id,
      targetMemberId: targetMemberId,
    });

    if ('error' in result) {
      alert(result.error);
    } else {
      router.refresh();
    }
  };

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <JoinForm partyId={party.id} onJoinSuccess={handleJoinSuccess} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{party.name}</h1>
          <div className="flex items-center gap-4 text-slate-600 mb-4">
            <span>Welcome, {member.display_name}!</span>
            <span>•</span>
            <span className="font-semibold text-slate-900">{member.balance_mofus} mofus</span>
          </div>
          {party.party_code && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div>
                  <p className="text-sm text-blue-700 font-medium mb-1">Party Code</p>
                  <p className="text-2xl font-mono font-bold text-blue-900 tracking-widest">{party.party_code}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(party.party_code);
                  }}
                  className="ml-auto p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  title="Copy code"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              
              {/* Party Members Dropdown */}
              <div className="mt-4 pt-4 border-t border-blue-200">
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-blue-900 hover:text-blue-700 transition-colors"
                >
                  <span>Party Members ({partyMembers.length})</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${showMembers ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showMembers && (
                  <div className="mt-3 bg-white rounded-lg border border-blue-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-blue-900 font-medium">Name</th>
                          <th className="px-4 py-2 text-right text-blue-900 font-medium">Balance</th>
                          {member?.is_creator && (
                            <th className="px-4 py-2 text-right text-blue-900 font-medium">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {partyMembers.map((memberItem) => (
                          <tr key={memberItem.id} className="border-t border-blue-50 hover:bg-blue-50/50 transition-colors">
                            <td className="px-4 py-2 text-slate-900 font-medium">
                              {memberItem.display_name}
                              {memberItem.id === initialMember?.id && (
                                <span className="ml-2 text-xs text-blue-600">(You)</span>
                              )}
                              {memberItem.is_creator && (
                                <span className="ml-2 text-xs text-blue-600">(Host)</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right text-slate-900 font-semibold">
                              {memberItem.balance_mofus} mofus
                            </td>
                            {member?.is_creator && (
                              <td className="px-4 py-2 text-right">
                                {!memberItem.is_creator && memberItem.id !== member.id && (
                                  <button
                                    onClick={() => handleKickMember(memberItem.id)}
                                    className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                                  >
                                    Kick
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {member.is_creator && (
          <CreateEventForm
            partyId={party.id}
            partyMemberId={member.id}
            onSuccess={handleEventCreated}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <EventGrid
              events={events}
              memberId={member.id}
              memberBalance={member.balance_mofus}
              isCreator={member.is_creator}
              onBetSuccess={handleBetSuccess}
              onEventUpdated={handleEventUpdated}
            />
          </div>
          <div className="lg:col-span-1">
            <GlobalBetsLog bets={allBets} />
          </div>
        </div>
      </div>
    </div>
  );
}

