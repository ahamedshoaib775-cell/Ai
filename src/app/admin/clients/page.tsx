'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Key, CheckCircle2, X } from 'lucide-react';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('client123');
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
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create client');
      }

      setSuccessMsg(`Client "${name}" created successfully!`);
      setName('');
      setEmail('');
      setPassword('client123');
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
          <h1 className="text-2xl font-bold text-[#050505] tracking-tight">Client Accounts</h1>
          <p className="text-sm text-[#65676B] mt-1">Manage client profiles and create new access credentials.</p>
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
            <Users className="w-4 h-4 text-[#0866FF]" /> Registered Clients ({clients.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[#65676B]">Loading client list...</div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#65676B]">No clients registered yet.</div>
        ) : (
          <div className="divide-y divide-[#E4E6EA]">
            {clients.map((c) => (
              <div key={c.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F0F2F5]/50 transition-colors">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-[#050505]">{c.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#65676B]">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{c.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="px-3 py-1 rounded-full bg-[#F0F2F5] text-[#050505] font-medium">
                    Batches: <strong>{c.batch_count}</strong>
                  </span>
                  <span className="text-[#65676B]">Created: {new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E6EA] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
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
                  placeholder="e.g. Acme Coffee Co."
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
