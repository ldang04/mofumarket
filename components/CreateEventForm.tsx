'use client';

import { useState } from 'react';
import { createEventAction } from '@/app/actions/eventActions';

const DEFAULT_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

interface CreateEventFormProps {
  partyId: string;
  partyMemberId: string;
  onSuccess: () => void;
}

export default function CreateEventForm({ partyId, partyMemberId, onSuccess }: CreateEventFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outcomes, setOutcomes] = useState<Array<{ name: string; color: string }>>([
    { name: 'yes', color: '#22c55e' },
    { name: 'no', color: '#ef4444' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const addOutcome = () => {
    const colorIndex = outcomes.length % DEFAULT_COLORS.length;
    setOutcomes([...outcomes, { name: '', color: DEFAULT_COLORS[colorIndex] }]);
  };

  const removeOutcome = (index: number) => {
    if (outcomes.length > 1) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index: number, field: 'name' | 'color', value: string) => {
    const updated = [...outcomes];
    updated[index] = { ...updated[index], [field]: value };
    setOutcomes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const validOutcomes = outcomes
      .filter(o => o.name.trim() !== '')
      .map(o => ({
        name: o.name.trim(),
        color: o.color,
      }));

    if (validOutcomes.length === 0) {
      setError('Please add at least one outcome');
      setLoading(false);
      return;
    }

    const result = await createEventAction({
      partyId,
      partyMemberId,
      title,
      description: description || undefined,
      outcomes: validOutcomes,
    });

    if ('error' in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setTitle('');
    setDescription('');
    setOutcomes([
      { name: 'yes', color: '#22c55e' },
      { name: 'no', color: '#ef4444' },
    ]);
    setIsOpen(false);
    onSuccess();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
      >
        Create Event
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-slate-900">Create New Event</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5">
            Event Title
          </label>
          <input
            type="text"
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="e.g., Will it rain before midnight?"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Additional details..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">Outcomes</label>
            <button
              type="button"
              onClick={addOutcome}
              className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
            >
              + Add Outcome
            </button>
          </div>
          <div className="space-y-2">
            {outcomes.map((outcome, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="color"
                  value={outcome.color}
                  onChange={(e) => updateOutcome(index, 'color', e.target.value)}
                  className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  required
                  value={outcome.name}
                  onChange={(e) => updateOutcome(index, 'name', e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Outcome name"
                />
                {outcomes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOutcome(index)}
                    className="text-xs text-red-600 hover:text-red-700 px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setTitle('');
              setDescription('');
              setOutcomes([
                { name: 'yes', color: '#22c55e' },
                { name: 'no', color: '#ef4444' },
              ]);
              setError(null);
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
