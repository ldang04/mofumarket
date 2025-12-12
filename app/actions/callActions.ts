'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase-server';
import { distributePayouts } from '@/lib/pricing';

export async function callEventAction(data: {
  eventId: string;
  partyMemberId: string;
  proposedOutcome: string;
  justification?: string;
}): Promise<{ success: boolean } | { error: string }> {
  try {
    // Verify event exists and is open, get party slug for revalidation
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status, parties(slug)')
      .eq('id', data.eventId)
      .maybeSingle();

    if (eventError || !event) {
      return { error: 'Event not found' };
    }

    if (event.status !== 'open') {
      return { error: 'Event is already resolved' };
    }

    // Create call
    const { error: insertError } = await supabase.from('event_calls').insert({
      event_id: data.eventId,
      party_member_id: data.partyMemberId,
      proposed_outcome: data.proposedOutcome,
      justification: data.justification || null,
    });

    if (insertError) {
      console.error('Insert call error:', insertError);
      return { error: insertError.message || 'Failed to create call' };
    }

    // Revalidate paths
    const partySlug = (event.parties as any)?.slug;
    if (partySlug) {
      revalidatePath(`/party/${partySlug}`);
      revalidatePath(`/party/${partySlug}/event/${data.eventId}`);
    }

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

    // Verify event belongs to same party and get party slug
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('party_id, parties(slug)')
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
    const { error: updateError } = await supabase
      .from('events')
      .update({
        status: 'resolved',
        final_outcome: data.outcome,
      })
      .eq('id', data.eventId);

    if (updateError) {
      console.error('Update event error:', updateError);
      return { error: updateError.message || 'Failed to confirm outcome' };
    }

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

    // Process payouts - distribute losing mofus proportionally among winners
    if (totalWinningStake > 0 && totalLosingStake > 0) {
      const winningBets = bets.filter((bet) => {
        const outcomeName = bet.outcome_name || bet.side;
        return outcomeName === data.outcome;
      });
      
      // Calculate payouts using proportional distribution (whole numbers)
      const payouts = distributePayouts(
        winningBets.map(bet => ({ stake_mofus: bet.stake_mofus })),
        totalWinningStake,
        totalLosingStake
      );
      
      // Distribute payouts to winners
      for (let i = 0; i < winningBets.length; i++) {
        const bet = winningBets[i];
        const payout = payouts[i];
        
        const { data: currentMember } = await supabase
          .from('party_members')
          .select('balance_mofus')
          .eq('id', bet.party_member_id)
          .maybeSingle();
        
        if (currentMember) {
          // Add the payout (which includes their original stake + proportional share of losing stakes)
          await supabase
            .from('party_members')
            .update({ balance_mofus: currentMember.balance_mofus + payout })
            .eq('id', bet.party_member_id);
        }
      }
    } else if (totalWinningStake > 0 && totalLosingStake === 0) {
      // No losing stakes, winners just get their stake back
      const winningBets = bets.filter((bet) => {
        const outcomeName = bet.outcome_name || bet.side;
        return outcomeName === data.outcome;
      });
      
      for (const bet of winningBets) {
        const { data: currentMember } = await supabase
          .from('party_members')
          .select('balance_mofus')
          .eq('id', bet.party_member_id)
          .maybeSingle();
        
        if (currentMember) {
          await supabase
            .from('party_members')
            .update({ balance_mofus: currentMember.balance_mofus + bet.stake_mofus })
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

    // Revalidate paths
    const partySlug = (event.parties as any)?.slug;
    if (partySlug) {
      revalidatePath(`/party/${partySlug}`);
      revalidatePath(`/party/${partySlug}/event/${data.eventId}`);
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

    // Get event to find party and slug
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('party_id, parties(slug)')
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
    const { error: updateError } = await supabase
      .from('event_calls')
      .update({ is_reversed: true })
      .eq('id', data.eventCallId);

    if (updateError) {
      console.error('Reverse call error:', updateError);
      return { error: updateError.message || 'Failed to reverse call' };
    }

    // Revalidate paths
    const partySlug = (event.parties as any)?.slug;
    if (partySlug) {
      revalidatePath(`/party/${partySlug}`);
      revalidatePath(`/party/${partySlug}/event/${call.event_id}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Reverse call error:', error);
    return { error: 'Failed to reverse call' };
  }
}

export async function reverseConfirmedOutcomeAction(data: {
  eventId: string;
  partyMemberId: string;
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

    if (!check.is_creator) {
      return { error: 'Only party creator can reverse confirmed outcomes' };
    }

    // Get event and verify it's resolved
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status, final_outcome, party_id, parties(slug)')
      .eq('id', data.eventId)
      .eq('party_id', check.party_id)
      .maybeSingle();

    if (eventError || !event) {
      return { error: 'Event not found or not in party' };
    }

    if (event.status !== 'resolved' || !event.final_outcome) {
      return { error: 'Event is not resolved or has no confirmed outcome' };
    }

    const confirmedOutcome = event.final_outcome;

    // Get all bets
    const { data: bets } = await supabase
      .from('bets')
      .select('id, party_member_id, outcome_name, side, stake_mofus')
      .eq('event_id', data.eventId);

    if (!bets || bets.length === 0) {
      // No bets, just reset event status
      await supabase
        .from('events')
        .update({
          status: 'open',
          final_outcome: null,
        })
        .eq('id', data.eventId);

      // Remove final price history entries (price = 0 or 1)
      await supabase
        .from('outcome_price_history')
        .delete()
        .eq('event_id', data.eventId)
        .in('price', [0, 1]);

      const partySlug = (event.parties as any)?.slug;
      if (partySlug) {
        revalidatePath(`/party/${partySlug}`);
        revalidatePath(`/party/${partySlug}/event/${data.eventId}`);
      }

      return { success: true };
    }

    // Calculate stakes (same as in confirmEventOutcomeAction)
    let totalWinningStake = 0;
    let totalLosingStake = 0;

    bets.forEach((bet) => {
      const outcomeName = bet.outcome_name || bet.side;
      if (outcomeName === confirmedOutcome) {
        totalWinningStake += bet.stake_mofus;
      } else {
        totalLosingStake += bet.stake_mofus;
      }
    });

    // Reverse payouts
    if (totalWinningStake > 0 && totalLosingStake > 0) {
      const winningBets = bets.filter((bet) => {
        const outcomeName = bet.outcome_name || bet.side;
        return outcomeName === confirmedOutcome;
      });

      // Recalculate payouts (same logic as confirmEventOutcomeAction)
      const payouts = distributePayouts(
        winningBets.map(bet => ({ stake_mofus: bet.stake_mofus })),
        totalWinningStake,
        totalLosingStake
      );

      // Reverse payouts: take back from winners
      for (let i = 0; i < winningBets.length; i++) {
        const bet = winningBets[i];
        const payout = payouts[i];

        const { data: currentMember } = await supabase
          .from('party_members')
          .select('balance_mofus')
          .eq('id', bet.party_member_id)
          .maybeSingle();

        if (currentMember) {
          // Subtract the payout (they got stake + share of losing stakes, we take it all back)
          await supabase
            .from('party_members')
            .update({ balance_mofus: currentMember.balance_mofus - payout })
            .eq('id', bet.party_member_id);
        }
      }

      // Return stakes to losers
      const losingBets = bets.filter((bet) => {
        const outcomeName = bet.outcome_name || bet.side;
        return outcomeName !== confirmedOutcome;
      });

      for (const bet of losingBets) {
        const { data: currentMember } = await supabase
          .from('party_members')
          .select('balance_mofus')
          .eq('id', bet.party_member_id)
          .maybeSingle();

        if (currentMember) {
          // Return their stake (they lost it, we give it back)
          await supabase
            .from('party_members')
            .update({ balance_mofus: currentMember.balance_mofus + bet.stake_mofus })
            .eq('id', bet.party_member_id);
        }
      }
    } else if (totalWinningStake > 0 && totalLosingStake === 0) {
      // No losing stakes, just take back stakes from winners
      const winningBets = bets.filter((bet) => {
        const outcomeName = bet.outcome_name || bet.side;
        return outcomeName === confirmedOutcome;
      });

      for (const bet of winningBets) {
        const { data: currentMember } = await supabase
          .from('party_members')
          .select('balance_mofus')
          .eq('id', bet.party_member_id)
          .maybeSingle();

        if (currentMember) {
          // Take back their stake
          await supabase
            .from('party_members')
            .update({ balance_mofus: currentMember.balance_mofus - bet.stake_mofus })
            .eq('id', bet.party_member_id);
        }
      }
    }

    // Reset event status
    await supabase
      .from('events')
      .update({
        status: 'open',
        final_outcome: null,
      })
      .eq('id', data.eventId);

    // Remove final price history entries (price = 0 or 1)
    await supabase
      .from('outcome_price_history')
      .delete()
      .eq('event_id', data.eventId)
      .in('price', [0, 1]);

    // Revalidate paths
    const partySlug = (event.parties as any)?.slug;
    if (partySlug) {
      revalidatePath(`/party/${partySlug}`);
      revalidatePath(`/party/${partySlug}/event/${data.eventId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Reverse confirmed outcome error:', error);
    return { error: 'Failed to reverse confirmed outcome' };
  }
}
