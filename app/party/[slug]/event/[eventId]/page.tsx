import { supabase } from '@/lib/supabase-server';
import { calculateMultiOutcomePrices } from '@/lib/pricing';
import { EventOutcome, OutcomePriceHistory } from '@/lib/types';
import EventDetailClient from './EventDetailClient';

async function getEventData(eventId: string) {
  const { data: event } = await supabase
    .from('events')
    .select('*, parties(*)')
    .eq('id', eventId)
    .maybeSingle();

  if (!event) return null;

  // Get outcomes for this event
  let { data: outcomes } = await supabase
    .from('event_outcomes')
    .select('*')
    .eq('event_id', eventId)
    .order('display_order');

  // If no outcomes exist, create default yes/no (for backward compatibility)
  if (!outcomes || outcomes.length === 0) {
    const defaultOutcomes = [
      { name: 'yes', color: '#22c55e' },
      { name: 'no', color: '#ef4444' },
    ];
    for (const outcome of defaultOutcomes) {
      const { data: newOutcome } = await supabase
        .from('event_outcomes')
        .insert({
          event_id: eventId,
          name: outcome.name,
          color: outcome.color,
          display_order: defaultOutcomes.indexOf(outcome),
        })
        .select('*')
        .single();
      if (newOutcome) {
        if (!outcomes) outcomes = [];
        outcomes.push(newOutcome);
      }
    }
  }

  // Get bets for all outcomes
  const { data: betsForCalculation } = await supabase
    .from('bets')
    .select('outcome_name, side, stake_mofus')
    .eq('event_id', eventId);

  // Calculate stakes per outcome
  const stakes: Record<string, number> = {};
  (outcomes || []).forEach((o) => {
    stakes[o.name] = 0;
  });

  if (betsForCalculation) {
    betsForCalculation.forEach((bet) => {
      const outcomeName = bet.outcome_name || bet.side; // Fallback for old bets
      if (stakes.hasOwnProperty(outcomeName)) {
        stakes[outcomeName] = (stakes[outcomeName] || 0) + bet.stake_mofus;
      }
    });
  }

  const { prices, probs } = calculateMultiOutcomePrices(stakes);

  // Get price history (use new outcome_price_history, fallback to old price_history)
  const { data: outcomePriceHistory } = await supabase
    .from('outcome_price_history')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  let priceHistory: OutcomePriceHistory[] = [];
  if (outcomePriceHistory && outcomePriceHistory.length > 0) {
    priceHistory = outcomePriceHistory;
  } else {
    // Fallback: convert old price_history format
    const { data: oldPriceHistory } = await supabase
      .from('price_history')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (oldPriceHistory) {
      priceHistory = oldPriceHistory.flatMap((ph: any) => [
        { id: `${ph.id}-yes`, event_id: ph.event_id, outcome_name: 'yes', price: ph.price_yes, created_at: ph.created_at },
        { id: `${ph.id}-no`, event_id: ph.event_id, outcome_name: 'no', price: ph.price_no, created_at: ph.created_at },
      ]);
    }
  }

  // Get event calls with member names
  const { data: callsData } = await supabase
    .from('event_calls')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  const calls = await Promise.all(
    (callsData || []).map(async (call) => {
      const { data: member } = await supabase
        .from('party_members')
        .select('display_name')
        .eq('id', call.party_member_id)
        .maybeSingle();
      return {
        ...call,
        display_name: member?.display_name || 'Unknown',
      };
    })
  );

  // Get bets with member names for audit log
  const { data: betsData } = await supabase
    .from('bets')
    .select('*, party_members(display_name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  const bets = (betsData || []).map((bet: any) => ({
    id: bet.id,
    outcome_name: bet.outcome_name || bet.side,
    side: bet.side, // Keep for backward compatibility
    stake_mofus: bet.stake_mofus,
    price_at_bet: bet.price_at_bet,
    created_at: bet.created_at,
    display_name: bet.party_members?.display_name || 'Unknown',
  }));

  const partySlug = (event.parties as any)?.slug;

  return {
    event,
    outcomes: outcomes || [],
    outcomePrices: prices,
    outcomeProbs: probs,
    priceHistory: priceHistory,
    calls: calls || [],
    bets: bets || [],
    partySlug,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { eventId } = await params;
  const data = await getEventData(eventId);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Event not found</h1>
          <p className="text-slate-600">The event you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return <EventDetailClient eventData={data} partySlug={data.partySlug} />;
}
