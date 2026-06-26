import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

const Admin: React.FC = () => {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'resolved_completed' | 'resolved_cancelled'>('resolved_completed');

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const data = await api.get<any[]>('/disputes');
      setDisputes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (disputeId: string) => {
    if (!adminNotes.trim()) return alert('Admin notes are required for resolution');
    try {
      await api.put(`/disputes/${disputeId}/resolve`, {
        status: resolutionStatus,
        adminNotes,
      });
      alert('Dispute resolved successfully!');
      setResolvingId(null);
      setAdminNotes('');
      fetchDisputes();
    } catch (err: any) {
      alert(err.message || 'Resolution failed');
    }
  };

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center space-x-2">
          <ShieldAlert className="h-8 w-8 text-red-500" />
          <span>Moderation & Dispute Queue</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">Review flagged swaps, no-shows, and resolve credit transfers.</p>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
        <h2 className="text-xl font-bold text-white mb-4">Pending Disputes</h2>

        {disputes.length > 0 ? (
          <div className="space-y-4">
            {disputes.map((dispute) => {
              const session = dispute.session;
              const dateStr = new Date(dispute.createdAt).toLocaleString();
              const isPending = dispute.status === 'pending';

              return (
                <div key={dispute.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          isPending ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {dispute.status}
                        </span>
                        <span className="text-xs text-gray-500">Raised on: {dateStr}</span>
                      </div>
                      <div className="text-sm font-bold text-white mt-2">
                        Session: {session.skillOffer.skill.name} ({session.duration} hours)
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-black/35 p-3 rounded-xl">
                      <div className="font-semibold text-red-400">Raised By:</div>
                      <div className="text-white mt-0.5">{dispute.raisedBy.name} ({dispute.raisedBy.email})</div>
                      <div className="font-semibold text-red-400 mt-2">Reason/Complaint:</div>
                      <p className="text-gray-300 mt-0.5 italic">"{dispute.reason}"</p>
                    </div>

                    <div className="bg-black/35 p-3 rounded-xl space-y-2">
                      <div>
                        <span className="font-semibold text-gray-400">Provider: </span>
                        <span className="text-white">{session.provider.name} ({session.provider.email})</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-400">Receiver: </span>
                        <span className="text-white">{session.receiver.name} ({session.receiver.email})</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-400">Proposed Time: </span>
                        <span className="text-white">{new Date(session.proposedTime).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resolution log details if resolved */}
                  {!isPending && (
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs">
                      <div className="font-semibold text-green-400 uppercase tracking-wider text-[10px]">Admin Resolution Notes:</div>
                      <p className="text-gray-300 mt-1">{dispute.adminNotes}</p>
                    </div>
                  )}

                  {/* Action box for pending disputes */}
                  {isPending && resolvingId !== dispute.id && (
                    <button
                      onClick={() => {
                        setResolvingId(dispute.id);
                        setAdminNotes('');
                        setResolutionStatus('resolved_completed');
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>Take Action</span>
                    </button>
                  )}

                  {/* Resolution Input Drawer */}
                  {resolvingId === dispute.id && (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4 text-xs">
                      <h4 className="font-semibold text-white">Resolve Dispute #{dispute.id.slice(0, 8)}</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-gray-400 font-semibold mb-1">Select Resolution Outcome</label>
                          <select
                            value={resolutionStatus}
                            onChange={(e) => setResolutionStatus(e.target.value as any)}
                            className="glass-input block w-full px-3 py-2 rounded-lg text-white"
                          >
                            <option value="resolved_completed">Mark as Completed (Execute hour swap ledger transfer)</option>
                            <option value="resolved_cancelled">Mark as Cancelled (Void session, no hour credits transferred)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-400 font-semibold mb-1">Admin Notes / Explanation</label>
                          <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            rows={3}
                            placeholder="Explain the decision. These notes will be saved to the dispute history."
                            className="glass-input block w-full px-3 py-2 rounded-lg text-white resize-none"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setResolvingId(null)}
                            className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleResolve(dispute.id)}
                            className="bg-primary-600 hover:bg-primary-500 text-white font-semibold px-4 py-1.5 rounded-lg"
                          >
                            Submit Decision
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-10">No disputes have been flagged on the platform.</p>
        )}
      </div>
    </div>
  );
};

export default Admin;
