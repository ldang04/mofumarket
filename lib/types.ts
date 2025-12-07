export type Party = {
  id: string;
  slug: string;
  name: string;
  party_code: string;
  starting_mofus: number;
  created_by_display_name: string;
  created_at: string;
};

export type PartyMember = {
  id: string;
  party_id: string;
  display_name: string;
  is_creator: boolean;
  balance_mofus: number;
  created_at: string;
};

export type EventOutcome = {
  id: string;
  event_id: string;
  name: string;
  color: string;
  display_order: number;
  created_at: string;
};

export type Event = {
  id: string;
  party_id: string;
  title: string;
  description: string | null;
  status: 'open' | 'resolved';
  final_outcome: string | null; // Now can be any outcome name
  created_at: string;
};

export type Bet = {
  id: string;
  event_id: string;
  party_member_id: string;
  side: 'yes' | 'no'; // Keep for backward compatibility
  outcome_name: string | null;
  stake_mofus: number;
  price_at_bet: number;
  created_at: string;
};

export type EventCall = {
  id: string;
  event_id: string;
  party_member_id: string;
  proposed_outcome: string; // Now can be any outcome name
  justification: string | null;
  is_reversed: boolean;
  created_at: string;
  display_name?: string;
};

export type PriceHistory = {
  id: string;
  event_id: string;
  price_yes: number;
  price_no: number;
  created_at: string;
};

export type OutcomePriceHistory = {
  id: string;
  event_id: string;
  outcome_name: string;
  price: number;
  created_at: string;
};

export type EventWithPrices = Event & {
  outcomes: EventOutcome[];
  outcomePrices: Record<string, number>;
  outcomeProbs: Record<string, number>;
  priceHistory: OutcomePriceHistory[];
};

export type StoredPartyMember = {
  partyMemberId: string;
  displayName: string;
  partyId: string;
};
