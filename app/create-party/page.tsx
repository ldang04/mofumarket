'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPartyAction } from '@/app/actions/partyActions';
import { setStoredMember } from '@/lib/utils';

const DEFAULT_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function CreatePartyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startingMofus: 1000,
    displayName: '',
  });
  const [events, setEvents] = useState<Array<{ 
    title: string; 
    description: string;
    outcomes: Array<{ name: string; color: string }>;
  }>>([
    { 
      title: '', 
      description: '',
      outcomes: [
        { name: 'yes', color: '#22c55e' },
        { name: 'no', color: '#ef4444' },
      ],
    },
  ]);

  const addEvent = () => {
    setEvents([...events, { 
      title: '', 
      description: '',
      outcomes: [
        { name: 'yes', color: '#22c55e' },
        { name: 'no', color: '#ef4444' },
      ],
    }]);
  };

  const removeEvent = (index: number) => {
    setEvents(events.filter((_, i) => i !== index));
  };

  const updateEvent = (index: number, field: 'title' | 'description', value: string) => {
    const updated = [...events];
    updated[index] = { ...updated[index], [field]: value };
    setEvents(updated);
  };

  const addOutcome = (eventIndex: number) => {
    const updated = [...events];
    const colorIndex = updated[eventIndex].outcomes.length % DEFAULT_COLORS.length;
    updated[eventIndex].outcomes.push({
      name: '',
      color: DEFAULT_COLORS[colorIndex],
    });
    setEvents(updated);
  };

  const removeOutcome = (eventIndex: number, outcomeIndex: number) => {
    const updated = [...events];
    if (updated[eventIndex].outcomes.length > 1) {
      updated[eventIndex].outcomes = updated[eventIndex].outcomes.filter((_, i) => i !== outcomeIndex);
      setEvents(updated);
    }
  };

  const updateOutcome = (eventIndex: number, outcomeIndex: number, field: 'name' | 'color', value: string) => {
    const updated = [...events];
    updated[eventIndex].outcomes[outcomeIndex] = {
      ...updated[eventIndex].outcomes[outcomeIndex],
      [field]: value,
    };
    setEvents(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate events
    const validEvents = events
      .filter(event => event.title.trim() !== '')
      .map(event => {
        const validOutcomes = event.outcomes
          .filter(o => o.name.trim() !== '')
          .map(o => ({
            name: o.name.trim(),
            color: o.color,
          }));
        
        return {
          title: event.title.trim(),
          description: event.description.trim() || undefined,
          outcomes: validOutcomes.length > 0 ? validOutcomes : undefined,
        };
      });

    if (validEvents.length === 0) {
      setError('Please add at least one event');
      setLoading(false);
      return;
    }

    const result = await createPartyAction({
      ...formData,
      events: validEvents,
    });

    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Store member info
    setStoredMember(result.partyId, result.memberId, formData.displayName);

    // Redirect to party page
    router.push(`/party/${result.slug}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Create a Party</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Party Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="My Awesome Party"
            />
          </div>

          <div>
            <label htmlFor="startingMofus" className="block text-sm font-medium text-slate-700 mb-1.5">
              Starting Mofus per Member
            </label>
            <input
              type="number"
              id="startingMofus"
              required
              min="1"
              value={formData.startingMofus}
              onChange={(e) => setFormData({ ...formData, startingMofus: parseInt(e.target.value) || 1000 })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1.5">
              Your Display Name
            </label>
            <input
              type="text"
              id="displayName"
              required
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700">
                Events to Bet On
              </label>
              <button
                type="button"
                onClick={addEvent}
                className="text-sm px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
              >
                + Add Event
              </button>
            </div>
            <div className="space-y-4">
              {events.map((event, eventIndex) => (
                <div key={eventIndex} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">Event {eventIndex + 1}</span>
                    {events.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEvent(eventIndex)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required={eventIndex === 0}
                    value={event.title}
                    onChange={(e) => updateEvent(eventIndex, 'title', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mb-2"
                    placeholder="e.g., Will it rain before midnight?"
                  />
                  <textarea
                    value={event.description}
                    onChange={(e) => updateEvent(eventIndex, 'description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors mb-3"
                    placeholder="Description (optional)"
                  />
                  
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-600">Outcomes</label>
                      <button
                        type="button"
                        onClick={() => addOutcome(eventIndex)}
                        className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
                      >
                        + Add Outcome
                      </button>
                    </div>
                    <div className="space-y-2">
                      {event.outcomes.map((outcome, outcomeIndex) => (
                        <div key={outcomeIndex} className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={outcome.color}
                            onChange={(e) => updateOutcome(eventIndex, outcomeIndex, 'color', e.target.value)}
                            className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            required
                            value={outcome.name}
                            onChange={(e) => updateOutcome(eventIndex, outcomeIndex, 'name', e.target.value)}
                            className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Outcome name"
                          />
                          {event.outcomes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOutcome(eventIndex, outcomeIndex)}
                              className="text-xs text-red-600 hover:text-red-700 px-2"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            {loading ? 'Creating...' : 'Create Party'}
          </button>
        </form>
      </div>
    </div>
  );
}
