'use server';

import { supabase } from '@/lib/supabase-server';
import { calculatePayout } from '@/lib/pricing';

export async function callEventAction(data: {
  eventId: string;
  partyMemberId: string;
  proposedOutcome: string;
  justification?: string;
}): Promise<{ success: boolean } | { error: string }> {
  try {
    // Verify event exists and is open
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status')
      .eq('id', data.eventId)
      .maybeSingle();

    if (eventError || !event) {
      return { error: 'Event not found' };
    }

    if (event.status !== 'open') {
      return { error: 'Event is already resolved' };
    }

    // Create call
    await supabase.from('event_calls').insert({
      event_id: data.eventId,
      party_member_id: data.partyMemberId,
      proposed_outcome: data.proposedOutcome,
      justification: data.justification || null,
    });

    return { success: true };
  } catch (error) {
    console.error('Call event error:', error);
    return { error: 'Failed to call event' };
  }
}

export async function confirmEventOutcomeAction(data: {
  eventId: string;
  partyMemberId: string;
  outcome: string;
}): Promise<{ success: boolean } | { error: string }> {
  try {
    // Verify creator
    const { data: check, error: checkError } = await supabase
      .from('party_members')
      .select('is_creator, party_id')
      .eq('id', data.partyMemberId)
      .maybeSingle();

    if (checkError || !check) {
      return { error: 'Member not found' };
    }

    // Verify event belongs to same party
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('party_id')
      .eq('id', data.eventId)
      .eq('party_id', check.party_id)
      .maybeSingle();

    if (eventError || !event) {
      return { error: 'Event not found or not in party' };
    }

    if (!check.is_creator) {
      return { error: 'Only party creator can confirm outcomes' };
    }

    // Update event status
    await supabase
      .from('events')
      .update({
        status: 'resolved',
        final_outcome: data.outcome,
      })
      .eq('id', data.eventId);

    // Get all bets
    const { data: bets } = await supabase
      .from('bets')
      .select('id, party_member_id, outcome_name, side, stake_mofus')
      .eq('event_id', data.eventId);

    if (!bets || bets.length === 0) {
      // Add final price history entry for all outcomes
      const { data: outcomes } = await supabase
        .from('event_outcomes')
        .select('name')
        .eq('event_id', data.eventId);

      if (outcomes) {
        const priceHistoryEntries = outcomes.map((outcome) => ({
          event_id: data.eventId,
          outcome_name: outcome.name,
          price: outcome.name === data.outcome ? 1 : 0,
        }));
        await supabase.from('outcome_price_history').insert(priceHistoryEntries);
      }

      return { success: true };
    }

    // Calculate stakes
    let totalWinningStake = 0;
    let totalLosingStake = 0;

    bets.forEach((bet) => {
      const outcomeName = bet.outcome_name || bet.side; // Fallback for old bets
      if (outcomeName === data.outcome) {
        totalWinningStake += bet.stake_mofus;
      } else {
        totalLosingStake += bet.stake_mofus;
      }
    });

    // Process payouts
    if (totalWinningStake > 0 && totalLosingStake > 0) {
      const winningBets = bets.filter((bet) => {
        const outcomeName = bet.outcome_name || bet.side;
        return outcomeName === data.outcome;
      });
      
      for (const bet of winningBets) {
        const payout = calculatePayout(bet.stake_mofus, totalWinningStake, totalLosingStake);
        const { data: currentMember } = await supabase
          .from('party_members')
          .select('balance_mofus')
          .eq('id', bet.party_member_id)
          .maybeSingle();
        
        if (currentMember) {
          await supabase
            .from('party_members')
            .update({ balance_mofus: currentMember.balance_mofus + payout })
            .eq('id', bet.party_member_id);
        }
      }
    }

    // Add final price history entry for all outcomes
    const { data: outcomes } = await supabase
      .from('event_outcomes')
      .select('name')
      .eq('event_id', data.eventId);

    if (outcomes) {
      const priceHistoryEntries = outcomes.map((outcome) => ({
        event_id: data.eventId,
        outcome_name: outcome.name,
        price: outcome.name === data.outcome ? 1 : 0,
      }));
      await supabase.from('outcome_price_history').insert(priceHistoryEntries);
    }

    return { success: true };
  } catch (error) {
    console.error('Confirm outcome error:', error);
    return { error: 'Failed to confirm outcome' };
  }
}

export async function reverseCallAction(data: {
  eventCallId: string;
  partyMemberId: string;
}): Promise<{ success: boolean } | { error: string }> {
  try {
    // Get the call and verify creator
    const { data: call, error: callError } = await supabase
      .from('event_calls')
      .select('event_id')
      .eq('id', data.eventCallId)
      .maybeSingle();

    if (callError || !call) {
      return { error: 'Call not found' };
    }

    // Get event to find party
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('party_id')
      .eq('id', call.event_id)
      .maybeSingle();

    if (eventError || !event) {
      return { error: 'Event not found' };
    }

    // Verify creator
    const { data: member, error: memberError } = await supabase
      .from('party_members')
      .select('is_creator')
      .eq('id', data.partyMemberId)
      .eq('party_id', event.party_id)
      .maybeSingle();

    if (memberError || !member || !member.is_creator) {
      return { error: 'Only party creator can reverse calls' };
    }

    // Mark as reversed
    await supabase
      .from('event_calls')
      .update({ is_reversed: true })
      .eq('id', data.eventCallId);

    return { success: true };
  } catch (error) {
    console.error('Reverse call error:', error);
    return { error: 'Failed to reverse call' };
  }
}
