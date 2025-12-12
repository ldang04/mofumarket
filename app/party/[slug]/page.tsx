import { supabase } from '@/lib/supabase-server';
import { calculateMultiOutcomePrices } from '@/lib/pricing';
import { EventWithPrices, PartyMember, EventOutcome, OutcomePriceHistory, EventCall } from '@/lib/types';
import PartyClient from './PartyClient';

async function getPartyData(slug: string, memberId?: string) {
  const { data: party } = await supabase
    .from('parties')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!party) return null;

  let member: PartyMember | null = null;
  if (memberId) {
    const { data: memberData } = await supabase
      .from('party_members')
      .select('*')
      .eq('id', memberId)
      .eq('party_id', party.id)
      .maybeSingle();
    member = memberData;
  }

  // Get events with bets and price history
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('party_id', party.id)
    .order('created_at', { ascending: false });

  if (!events) return { party, events: [] };

  // Calculate prices for each event
  const eventsWithPrices: EventWithPrices[] = await Promise.all(
    events.map(async (event) => {
      // Get outcomes for this event
      const { data: outcomes } = await supabase
        .from('event_outcomes')
        .select('*')
        .eq('event_id', event.id)
        .order('display_order');

      // If no outcomes exist, create default yes/no (for backward compatibility)
      let eventOutcomes: EventOutcome[] = [];
      if (!outcomes || outcomes.length === 0) {
        // Create default outcomes
        const defaultOutcomes = [
          { name: 'yes', color: '#22c55e' },
          { name: 'no', color: '#ef4444' },
        ];
        for (const outcome of defaultOutcomes) {
          const { data: newOutcome } = await supabase
            .from('event_outcomes')
            .insert({
              event_id: event.id,
              name: outcome.name,
              color: outcome.color,
              display_order: defaultOutcomes.indexOf(outcome),
            })
            .select('*')
            .single();
          if (newOutcome) eventOutcomes.push(newOutcome);
        }
      } else {
        eventOutcomes = outcomes;
      }

      // Get bets for all outcomes
      const { data: bets } = await supabase
        .from('bets')
        .select('outcome_name, side, stake_mofus')
        .eq('event_id', event.id);

      // Calculate stakes per outcome
      const stakes: Record<string, number> = {};
      eventOutcomes.forEach((o) => {
        stakes[o.name] = 0;
      });

      if (bets) {
        bets.forEach((bet) => {
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
        .eq('event_id', event.id)
        .order('created_at', { ascending: true });

      let priceHistory: OutcomePriceHistory[] = [];
      if (outcomePriceHistory && outcomePriceHistory.length > 0) {
        priceHistory = outcomePriceHistory;
      } else {
        // Fallback: convert old price_history format
        const { data: oldPriceHistory } = await supabase
          .from('price_history')
          .select('*')
          .eq('event_id', event.id)
          .order('created_at', { ascending: true });

        if (oldPriceHistory) {
          priceHistory = oldPriceHistory.flatMap((ph: any) => [
            { id: `${ph.id}-yes`, event_id: ph.event_id, outcome_name: 'yes', price: ph.price_yes, created_at: ph.created_at },
            { id: `${ph.id}-no`, event_id: ph.event_id, outcome_name: 'no', price: ph.price_no, created_at: ph.created_at },
          ]);
        }
      }

      // Get event calls
      const { data: callsData } = await supabase
        .from('event_calls')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      const calls = callsData || [];

      return {
        ...event,
        outcomes: eventOutcomes,
        outcomePrices: prices,
        outcomeProbs: probs,
        priceHistory: priceHistory,
        calls: calls,
      };
    })
  );

  // Get all bets across all events for global audit log - show all individual bets
  // First get all event IDs for this party
  const eventIds = events.map(e => e.id);
  
  const { data: allBetsData } = await supabase
    .from('bets')
    .select('*, party_members(display_name), events(title)')
    .in('event_id', eventIds)
    .order('created_at', { ascending: false })
    .limit(100); // Limit to most recent 100 bets

  // Get all party members
  const { data: partyMembers } = await supabase
    .from('party_members')
    .select('*')
    .eq('party_id', party.id)
    .order('created_at', { ascending: true });

  const allBets = (allBetsData || []).map((bet: any) => ({
    id: bet.id,
    event_id: bet.event_id,
    event_title: bet.events?.title || 'Unknown Event',
    outcome_name: bet.outcome_name || bet.side,
    side: bet.side, // Keep for backward compatibility
    stake_mofus: bet.stake_mofus,
    price_at_bet: bet.price_at_bet,
    created_at: bet.created_at,
    display_name: bet.party_members?.display_name || 'Unknown',
  }));

  return { 
    party, 
    events: eventsWithPrices, 
    member, 
    allBets,
    partyMembers: partyMembers || [] 
  };
}

export default async function PartyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPartyData(slug);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Party not found</h1>
          <p className="text-slate-600">The party you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return <PartyClient party={data.party} events={data.events} initialMember={data.member} allBets={data.allBets} partyMembers={data.partyMembers} />;
}
