'use server';

import { supabase } from '@/lib/supabase-server';
import { generateSlug, generatePartyCode } from '@/lib/utils';
import { calculateMultiOutcomePrices } from '@/lib/pricing';

export async function createPartyAction(data: {
  name: string;
  startingMofus: number;
  displayName: string;
  events: Array<{ 
    title: string; 
    description?: string;
    outcomes?: Array<{ name: string; color: string }>;
  }>;
}): Promise<{ slug: string; memberId: string; partyId: string; partyCode: string } | { error: string }> {
  try {
    const slug = generateSlug(data.name);
    let partyCode = generatePartyCode();

    // Ensure party code is unique
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('parties')
        .select('id')
        .eq('party_code', partyCode)
        .maybeSingle();
      
      if (!existing) break;
      partyCode = generatePartyCode();
      attempts++;
    }

    // Create party
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .insert({
        slug,
        name: data.name,
        party_code: partyCode,
        starting_mofus: data.startingMofus,
        created_by_display_name: data.displayName,
      })
      .select('id, slug, party_code')
      .single();

    if (partyError || !party) {
      return { error: 'Failed to create party' };
    }

    // Create creator member
    const { data: member, error: memberError } = await supabase
      .from('party_members')
      .insert({
        party_id: party.id,
        display_name: data.displayName,
        is_creator: true,
        balance_mofus: data.startingMofus,
      })
      .select('id')
      .single();

    if (memberError || !member) {
      return { error: 'Failed to create party member' };
    }

    // Create events with outcomes
    if (data.events.length > 0) {
      for (const eventData of data.events) {
        // Create event
        const { data: event, error: eventError } = await supabase
          .from('events')
          .insert({
            party_id: party.id,
            title: eventData.title,
            description: eventData.description || null,
          })
          .select('id')
          .single();

        if (eventError || !event) {
          continue; // Skip this event
        }

        // Create outcomes (default yes/no if not provided)
        const outcomes = eventData.outcomes && eventData.outcomes.length > 0
          ? eventData.outcomes
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
      }
    }

    return { 
      slug: party.slug, 
      memberId: member.id, 
      partyId: party.id,
      partyCode: party.party_code 
    };
  } catch (error) {
    console.error('Create party error:', error);
    return { error: 'Failed to create party' };
  }
}

export async function joinPartyAction(data: {
  partyCode: string;
  displayName: string;
}): Promise<{ memberId: string; partyId: string } | { error: string }> {
  try {
    // Find party by code
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('id, slug, starting_mofus')
      .eq('party_code', data.partyCode.toUpperCase())
      .maybeSingle();

    if (partyError || !party) {
      return { error: 'Invalid party code' };
    }

    // Check if member already exists
    const { data: existingMember } = await supabase
      .from('party_members')
      .select('id')
      .eq('party_id', party.id)
      .eq('display_name', data.displayName)
      .maybeSingle();

    if (existingMember) {
      return { memberId: existingMember.id, partyId: party.id };
    }

    // Create new member
    const { data: member, error: memberError } = await supabase
      .from('party_members')
      .insert({
        party_id: party.id,
        display_name: data.displayName,
        balance_mofus: party.starting_mofus,
      })
      .select('id')
      .single();

    if (memberError || !member) {
      return { error: 'Failed to create party member' };
    }

    return { memberId: member.id, partyId: party.id };
  } catch (error) {
    console.error('Join party error:', error);
    return { error: 'Failed to join party' };
  }
}

export async function kickMemberAction(data: {
  partyId: string;
  partyMemberId: string; // The member performing the action (must be creator)
  targetMemberId: string; // The member to kick
}): Promise<{ success: boolean } | { error: string }> {
  try {
    // Verify the actor is the creator
    const { data: actor, error: actorError } = await supabase
      .from('party_members')
      .select('is_creator')
      .eq('id', data.partyMemberId)
      .eq('party_id', data.partyId)
      .maybeSingle();

    if (actorError || !actor) {
      return { error: 'Member not found' };
    }

    if (!actor.is_creator) {
      return { error: 'Only party creator can kick members' };
    }

    // Prevent kicking yourself
    if (data.partyMemberId === data.targetMemberId) {
      return { error: 'Cannot kick yourself' };
    }

    // Verify target member exists and belongs to party
    const { data: target, error: targetError } = await supabase
      .from('party_members')
      .select('id, is_creator')
      .eq('id', data.targetMemberId)
      .eq('party_id', data.partyId)
      .maybeSingle();

    if (targetError || !target) {
      return { error: 'Target member not found' };
    }

    // Prevent kicking the creator
    if (target.is_creator) {
      return { error: 'Cannot kick the party creator' };
    }

    // Delete the member (cascade will handle related bets, etc.)
    const { error: deleteError } = await supabase
      .from('party_members')
      .delete()
      .eq('id', data.targetMemberId)
      .eq('party_id', data.partyId);

    if (deleteError) {
      return { error: 'Failed to kick member' };
    }

    return { success: true };
  } catch (error) {
    console.error('Kick member error:', error);
    return { error: 'Failed to kick member' };
  }
}
