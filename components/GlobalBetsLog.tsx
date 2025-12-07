'use client';

interface Bet {
  id: string;
  event_id: string;
  event_title: string;
  outcome_name: string;
  side: 'yes' | 'no';
  stake_mofus: number;
  price_at_bet: number;
  created_at: string;
  display_name: string;
}

interface GlobalBetsLogProps {
  bets: Bet[];
}

export default function GlobalBetsLog({ bets }: GlobalBetsLogProps) {
  if (bets.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Global Bet Audit Log</h2>
        <p className="text-slate-600 text-sm">No bets yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Global Bet Audit Log</h2>
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
        <div className="space-y-2">
          {bets.map((bet) => (
            <div
              key={bet.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{bet.event_title}</p>
                  <p className="text-xs text-slate-600">{bet.display_name}</p>
                </div>
                <span className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-700 capitalize">
                  {bet.outcome_name}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
                <span>{bet.stake_mofus} mofus @ {bet.price_at_bet.toFixed(3)}</span>
                <span>{new Date(bet.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
