import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Clock, MapPin, Calendar, Plus, Trash2, 
  Check, X, RefreshCw, AlertTriangle, MessageSquare, ExternalLink, Award 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const Dashboard: React.FC = () => {
  const { user, refreshProfile, updateProfile } = useAuth();
  const [skills, setSkills] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState<'offers' | 'wants'>('offers');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [availability, setAvailability] = useState<any>(user?.availability || {});

  // Add offer/want forms state
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);

  // Reschedule state
  const [reschedulingSessionId, setReschedulingSessionId] = useState<string | null>(null);
  const [newDateTime, setNewDateTime] = useState('');

  // Dispute state
  const [disputingSessionId, setDisputingSessionId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  // Review state
  const [reviewingSessionId, setReviewingSessionId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    fetchSkills();
    fetchSessions();
    fetchLedger();
  }, []);

  const fetchSkills = async () => {
    try {
      const data = await api.get<any[]>('/skills');
      setSkills(data);
      if (data.length > 0) setSelectedSkillId(data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await api.get<any[]>('/sessions');
      setSessions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async () => {
    try {
      const data = await api.get<any[]>('/ledger');
      setLedger(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ name, bio, location, availability });
      setIsEditingProfile(false);
      refreshProfile();
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId) return;

    try {
      if (activeTab === 'offers') {
        await api.post('/skills/offers', {
          skillId: selectedSkillId,
          description,
          estimatedDuration: duration
        });
      } else {
        await api.post('/skills/wants', {
          skillId: selectedSkillId,
          description
        });
      }
      setDescription('');
      setDuration(1);
      setShowAddForm(false);
      refreshProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to add skill');
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this skill offer?')) return;
    try {
      await api.delete(`/skills/offers/${id}`);
      refreshProfile();
    } catch (err) {
      alert('Failed to delete offer');
    }
  };

  const handleDeleteWant = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this wanted skill?')) return;
    try {
      await api.delete(`/skills/wants/${id}`);
      refreshProfile();
    } catch (err) {
      alert('Failed to delete want');
    }
  };

  const handleUpdateSessionStatus = async (sessionId: string, status: string, additionalData = {}) => {
    try {
      await api.put(`/sessions/${sessionId}`, { status, ...additionalData });
      fetchSessions();
      fetchLedger();
      refreshProfile();
      setReschedulingSessionId(null);
      setDisputingSessionId(null);
      setReviewingSessionId(null);
      setNewDateTime('');
      setDisputeReason('');
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleOpenReview = (sessionId: string) => {
    setReviewingSessionId(sessionId);
    setReviewRating(5);
    setReviewComment('');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingSessionId) return;
    try {
      await api.post('/reviews', {
        sessionId: reviewingSessionId,
        rating: reviewRating,
        comment: reviewComment,
      });
      alert('Review submitted successfully!');
      setReviewingSessionId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    }
  };

  const handleAvailabilityChange = (day: string, value: string) => {
    setAvailability((prev: any) => ({
      ...prev,
      [day]: value ? [value] : []
    }));
  };

  // Helper check for Verified Hours badge (e.g. Completed >= 3 sessions)
  const isUserVerified = ledger.length >= 3;

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto space-y-8">
      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass-panel rounded-3xl border border-white/10">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Hello, {user?.name}!</h1>
          <p className="text-gray-400 text-sm">Welcome to your dashboard. Manage your trades and scheduling.</p>
        </div>
        <div className="flex items-center space-x-4 bg-primary-950/40 border border-primary-500/20 px-6 py-3 rounded-2xl">
          <Clock className="h-8 w-8 text-primary-500" />
          <div>
            <div className="text-xs text-gray-400 uppercase font-semibold">Available Balance</div>
            <div className="text-2xl font-black text-white">{user?.timeBalance.toFixed(2)} hours</div>
          </div>
          {isUserVerified && (
            <div className="ml-2 flex items-center justify-center bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs px-2.5 py-1 rounded-full space-x-1" title="Verified trader badge">
              <Award className="h-4 w-4" />
              <span>Verified</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Profile & Availability */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary-500" />
              <span>Profile Settings</span>
            </h2>

            {!isEditingProfile ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-500 font-semibold uppercase">Bio</div>
                  <p className="text-gray-300 text-sm mt-1">{user?.bio || 'No bio written yet. Click edit to describe yourself.'}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{user?.location || 'No location set'}</span>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-semibold uppercase mb-2">Weekly Availability</div>
                  <div className="grid grid-cols-1 gap-2">
                    {DAYS.map((day) => {
                      const slots = user?.availability?.[day] || [];
                      return (
                        <div key={day} className="flex justify-between text-xs py-1 border-b border-white/5">
                          <span className="capitalize text-gray-400">{day}</span>
                          <span className="text-white font-medium">{slots.length > 0 ? slots.join(', ') : 'Not Available'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setName(user?.name || '');
                    setBio(user?.bio || '');
                    setLocation(user?.location || '');
                    setAvailability(user?.availability || {});
                    setIsEditingProfile(true);
                  }}
                  className="w-full mt-4 bg-white/5 hover:bg-white/10 text-white font-semibold py-2 rounded-xl text-sm border border-white/10 transition-all"
                >
                  Edit Profile & Availability
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 font-semibold uppercase">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="glass-input mt-1 block w-full px-3 py-2 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-semibold uppercase">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="glass-input mt-1 block w-full px-3 py-2 rounded-lg text-xs text-white resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-semibold uppercase">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="glass-input mt-1 block w-full px-3 py-2 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-semibold uppercase block mb-1">Availability Slots</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {DAYS.map((day) => (
                      <div key={day} className="flex items-center justify-between gap-2 text-xs">
                        <span className="capitalize text-gray-400 w-16">{day}</span>
                        <input
                          type="text"
                          placeholder="e.g. 17:00-19:00"
                          value={availability[day]?.[0] || ''}
                          onChange={(e) => handleAvailabilityChange(day, e.target.value)}
                          className="glass-input flex-1 px-2 py-1 rounded text-xs text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-2 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-semibold py-2 rounded-xl text-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Center/Right Side: Skill Listings & Scheduling */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Skill Listings Section */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <div className="flex space-x-2">
                <button
                  onClick={() => { setActiveTab('offers'); setShowAddForm(false); }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'offers' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white bg-white/5'
                  }`}
                >
                  Skills Offered
                </button>
                <button
                  onClick={() => { setActiveTab('wants'); setShowAddForm(false); }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'wants' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white bg-white/5'
                  }`}
                >
                  Skills Wanted
                </button>
              </div>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>{showAddForm ? 'Close Form' : 'Add New'}</span>
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddSkill} className="mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-semibold uppercase">Select Skill</label>
                    <select
                      value={selectedSkillId}
                      onChange={(e) => setSelectedSkillId(e.target.value)}
                      className="glass-input mt-1 block w-full px-3 py-2 rounded-lg text-xs text-white"
                    >
                      {skills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          [{skill.category}] {skill.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {activeTab === 'offers' && (
                    <div>
                      <label className="text-xs text-gray-400 font-semibold uppercase">Estimated Duration (Hours)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        className="glass-input mt-1 block w-full px-3 py-2 rounded-lg text-xs text-white"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-semibold uppercase">Description</label>
                  <input
                    type="text"
                    required
                    placeholder={activeTab === 'offers' ? 'Detail what you offer...' : 'Detail what you want to learn...'}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="glass-input mt-1 block w-full px-3 py-2 rounded-lg text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl w-full"
                >
                  Save Skill Listing
                </button>
              </form>
            )}

            {/* List Listings */}
            <div className="space-y-3">
              {activeTab === 'offers' ? (
                user?.skillOffers && user.skillOffers.length > 0 ? (
                  user.skillOffers.map((offer: any) => (
                    <div key={offer.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <div>
                        <div className="font-bold text-white text-sm">{offer.skill.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{offer.description || 'No description provided'}</div>
                        <div className="inline-block mt-2 bg-primary-950/40 border border-primary-500/20 text-primary-400 text-xs px-2.5 py-0.5 rounded-full">
                          Session: {offer.estimatedDuration} {offer.estimatedDuration === 1 ? 'hour' : 'hours'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="text-gray-500 hover:text-red-400 p-2 rounded-xl transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6">You are not offering any skills yet.</p>
                )
              ) : (
                user?.skillWants && user.skillWants.length > 0 ? (
                  user.skillWants.map((want: any) => (
                    <div key={want.id} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <div>
                        <div className="font-bold text-white text-sm">{want.skill.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{want.description || 'No description provided'}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteWant(want.id)}
                        className="text-gray-500 hover:text-red-400 p-2 rounded-xl transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6">You haven't listed any skills you want yet.</p>
                )
              )}
            </div>
            
            <div className="mt-4 flex justify-end">
              <Link
                to="/matches"
                className="inline-flex items-center space-x-1.5 text-xs text-primary-400 hover:text-primary-300 font-semibold"
              >
                <span>Find Match Cycles & Direct Swaps</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Calendar view of upcoming sessions */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary-500" />
              <span>Calendar Swaps Schedule</span>
            </h2>

            <div className="space-y-4">
              {sessions.length > 0 ? (
                sessions.map((session) => {
                  const isProvider = session.providerId === user?.id;
                  const otherParty = isProvider ? session.receiver : session.provider;
                  const dateStr = new Date(session.proposedTime).toLocaleString();

                  return (
                    <div key={session.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                              session.status === 'accepted' ? 'bg-secondary-500/20 text-secondary-400 border border-secondary-500/30' :
                              session.status === 'proposed' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              session.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              session.status === 'disputed' ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' :
                              'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {session.status}
                            </span>
                            {session.matchId && (
                              <span className="text-xs text-primary-400 font-semibold">Match Cycle Link</span>
                            )}
                          </div>
                          <div className="font-bold text-white mt-2">
                            {session.skillOffer.skill.name} ({session.duration}h)
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {isProvider ? 'Teaching: ' : 'Learning from: '} <span className="text-white font-medium">{otherParty.name}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1 flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-primary-400" />
                            <span>{dateStr}</span>
                          </div>
                        </div>

                        {/* Session state buttons */}
                        <div className="flex flex-wrap gap-2">
                          {/* Propose controls */}
                          {session.status === 'proposed' && !isProvider && (
                            <>
                              <button
                                onClick={() => handleUpdateSessionStatus(session.id, 'accepted')}
                                className="bg-secondary-600 hover:bg-secondary-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => handleUpdateSessionStatus(session.id, 'rejected')}
                                className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* Reschedule trigger */}
                          {(session.status === 'proposed' || session.status === 'accepted' || session.status === 'rescheduled') && (
                            <button
                              onClick={() => {
                                setReschedulingSessionId(session.id);
                                setNewDateTime(new Date(session.proposedTime).toISOString().slice(0, 16));
                              }}
                              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Reschedule</span>
                            </button>
                          )}

                          {/* Complete control */}
                          {session.status === 'accepted' && (
                            <button
                              onClick={() => handleUpdateSessionStatus(session.id, 'completed')}
                              className="bg-primary-600 hover:bg-primary-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Mark Completed</span>
                            </button>
                          )}

                          {/* Dispute controls */}
                          {session.status === 'accepted' && (
                            <button
                              onClick={() => setDisputingSessionId(session.id)}
                              className="bg-red-950/40 hover:bg-red-950/70 border border-red-500/30 text-red-400 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1 animate-pulse"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Didn't Happen</span>
                            </button>
                          )}

                          {/* Review triggering */}
                          {session.status === 'completed' && (
                            <button
                              onClick={() => handleOpenReview(session.id)}
                              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs px-3 py-1.5 rounded-xl font-bold"
                            >
                              Leave Review
                            </button>
                          )}

                          {/* Cancel if proposed/accepted */}
                          {(session.status === 'proposed' || session.status === 'accepted') && (
                            <button
                              onClick={() => handleUpdateSessionStatus(session.id, 'cancelled')}
                              className="text-gray-400 hover:text-red-400 text-xs px-3 py-1.5 rounded-xl transition-all"
                            >
                              Cancel Swap
                            </button>
                          )}

                          {session.matchId && (
                            <Link
                              to={`/matches?matchId=${session.matchId}`}
                              className="bg-primary-950/50 hover:bg-primary-900 border border-primary-500/30 text-primary-400 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Chat</span>
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Reschedule Overlay inside card */}
                      {reschedulingSessionId === session.id && (
                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-3">
                          <label className="block text-xs font-semibold text-gray-400 uppercase">Select New Swap Date & Time</label>
                          <div className="flex gap-2">
                            <input
                              type="datetime-local"
                              value={newDateTime}
                              onChange={(e) => setNewDateTime(e.target.value)}
                              className="glass-input px-3 py-1.5 rounded-lg text-xs flex-1"
                            />
                            <button
                              onClick={() => handleUpdateSessionStatus(session.id, 'rescheduled', { proposedTime: new Date(newDateTime).toISOString() })}
                              className="bg-primary-600 hover:bg-primary-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setReschedulingSessionId(null)}
                              className="bg-white/5 hover:bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Dispute Overlay */}
                      {disputingSessionId === session.id && (
                        <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl space-y-3">
                          <label className="block text-xs font-semibold text-red-400 uppercase">Why didn't this swap session happen?</label>
                          <textarea
                            value={disputeReason}
                            onChange={(e) => setDisputeReason(e.target.value)}
                            placeholder="Describe what happened (e.g. partner was a no-show)..."
                            rows={2}
                            className="glass-input w-full px-3 py-2 rounded-lg text-xs resize-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setDisputingSessionId(null)}
                              className="bg-white/5 hover:bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                if (disputeReason.length < 5) return alert('Reason must be at least 5 characters');
                                api.post('/disputes', { sessionId: session.id, reason: disputeReason })
                                  .then(() => {
                                    alert('Dispute submitted for admin review.');
                                    fetchSessions();
                                    setDisputingSessionId(null);
                                  })
                                  .catch((err) => alert(err.message));
                              }}
                              className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold"
                            >
                              Submit Flag
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Review Overlay */}
                      {reviewingSessionId === session.id && (
                        <form onSubmit={handleReviewSubmit} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-400 uppercase">Rate your swap partner</label>
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setReviewRating(star)}
                                  className={`text-lg transition-colors ${
                                    star <= reviewRating ? 'text-yellow-400' : 'text-gray-600'
                                  }`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Written Review</label>
                            <textarea
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              placeholder="Describe your barter experience..."
                              rows={2}
                              className="glass-input w-full px-3 py-2 rounded-lg text-xs resize-none"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setReviewingSessionId(null)}
                              className="bg-white/5 hover:bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="bg-primary-600 hover:bg-primary-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold"
                            >
                              Submit Review
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-400 text-sm text-center py-6">No swaps scheduled yet. Propose one from the Matches page!</p>
              )}
            </div>
          </div>

          {/* Ledger logs */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary-500" />
              <span>Time Ledger (Double-Entry Log)</span>
            </h2>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {ledger.length > 0 ? (
                ledger.map((entry) => {
                  const isDebit = entry.fromUserId === user?.id; // Debited (spent hours)
                  const partner = isDebit ? entry.toUser : entry.fromUser;

                  return (
                    <div key={entry.id} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl text-xs">
                      <div>
                        <div className="font-semibold text-white">{entry.description}</div>
                        <div className="text-gray-400 text-[10px] mt-0.5">
                          {isDebit ? 'Provided by: ' : 'Received by: '} <span className="text-gray-300 font-medium">{partner.name}</span>
                        </div>
                        <div className="text-gray-500 text-[9px] mt-0.5">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`text-sm font-extrabold px-3 py-1 rounded-lg ${
                        isDebit ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-secondary-500/10 text-secondary-400 border border-secondary-500/20'
                      }`}>
                        {isDebit ? '-' : '+'}{entry.hours}h
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-400 text-sm text-center py-6">No completed swap transactions in your ledger yet.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
