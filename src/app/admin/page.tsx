'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, PlusCircle, AlertCircle, CheckCircle2, ArrowRight, Calendar } from 'lucide-react';

export default function AdminOverviewPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [batchRes, clientRes] = await Promise.all([
          fetch('/api/batches'),
          fetch('/api/clients'),
        ]);

        if (batchRes.ok) {
          const bData = await batchRes.json();
          setBatches(bData.batches || []);
        }

        if (clientRes.ok) {
          const cData = await clientRes.json();
          setClients(cData.clients || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalClients = clients.length;
  const totalApproved = batches.reduce((acc, b) => acc + (b.approved_count || 0), 0);
  const totalEditReq = batches.reduce((acc, b) => acc + (b.edit_requested_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Overview Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#050505] tracking-tight">Admin Management Dashboard</h1>
          <p className="text-sm text-[#65676B] mt-1">
            Oversee weekly content batches, edit requests, and client accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/clients"
            className="px-4 py-2 rounded-lg bg-[#F0F2F5] hover:bg-[#E4E6EA] text-[#050505] text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Users className="w-4 h-4" /> Manage Clients
          </Link>
          <Link
            href="/admin/batches/new"
            className="px-4 py-2 rounded-lg bg-[#0866FF] hover:bg-[#0055D4] text-white text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Upload New Batch
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E4E6EA] rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0866FF]/10 text-[#0866FF] flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-[#65676B]">Active Clients</p>
            <p className="text-2xl font-bold text-[#050505]">{loading ? '...' : totalClients}</p>
          </div>
        </div>

        <div className="bg-white border border-[#E4E6EA] rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-[#65676B]">Open Edit Requests</p>
            <p className="text-2xl font-bold text-[#050505]">{loading ? '...' : totalEditReq}</p>
          </div>
        </div>

        <div className="bg-white border border-[#E4E6EA] rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-[#65676B]">Approved Items</p>
            <p className="text-2xl font-bold text-[#050505]">{loading ? '...' : totalApproved}</p>
          </div>
        </div>
      </div>

      {/* Batches Overview List */}
      <div className="bg-white border border-[#E4E6EA] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#E4E6EA] flex items-center justify-between">
          <h2 className="font-bold text-base text-[#050505]">Active Client Batches</h2>
          <Link href="/admin/batches/new" className="text-xs font-semibold text-[#0866FF] hover:underline flex items-center gap-1">
            New Batch <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[#65676B]">Loading batch records...</div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#65676B]">No content batches created yet.</div>
        ) : (
          <div className="divide-y divide-[#E4E6EA]">
            {batches.map((b) => (
              <div key={b.id} className="p-5 hover:bg-[#F0F2F5]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#050505]">{b.client_name}</span>
                    <span className="text-xs text-[#65676B]">({b.client_email})</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#65676B]">
                    <Calendar className="w-3.5 h-3.5 text-[#0866FF]" />
                    <span>Week Range: {b.week_start_date} to {b.week_end_date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="px-2.5 py-1 rounded-full bg-[#F0F2F5] text-[#050505]">
                    Total Items: <strong>{b.item_count}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Approved: {b.approved_count}
                  </span>
                  {b.edit_requested_count > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                      Edits: {b.edit_requested_count}
                    </span>
                  )}
                  <Link
                    href={`/admin/requests?client_id=${b.client_id}`}
                    className="text-[#0866FF] hover:underline font-semibold text-xs flex items-center gap-1"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
