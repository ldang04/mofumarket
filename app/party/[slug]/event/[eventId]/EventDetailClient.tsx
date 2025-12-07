'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getStoredMember } from '@/lib/utils';
import { Event, Party, EventOutcome, OutcomePriceHistory, EventCall } from '@/lib/types';
import MultiOutcomeSparkline from '@/components/MultiOutcomeSparkline';
import BetModal from '@/components/BetModal';
import { callEventAction, confirmEventOutcomeAction, reverseCallAction } from '@/app/actions/callActions';

interface EventDetailClientProps {
  eventData: {
    event: Event & { parties: Party };
    outcomes: EventOutcome[];
    outcomePrices: Record<string, number>;
    outcomeProbs: Record<string, number>;
    priceHistory: OutcomePriceHistory[];
    calls: Array<EventCall & { display_name: string }>;
    bets: Array<{
      id: string;
      outcome_name: string;
      side: 'yes' | 'no';
      stake_mofus: number;
      price_at_bet: number;
      created_at: string;
      display_name: string;
    }>;
    partySlug: string;
  };
  partySlug: string;
}

export default function EventDetailClient({ eventData, partySlug }: EventDetailClientProps) {
  const router = useRouter();
  const [member, setMember] = useState<{ id: string; balance_mofus: number; is_creator: boolean; display_name: string } | null>(null);
  const [betModalOpen, setBetModalOpen] = useState<string | null>(null);
  const [callFormOpen, setCallFormOpen] = useState(false);
  const [callOutcome, setCallOutcome] = useState<string>('');
  const [callJustification, setCallJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredMember(eventData.event.party_id);
    if (stored) {
      fetch(`/api/member?id=${stored.partyMemberId}&partyId=${eventData.event.party_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.member) {
            setMember(data.member);
          }
        });
    }
    // Set default call outcome to first outcome
    if (eventData.outcomes.length > 0 && !callOutcome) {
      setCallOutcome(eventData.outcomes[0].name);
    }
  }, [eventData.event.party_id, eventData.outcomes]);

  const handleCall = async () => {
    if (!member || !callOutcome) return;
    setLoading(true);
    setError(null);

    const result = await callEventAction({
      eventId: eventData.event.id,
      partyMemberId: member.id,
      proposedOutcome: callOutcome,
      justification: callJustification || undefined,
    });

    if ('error' in result) {
      setError(result.error);
    } else {
      setCallFormOpen(false);
      setCallJustification('');
      router.refresh();
    }
    setLoading(false);
  };

  const handleConfirm = async (outcome: string) => {
    if (!member) return;
    setLoading(true);
    setError(null);

    const result = await confirmEventOutcomeAction({
      eventId: eventData.event.id,
      partyMemberId: member.id,
      outcome,
    });

    if ('error' in result) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoading(false);
  };

  const handleReverse = async (callId: string) => {
    if (!member) return;
    setLoading(true);
    setError(null);

    const result = await reverseCallAction({
      eventCallId: callId,
      partyMemberId: member.id,
    });

    if ('error' in result) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoading(false);
  };

  // Prepare price history data for all outcomes
  const outcomeHistoryData = eventData.outcomes.map((outcome) => {
    const history = eventData.priceHistory
      .filter((ph) => ph.outcome_name === outcome.name)
      .map((ph) => ({
        timestamp: ph.created_at,
        value: ph.price,
      }));
    
    return {
      name: outcome.name,
      color: outcome.color,
      data: history,
    };
  });

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/party/${eventData.partySlug || partySlug}`}
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block transition-colors"
        >
          ← Back to party
        </Link>

        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{eventData.event.title}</h1>
              {eventData.event.description && (
                <p className="text-slate-600 mb-4">{eventData.event.description}</p>
              )}
            </div>
            <span
              className={`text-sm px-3 py-1 rounded-full ${
                eventData.event.status === 'resolved'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {eventData.event.status === 'resolved'
                ? `Resolved: ${eventData.event.final_outcome?.toUpperCase()}`
                : 'Open'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {eventData.outcomes.map((outcome) => {
              const price = eventData.outcomePrices[outcome.name] || 0;
              const prob = eventData.outcomeProbs[outcome.name] || 0;
              return (
                <div 
                  key={outcome.name}
                  className="p-4 rounded-lg border-2"
                  style={{ 
                    backgroundColor: `${outcome.color}15`,
                    borderColor: outcome.color,
                  }}
                >
                  <div className="text-sm text-slate-600 mb-1 capitalize">{outcome.name} Price</div>
                  <div className="text-2xl font-bold" style={{ color: outcome.color }}>
                    {price.toFixed(3)} mofus
                  </div>
                  <div className="text-sm text-slate-600">
                    {(prob * 100).toFixed(1)}% probability
                  </div>
                </div>
              );
            })}
          </div>

          {outcomeHistoryData.some(o => o.data.length > 0) && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Price History</h2>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                <MultiOutcomeSparkline outcomes={outcomeHistoryData} height={200} showAxis={true} />
              </div>
            </div>
          )}

          {/* Bet Audit Log */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Bet Audit Log</h2>
            {eventData.bets.length === 0 ? (
              <p className="text-slate-600 text-sm">No bets yet.</p>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-slate-700 font-medium">Time</th>
                        <th className="px-4 py-2 text-left text-slate-700 font-medium">User</th>
                        <th className="px-4 py-2 text-left text-slate-700 font-medium">Outcome</th>
                        <th className="px-4 py-2 text-right text-slate-700 font-medium">Stake</th>
                        <th className="px-4 py-2 text-right text-slate-700 font-medium">Price at Bet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventData.bets.map((bet) => {
                        const outcome = eventData.outcomes.find(o => o.name === bet.outcome_name);
                        return (
                          <tr key={bet.id} className="border-t border-slate-200 hover:bg-white transition-colors">
                            <td className="px-4 py-2 text-slate-600">
                              {new Date(bet.created_at).toLocaleTimeString()}
                            </td>
                            <td className="px-4 py-2 text-slate-900 font-medium">{bet.display_name}</td>
                            <td className="px-4 py-2">
                              <span
                                className="px-2 py-1 rounded text-xs font-medium capitalize"
                                style={{
                                  backgroundColor: outcome ? `${outcome.color}20` : '#e2e8f0',
                                  color: outcome ? outcome.color : '#64748b',
                                }}
                              >
                                {bet.outcome_name}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right text-slate-900 font-medium">
                              {bet.stake_mofus} mofus
                            </td>
                            <td className="px-4 py-2 text-right text-slate-600">
                              {bet.price_at_bet.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {eventData.event.status === 'open' && member && (
            <div className="grid grid-cols-2 gap-2 mb-6">
              {eventData.outcomes.map((outcome) => {
                const price = eventData.outcomePrices[outcome.name] || 0;
                const prob = eventData.outcomeProbs[outcome.name] || 0;
                return (
                  <button
                    key={outcome.name}
                    onClick={() => setBetModalOpen(outcome.name)}
                    className="px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-white text-sm"
                    style={{ backgroundColor: outcome.color }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    Bet {outcome.name.toUpperCase()}
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Event Calls Section */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Event Calls</h2>

            {eventData.event.status === 'open' && member && (
              <div className="mb-4">
                {!callFormOpen ? (
                  <button
                    onClick={() => setCallFormOpen(true)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                  >
                    Call Event
                  </button>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Proposed Outcome
                      </label>
                      <select
                        value={callOutcome}
                        onChange={(e) => setCallOutcome(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {eventData.outcomes.map((outcome) => (
                          <option key={outcome.name} value={outcome.name}>
                            {outcome.name.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Justification (optional)
                      </label>
                      <textarea
                        value={callJustification}
                        onChange={(e) => setCallJustification(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Why do you think this is the outcome?"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCall}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors shadow-sm"
                      >
                        {loading ? 'Calling...' : 'Submit Call'}
                      </button>
                      <button
                        onClick={() => {
                          setCallFormOpen(false);
                          setCallJustification('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {eventData.calls.length === 0 ? (
              <p className="text-slate-600 text-sm">No calls yet.</p>
            ) : (
              <div className="space-y-2">
                {eventData.calls.map((call) => {
                  const outcome = eventData.outcomes.find(o => o.name === call.proposed_outcome);
                  return (
                    <div
                      key={call.id}
                      className={`bg-white p-4 rounded-lg border ${
                        call.is_reversed ? 'border-red-300 bg-red-50/50' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-900">
                              {call.display_name || 'Unknown'}
                            </span>
                            <span className="text-sm text-slate-600">
                              called {call.proposed_outcome.toUpperCase()}
                            </span>
                            {call.is_reversed && (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                REVERSED
                              </span>
                            )}
                          </div>
                          {call.justification && (
                            <p className="text-sm text-slate-700 mb-2">{call.justification}</p>
                          )}
                          <p className="text-xs text-slate-500">
                            {new Date(call.created_at).toLocaleString()}
                          </p>
                        </div>
                        {eventData.event.status === 'open' &&
                          member?.is_creator &&
                          !call.is_reversed && (
                            <button
                              onClick={() => handleReverse(call.id)}
                              disabled={loading}
                              className="ml-2 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                            >
                              Reverse
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {eventData.event.status === 'open' && member?.is_creator && (
              <div className="mt-6 flex gap-2 flex-wrap">
                {eventData.outcomes.map((outcome) => (
                  <button
                    key={outcome.name}
                    onClick={() => handleConfirm(outcome.name)}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-white text-sm"
                    style={{ backgroundColor: outcome.color }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    {loading ? 'Confirming...' : `Confirm ${outcome.name.toUpperCase()}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {betModalOpen && member && (() => {
        const outcome = eventData.outcomes.find(o => o.name === betModalOpen);
        if (!outcome) return null;
        const price = eventData.outcomePrices[outcome.name] || 0;
        const prob = eventData.outcomeProbs[outcome.name] || 0;
        return (
          <BetModal
            isOpen={true}
            onClose={() => setBetModalOpen(null)}
            eventId={eventData.event.id}
            partyMemberId={member.id}
            outcomeName={outcome.name}
            currentPrice={price}
            currentProb={prob}
            memberBalance={member.balance_mofus}
            onSuccess={() => {
              router.refresh();
            }}
          />
        );
      })()}
    </div>
  );
}
