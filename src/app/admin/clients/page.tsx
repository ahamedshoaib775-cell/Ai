'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Tag, Megaphone, CheckCircle2, Clock, X } from 'lucide-react';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('client123');
  const [niche, setNiche] = useState('');
  const [tone, setTone] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setCreating(true);

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          business_niche: niche,
          brand_tone: tone,
          business_description: description,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create client');
      }

      setSuccessMsg(`Client "${name}" created successfully!`);
      setName('');
      setEmail('');
      setPassword('client123');
      setNiche('');
      setTone('');
      setDescription('');
      setShowModal(false);
      fetchClients();
    } catch (err: any) {
      setError(err.message || 'Error creating client');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#050505] tracking-tight">Client Accounts & Business Profiles</h1>
          <p className="text-sm text-[#65676B] mt-1">
            Oversee client profiles, view submitted business questionnaires, and create access credentials.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-[#0866FF] hover:bg-[#0055D4] text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Add New Client
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-xs text-emerald-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Client List */}
      <div className="bg-white border border-[#E4E6EA] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E4E6EA] bg-white flex items-center justify-between">
          <h2 className="font-bold text-sm text-[#050505] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0866FF]" /> Registered Client Profiles ({clients.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[#65676B]">Loading client list...</div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#65676B]">No clients registered yet.</div>
        ) : (
          <div className="divide-y divide-[#E4E6EA]">
            {clients.map((c) => (
              <div key={c.id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-[#F0F2F5]/50 transition-colors">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-base text-[#050505]">{c.name}</h3>
                    {c.onboarding_completed === 1 ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Profile Completed
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Questionnaire Pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#65676B]">
                    <Mail className="w-3.5 h-3.5 text-[#0866FF]" />
                    <span>{c.email}</span>
                  </div>

                  {c.business_niche && (
                    <div className="p-3 bg-[#F0F2F5] rounded-lg border border-[#E4E6EA] text-xs text-[#050505] space-y-1 mt-2">
                      <div className="flex flex-wrap items-center gap-4 text-[#0866FF] font-semibold">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" /> Niche: {c.business_niche}
                        </span>
                        {c.brand_tone && (
                          <span className="flex items-center gap-1 text-[#65676B]">
                            <Megaphone className="w-3.5 h-3.5 text-[#0866FF]" /> Tone: {c.brand_tone}
                          </span>
                        )}
                      </div>
                      {c.business_description && (
                        <p className="text-[#65676B] italic mt-1">&quot;{c.business_description}&quot;</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0">
                  <span className="px-3 py-1 rounded-full bg-[#F0F2F5] text-[#050505] font-medium">
                    Batches: <strong>{c.batch_count}</strong>
                  </span>
                  <span className="text-[#65676B]">Joined: {new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E6EA] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E4E6EA] pb-3">
              <h3 className="font-bold text-lg text-[#050505] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#0866FF]" /> Add New Client Account
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded text-[#65676B] hover:bg-[#F0F2F5]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1">
                  Business / Client Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Velocity / Acme Coffee Co."
                  className="w-full px-3.5 py-2 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1">
                  Client Email (Used for Login)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="acme@coffee.com"
                  className="w-full px-3.5 py-2 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1">
                  Initial Password
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="client123"
                  className="w-full px-3.5 py-2 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
                />
              </div>

              <div className="pt-2 border-t border-[#E4E6EA] space-y-3">
                <p className="text-xs font-bold text-[#0866FF] uppercase tracking-wider">
                  Optional Business Info
                </p>
                <div>
                  <label className="block text-xs text-[#65676B] mb-1">Niche / Industry</label>
                  <input
                    type="text"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. Website & Digital Agency"
                    className="w-full px-3 py-1.5 border border-[#E4E6EA] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#65676B] mb-1">Brand Tone</label>
                  <input
                    type="text"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="e.g. Modern, Tech-savvy"
                    className="w-full px-3 py-1.5 border border-[#E4E6EA] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-[#F0F2F5] text-[#050505] rounded-lg text-sm font-semibold hover:bg-[#E4E6EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#0866FF] hover:bg-[#0055D4] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
