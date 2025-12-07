'use client';

import { EventWithPrices } from '@/lib/types';
import EventCard from './EventCard';

interface EventGridProps {
  events: EventWithPrices[];
  memberId: string;
  memberBalance: number;
  isCreator?: boolean;
  onBetSuccess: () => void;
  onEventUpdated?: () => void;
}

export default function EventGrid({ events, memberId, memberBalance, isCreator = false, onBetSuccess, onEventUpdated }: EventGridProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600">
        <p>No events yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          memberId={memberId}
          memberBalance={memberBalance}
          isCreator={isCreator}
          onBetSuccess={onBetSuccess}
          onEventUpdated={onEventUpdated}
        />
      ))}
    </div>
  );
}

