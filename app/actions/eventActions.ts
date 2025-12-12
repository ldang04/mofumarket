'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase-server';
import { calculateMultiOutcomePrices } from '@/lib/pricing';

export async function createEventAction(data: {
  partyId: string;
  partyMemberId: string;
  title: string;
  description?: string;
  outcomes?: Array<{ name: string; color: string }>;
}): Promise<{ eventId: string } | { error: string }> {
  try {
    // Verify creator
    const { data: member, error: memberError } = await supabase
      .from('party_members')
      .select('is_creator')
      .eq('id', data.partyMemberId)
      .eq('party_id', data.partyId)
      .maybeSingle();

    if (memberError || !member) {
      return { error: 'Member not found' };
    }

    if (!member.is_creator) {
      return { error: 'Only party creator can create events' };
    }

    // Create event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        party_id: data.partyId,
        title: data.title,
        description: data.description || null,
      })
      .select('id')
      .single();

    if (eventError || !event) {
      return { error: 'Failed to create event' };
    }

    // Create outcomes (default yes/no if not provided)
    const outcomes = data.outcomes && data.outcomes.length > 0
      ? data.outcomes
      : [
          { name: 'yes', color: '#22c55e' },
          { name: 'no', color: '#ef4444' },
        ];

    const outcomesToInsert = outcomes.map((outcome, index) => ({
      event_id: event.id,
      name: outcome.name,
      color: outcome.color,
      display_order: index,
    }));

    await supabase.from('event_outcomes').insert(outcomesToInsert);

    // Initialize price history for each outcome
    const initialPrices = calculateMultiOutcomePrices(
      outcomes.reduce((acc, o) => ({ ...acc, [o.name]: 0 }), {})
    );

    const priceHistoryEntries = Object.entries(initialPrices.prices).map(([outcomeName, price]) => ({
      event_id: event.id,
      outcome_name: outcomeName,
      price: price,
    }));

    await supabase.from('outcome_price_history').insert(priceHistoryEntries);

    return { eventId: event.id };
  } catch (error) {
    console.error('Create event error:', error);
    return { error: 'Failed to create event' };
  }
}

export async function placeBetAction(data: {
  eventId: string;
  partyMemberId: string;
  outcomeName: string;
  stakeMofus: number;
}): Promise<{ success: boolean } | { error: string }> {
  try {
    // Get event and verify it's open
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status, party_id')
      .eq('id', data.eventId)
      .maybeSingle();

    if (eventError || !event) {
      return { error: 'Event not found' };
    }

    if (event.status !== 'open') {
      return { error: 'Event is not open for betting' };
    }

    // Check for active (non-reversed) calls
    const { data: activeCalls } = await supabase
      .from('event_calls')
      .select('id')
      .eq('event_id', data.eventId)
      .eq('is_reversed', false);

    if (activeCalls && activeCalls.length > 0) {
      return { error: 'Event has been called - betting is disabled' };
    }

    // Verify outcome exists
    const { data: outcome } = await supabase
      .from('event_outcomes')
      .select('name')
      .eq('event_id', data.eventId)
      .eq('name', data.outcomeName)
      .maybeSingle();

    if (!outcome) {
      return { error: 'Invalid outcome' };
    }

    // Verify member belongs to party
    const { data: member, error: memberError } = await supabase
      .from('party_members')
      .select('id, balance_mofus')
      .eq('id', data.partyMemberId)
      .eq('party_id', event.party_id)
      .maybeSingle();

    if (memberError || !member) {
      return { error: 'Member not found' };
    }

    if (member.balance_mofus < data.stakeMofus) {
      return { error: 'Insufficient balance' };
    }

    // Get all outcomes for this event
    const { data: outcomes } = await supabase
      .from('event_outcomes')
      .select('name')
      .eq('event_id', data.eventId)
      .order('display_order');

    if (!outcomes || outcomes.length === 0) {
      return { error: 'Event has no outcomes' };
    }

    // Get current stakes for all outcomes
    const { data: bets } = await supabase
      .from('bets')
      .select('outcome_name, stake_mofus')
      .eq('event_id', data.eventId);

    const stakes: Record<string, number> = {};
    outcomes.forEach((o) => {
      stakes[o.name] = 0;
    });

    if (bets) {
      bets.forEach((bet) => {
        const outcomeName = bet.outcome_name || bet.side; // Fallback to side for old bets
        if (stakes.hasOwnProperty(outcomeName)) {
          stakes[outcomeName] = (stakes[outcomeName] || 0) + bet.stake_mofus;
        }
      });
    }

    const { prices } = calculateMultiOutcomePrices(stakes);
    const priceAtBet = prices[data.outcomeName] || 0;

    // Deduct balance
    await supabase
      .from('party_members')
      .update({ balance_mofus: member.balance_mofus - data.stakeMofus })
      .eq('id', data.partyMemberId);

    // Create bet
    await supabase.from('bets').insert({
      event_id: data.eventId,
      party_member_id: data.partyMemberId,
      side: data.outcomeName === 'yes' ? 'yes' : data.outcomeName === 'no' ? 'no' : 'yes', // Backward compat
      outcome_name: data.outcomeName,
      stake_mofus: data.stakeMofus,
      price_at_bet: priceAtBet,
    });

    // Recalculate prices with new bet
    const newStakes = { ...stakes };
    newStakes[data.outcomeName] = (newStakes[data.outcomeName] || 0) + data.stakeMofus;
    const { prices: newPrices } = calculateMultiOutcomePrices(newStakes);

    // Add price history entry for all outcomes
    const priceHistoryEntries = Object.entries(newPrices).map(([outcomeName, price]) => ({
      event_id: data.eventId,
      outcome_name: outcomeName,
      price: price,
    }));

    await supabase.from('outcome_price_history').insert(priceHistoryEntries);

    // Get party slug for revalidation
    const { data: party } = await supabase
      .from('parties')
      .select('slug')
      .eq('id', event.party_id)
      .maybeSingle();

    if (party?.slug) {
      revalidatePath(`/party/${party.slug}`);
      revalidatePath(`/party/${party.slug}/event/${data.eventId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Place bet error:', error);
    return { error: 'Failed to place bet' };
  }
}

export async function updateEventAction(data: {
  eventId: string;
  partyMemberId: string;
  title: string;
}): Promise<{ success: boolean } | { error: string }> {
  try {
    // Get event and verify it belongs to a party
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('party_id')
      .eq('id', data.eventId)
      .maybeSingle();

    if (eventError || !event) {
      return { error: 'Event not found' };
    }

    // Verify member is creator
    const { data: member, error: memberError } = await supabase
      .from('party_members')
      .select('is_creator')
      .eq('id', data.partyMemberId)
      .eq('party_id', event.party_id)
      .maybeSingle();

    if (memberError || !member) {
      return { error: 'Member not found' };
    }

    if (!member.is_creator) {
      return { error: 'Only party creator can edit events' };
    }

    // Update event title
    const { error: updateError } = await supabase
      .from('events')
      .update({ title: data.title.trim() })
      .eq('id', data.eventId);

    if (updateError) {
      return { error: 'Failed to update event' };
    }

    return { success: true };
  } catch (error) {
    console.error('Update event error:', error);
    return { error: 'Failed to update event' };
  }
}
