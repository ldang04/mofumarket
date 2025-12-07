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
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm max-w-md">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">History</h2>
        <p className="text-slate-600 text-sm">No bets yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm max-w-md">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">History</h2>
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-slate-900 font-medium">Event</th>
                <th className="px-4 py-3 text-right text-slate-900 font-medium">Stake</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((bet) => (
                <tr key={bet.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="min-w-0 space-y-1">
                      <p className="text-slate-900 font-medium truncate overflow-hidden text-ellipsis whitespace-nowrap">{bet.event_title}</p>
                      <p className="text-xs text-slate-600 truncate">{bet.display_name} • {bet.outcome_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="space-y-1">
                      <p className="text-slate-900 font-semibold">{bet.stake_mofus} mofus</p>
                      <p className="text-xs text-slate-500">@{bet.price_at_bet.toFixed(3)}</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
