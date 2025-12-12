'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EventWithPrices } from '@/lib/types';
import MultiOutcomeSparkline from './MultiOutcomeSparkline';
import BetModal from './BetModal';
import { updateEventAction } from '@/app/actions/eventActions';

interface EventCardProps {
  event: EventWithPrices;
  memberId: string;
  memberBalance: number;
  isCreator?: boolean;
  onBetSuccess: () => void;
  onEventUpdated?: () => void;
}

export default function EventCard({ event, memberId, memberBalance, isCreator = false, onBetSuccess, onEventUpdated }: EventCardProps) {
  const router = useRouter();
  const [betModalOpen, setBetModalOpen] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event.title);
  const [isUpdating, setIsUpdating] = useState(false);

  // Prepare price history data for all outcomes
  const outcomeHistoryData = event.outcomes.map((outcome) => {
    const history = event.priceHistory
      .filter((ph) => ph.outcome_name === outcome.name)
      .slice(-20) // Last 20 points
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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking buttons or input fields
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    router.push(`/party/${event.party_id}/event/${event.id}`);
  };

  const handleEditTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (editTitle.trim() === event.title.trim()) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    const result = await updateEventAction({
      eventId: event.id,
      partyMemberId: memberId,
      title: editTitle.trim(),
    });

    setIsUpdating(false);

    if ('error' in result) {
      alert(result.error);
      setEditTitle(event.title);
    } else {
      setIsEditing(false);
      if (onEventUpdated) {
        onEventUpdated();
      }
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="bg-white border border-slate-200 rounded-xl p-6 cursor-pointer hover:border-slate-300 hover:shadow-lg transition-all"
      >
        <div className="flex items-start justify-between mb-4 gap-2">
          {isEditing && isCreator ? (
            <form onSubmit={handleEditTitle} className="flex-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleEditTitle(e);
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditTitle(event.title);
                  }
                }}
                autoFocus
                disabled={isUpdating}
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-black"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="submit"
                disabled={isUpdating}
                className="px-3 py-1 bg-black text-white rounded text-sm hover:bg-slate-800 disabled:opacity-50"
                onClick={(e) => e.stopPropagation()}
              >
                {isUpdating ? '...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(false);
                  setEditTitle(event.title);
                }}
                className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300"
              >
                Cancel
              </button>
            </form>
          ) : (
            <h3 className="text-lg font-semibold text-slate-900 flex-1">
              {event.title}
              {isCreator && (
                <span className="inline-block ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-sm"
                    title="Edit event name"
                  >
                    ✏️
                  </button>
                </span>
              )}
            </h3>
          )}
          <span
            className={`text-sm px-3 py-1 rounded-full whitespace-nowrap ${
              event.status === 'resolved'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {event.status === 'resolved' ? `Resolved: ${event.final_outcome?.toUpperCase()}` : 'Open'}
          </span>
        </div>

        {outcomeHistoryData.some(o => o.data.length > 0) && (
          <div className="mb-4 w-full overflow-hidden">
            <MultiOutcomeSparkline outcomes={outcomeHistoryData} height={150} showAxis={true} />
          </div>
        )}

        <div className="space-y-2 mb-5 text-base">
          {event.outcomes.map((outcome) => {
            const price = event.outcomePrices[outcome.name] || 0;
            const prob = event.outcomeProbs[outcome.name] || 0;
            return (
              <div key={outcome.name} className="flex justify-between items-center">
                <span className="text-slate-600 font-medium capitalize">{outcome.name}:</span>
                <span 
                  className="text-slate-900 font-semibold text-lg"
                  style={{ color: outcome.color }}
                >
                  {(prob * 100).toFixed(1)}% ({price.toFixed(3)}/share)
                </span>
              </div>
            );
          })}
        </div>

        {event.status === 'open' && (() => {
          // Check for active (non-reversed) call
          const activeCall = event.calls?.find(call => !call.is_reversed);
          
          if (activeCall) {
            // Show result instead of betting buttons
            const calledOutcome = event.outcomes.find(o => o.name === activeCall.proposed_outcome);
            return (
              <div className="p-3 rounded-lg border-2" style={{
                backgroundColor: calledOutcome ? `${calledOutcome.color}15` : '#f1f5f9',
                borderColor: calledOutcome ? calledOutcome.color : '#cbd5e1',
              }}>
                <div className="text-xs text-slate-600 mb-1">Event Called</div>
                <div className="text-lg font-bold capitalize" style={{ color: calledOutcome?.color || '#64748b' }}>
                  {activeCall.proposed_outcome.toUpperCase()}
                </div>
              </div>
            );
          }
          
          // Show betting buttons if no active call
          return (
            <div className="grid grid-cols-2 gap-2">
              {event.outcomes.map((outcome) => {
                const price = event.outcomePrices[outcome.name] || 0;
                const prob = event.outcomeProbs[outcome.name] || 0;
                return (
                  <button
                    key={outcome.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      setBetModalOpen(outcome.name);
                    }}
                    className="px-3 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-white text-sm"
                    style={{ backgroundColor: outcome.color }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    {outcome.name.toUpperCase()}
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {betModalOpen && (() => {
        const outcome = event.outcomes.find(o => o.name === betModalOpen);
        if (!outcome) return null;
        const price = event.outcomePrices[outcome.name] || 0;
        const prob = event.outcomeProbs[outcome.name] || 0;
        return (
          <BetModal
            isOpen={true}
            onClose={() => setBetModalOpen(null)}
            eventId={event.id}
            partyMemberId={memberId}
            outcomeName={outcome.name}
            currentPrice={price}
            currentProb={prob}
            memberBalance={memberBalance}
            onSuccess={onBetSuccess}
          />
        );
      })()}
    </>
  );
}
