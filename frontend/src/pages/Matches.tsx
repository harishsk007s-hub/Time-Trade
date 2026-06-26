import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../services/api';
import { 
  Users, MessageSquare, Send, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const Matches: React.FC = () => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [searchParams] = useSearchParams();

  const [potentialMatches, setPotentialMatches] = useState<any[]>([]);
  const [activeMatches, setActiveMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchPotentialMatches();
    fetchActiveMatches();
  }, []);

  useEffect(() => {
    // If redirecting from dashboard with active matchId query
    const matchId = searchParams.get('matchId');
    if (matchId && activeMatches.length > 0) {
      const match = activeMatches.find((m) => m.id === matchId);
      if (match) setSelectedMatch(match);
    }
  }, [searchParams, activeMatches]);

  useEffect(() => {
    if (!socket || !selectedMatch) return;

    // Join match chat room
    socket.emit('join_match', { matchId: selectedMatch.id });

    // Set up message listeners
    socket.on('message_history', (history: any[]) => {
      setMessages(history);
      scrollToBottom();
    });

    socket.on('message_received', (message: any) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });

    socket.on('typing_status', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [userId]: isTyping,
      }));
    });

    return () => {
      socket.off('message_history');
      socket.off('message_received');
      socket.off('typing_status');
    };
  }, [socket, selectedMatch]);

  const fetchPotentialMatches = async () => {
    try {
      const data = await api.get<any[]>('/matches');
      setPotentialMatches(data);
    } catch (err) {
      console.error('Error fetching potential matches:', err);
    }
  };

  const fetchActiveMatches = async () => {
    try {
      const data = await api.get<any[]>('/matches/active');
      setActiveMatches(data);
      
      // If we don't have a search param matchId, select the first match by default
      if (!searchParams.get('matchId') && data.length > 0 && !selectedMatch) {
        setSelectedMatch(data[0]);
      }
    } catch (err) {
      console.error('Error fetching active matches:', err);
    }
  };

  const handleProposeSwap = async (cycle: any) => {
    try {
      const payload = {
        type: cycle.type,
        members: cycle.members.map((m: any) => ({
          id: m.id,
          name: m.name,
          providesOfferId: m.providesOfferId,
          providesDuration: m.providesDuration,
        })),
      };

      const match = await api.post<any>('/matches/propose', payload);
      alert('Congratulations! The skill swap loop has been proposed and scheduled. Check your Calendar on the Dashboard.');
      fetchPotentialMatches();
      fetchActiveMatches();
      setSelectedMatch(match);
    } catch (err: any) {
      alert(err.message || 'Failed to propose swap');
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !selectedMatch || !messageText.trim()) return;

    socket.emit('send_message', {
      matchId: selectedMatch.id,
      content: messageText,
    });
    
    // Stop typing indicator
    socket.emit('typing', { matchId: selectedMatch.id, isTyping: false });
    setMessageText('');
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    if (!socket || !selectedMatch) return;

    // Send typing status
    socket.emit('typing', { matchId: selectedMatch.id, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { matchId: selectedMatch.id, isTyping: false });
    }, 2000);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center space-x-2">
          <Users className="h-8 w-8 text-primary-500" />
          <span>Skill Swapping Matches</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">Explore matching cycles detected by our graph engine and coordinate with partners.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column (col-span-7): Potential Matches */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary-400" />
              <span>Available Swap Cycles (Cycle Search)</span>
            </h2>

            <div className="space-y-6">
              {potentialMatches.length > 0 ? (
                potentialMatches.map((cycle, idx) => {
                  return (
                    <div key={idx} className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 hover:border-primary-500/50 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          cycle.type === 'direct' ? 'bg-secondary-500/20 text-secondary-400 border border-secondary-500/30' : 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        }`}>
                          {cycle.type === 'direct' ? 'Direct Match (2-Way)' : `Cycle Match (${cycle.chainLength}-Way)`}
                        </span>
                        <span className="text-xs text-yellow-400 font-semibold">
                          Avg Rating: ★ {cycle.averageRating}
                        </span>
                      </div>

                      {/* Visual Flow diagram of the swap loop */}
                      <div className="flex flex-col space-y-4">
                        {cycle.members.map((member: any, mIdx: number) => {
                          const nextMember = cycle.members[(mIdx + 1) % cycle.members.length];
                          return (
                            <div key={mIdx} className="flex items-center space-x-3 text-xs bg-black/25 p-3 rounded-xl border border-white/5">
                              <div className="h-7 w-7 rounded-full bg-primary-600 flex items-center justify-center font-bold text-white text-xs">
                                {member.name[0]}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-white">
                                  {member.id === user?.id ? 'You' : member.name}
                                </div>
                                <div className="text-gray-400 text-[10px] mt-0.5">
                                  Provides: <span className="text-primary-400">{member.providesSkill}</span>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                              <div className="text-right">
                                <div className="text-[10px] text-gray-400">To:</div>
                                <div className="font-semibold text-white text-[11px]">
                                  {nextMember.id === user?.id ? 'You' : nextMember.name}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handleProposeSwap(cycle)}
                        className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center space-x-1"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Propose & Lock Swap Chain</span>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-sm">No swap loops found for your current skills.</p>
                  <p className="text-xs text-gray-500 mt-2">Try listing more "Skills Offered" or "Skills Wanted" on the Dashboard to create paths!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column (col-span-5): Active Match Chats */}
        <div className="lg:col-span-5 grid grid-cols-1 gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col h-[600px]">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-primary-400" />
              <span>Real-Time Swap Chats</span>
            </h2>

            {/* Selection Sidebar list inside card */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 border-b border-white/5">
              {activeMatches.map((match) => {
                const isSelected = selectedMatch?.id === match.id;
                const membersNames = match.members
                  .filter((m: any) => m.provider.id !== user?.id)
                  .map((m: any) => m.provider.name)
                  .join(', ');

                return (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatch(match)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                      isSelected 
                        ? 'bg-primary-600 border-primary-500 text-white' 
                        : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    Chat: {membersNames || 'Direct'}
                  </button>
                );
              })}
            </div>

            {/* Chat Messages and Input */}
            {selectedMatch ? (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                
                {/* Active chat title & online status */}
                <div className="bg-black/20 p-3 rounded-2xl mb-4 border border-white/5 flex items-center justify-between">
                  <div className="text-[11px] text-gray-400 font-medium">
                    Swap members:{' '}
                    <span className="text-white">
                      {selectedMatch.members.map((m: any) => m.provider.name).join(', ')}
                    </span>
                  </div>
                  
                  {/* Show online dot indicator */}
                  <div className="flex items-center space-x-2">
                    {selectedMatch.members
                      .filter((m: any) => m.provider.id !== user?.id)
                      .map((m: any) => {
                        const isOnline = onlineUsers.includes(m.provider.id);
                        return (
                          <div key={m.provider.id} className="flex items-center space-x-1 text-[9px] text-gray-400">
                            <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-secondary-500 animate-pulse' : 'bg-gray-600'}`}></span>
                            <span>{m.provider.name}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Messages feed */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-4 min-h-[300px]">
                  {messages.map((msg, mIdx) => {
                    const isSelf = msg.senderId === user?.id;
                    return (
                      <div key={msg.id || mIdx} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-xs border ${
                          isSelf 
                            ? 'bg-primary-600/90 border-primary-500 text-white rounded-br-none' 
                            : 'bg-white/5 border-white/5 text-gray-300 rounded-bl-none'
                        }`}>
                          {!isSelf && (
                            <div className="font-extrabold text-[9px] text-primary-400 mb-0.5">
                              {msg.sender?.name}
                            </div>
                          )}
                          <div>{msg.content}</div>
                          <div className="text-[8px] text-gray-400 text-right mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Typing indicator */}
                <div className="h-4 text-[10px] text-gray-400 italic px-2 mb-1">
                  {Object.keys(typingUsers)
                    .filter((uid) => uid !== user?.id && typingUsers[uid])
                    .map((uid) => {
                      const mInfo = selectedMatch.members.find((m: any) => m.provider.id === uid);
                      return `${mInfo?.provider.name || 'Partner'} is typing...`;
                    })
                    .join(', ')}
                </div>

                {/* Messages Input Box */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={handleTyping}
                    placeholder="Type your barter coordination message..."
                    className="glass-input flex-1 px-4 py-2.5 rounded-xl text-xs"
                  />
                  <button
                    type="submit"
                    className="bg-primary-600 hover:bg-primary-500 text-white p-2.5 rounded-xl transition-all"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 py-10">
                <MessageSquare className="h-10 w-10 mb-2" />
                <p className="text-sm">You have no active matches.</p>
                <p className="text-xs mt-1">Lock a potential cycle on the left to start a real-time swap chatroom!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Matches;
