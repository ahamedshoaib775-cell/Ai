'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Edit3, 
  ArrowLeft, 
  Upload, 
  Sparkles, 
  X, 
  Check, 
  Calendar,
  User,
  Tag
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminBatchDetailsPage({ params }: PageProps) {
  const { id: batchId } = use(params);
  const router = useRouter();

  const [batch, setBatch] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDayFilter, setActiveDayFilter] = useState<number | 'all'>('all');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editFileUrl, setEditFileUrl] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  const fetchBatchDetails = async () => {
    try {
      const res = await fetch(`/api/batches?batch_id=${batchId}`);
      if (res.ok) {
        const data = await res.json();
        setBatch(data.batch || null);
        setItems(data.items || []);
      }
    } catch (e) {
      console.error('Failed to fetch batch details', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchDetails();
  }, [batchId]);

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditFileUrl(item.file_url || '');
    setEditCaption(item.caption || '');
    setEditHashtags(item.hashtags || '');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setEditFileUrl(data.file_url);
      }
    } catch (err) {
      console.error('File upload failed', err);
    }
  };

  const handleSaveItemEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/content-items/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: editFileUrl,
          caption: editCaption,
          hashtags: editHashtags,
        }),
      });

      if (res.ok) {
        setSuccessToast(`Day ${editingItem.day_number} [${editingItem.type.toUpperCase()}] updated successfully!`);
        setEditingItem(null);
        fetchBatchDetails();
        setTimeout(() => setSuccessToast(''), 4000);
      }
    } catch (err) {
      console.error('Failed to update content item', err);
    } finally {
      setSaving(false);
    }
  };

  const approvedCount = items.filter((i) => i.status === 'approved').length;
  const editReqCount = items.filter((i) => i.status === 'edit_requested').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  const filteredItems = activeDayFilter === 'all' 
    ? items 
    : items.filter((i) => i.day_number === activeDayFilter);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Back & Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E6EA] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-lg bg-[#F0F2F5] hover:bg-[#E4E6EA] text-[#050505] transition-colors cursor-pointer"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#050505] tracking-tight">Batch Inspector & Asset Editor</h1>
            <p className="text-sm text-[#65676B]">
              Inspect picture posts, client approvals, and update media or captions.
            </p>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {successToast && (
        <div className="p-4 bg-emerald-600 text-white text-sm font-semibold rounded-xl shadow-lg flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast('')} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-sm text-[#65676B]">Loading batch details...</div>
      ) : !batch ? (
        <div className="p-12 text-center border border-dashed border-[#E4E6EA] rounded-xl text-sm text-[#65676B]">
          Batch record not found.
        </div>
      ) : (
        <>
          {/* Metadata Card */}
          <div className="bg-white border border-[#E4E6EA] rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E6EA] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0866FF]" />
                  <span className="font-bold text-lg text-[#050505]">{batch.client_name}</span>
                  <span className="text-xs text-[#65676B]">({batch.client_email})</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#65676B]">
                  <Calendar className="w-3.5 h-3.5 text-[#0866FF]" />
                  <span>Week Date Range: <strong>{batch.week_start_date}</strong> to <strong>{batch.week_end_date}</strong></span>
                </div>
              </div>

              {/* Status Counters */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
                <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Approved by Client: {approvedCount}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Edits Requested: {editReqCount}
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-[#0866FF]/10 text-[#0866FF] border border-[#0866FF]/20 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Pending Review: {pendingCount}
                </span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveDayFilter('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeDayFilter === 'all'
                    ? 'bg-[#0866FF] text-white'
                    : 'bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6EA] hover:text-[#050505]'
                }`}
              >
                All Days ({items.length})
              </button>

              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const dayItemsCount = items.filter((i) => i.day_number === day).length;
                const isDayApproved = items.some((i) => i.day_number === day && i.status === 'approved');

                return (
                  <button
                    key={day}
                    onClick={() => setActiveDayFilter(day)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeDayFilter === day
                        ? 'bg-[#0866FF] text-white'
                        : 'bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6EA] hover:text-[#050505]'
                    }`}
                  >
                    Day {day} ({dayItemsCount})
                    {isDayApproved && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7-Day Picture Card Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base text-[#050505]">
                {activeDayFilter === 'all' ? 'All Published Content Assets' : `Day ${activeDayFilter} Content Assets`}
              </h2>
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#E4E6EA] rounded-xl text-sm text-[#65676B]">
                No items found for this filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => {
                  const isApproved = item.status === 'approved';
                  const isEditRequested = item.status === 'edit_requested';
                  const isPending = item.status === 'pending';

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-[#E4E6EA] rounded-xl overflow-hidden shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        {/* Media Asset Preview */}
                        <div className="relative aspect-square w-full bg-black border-b border-[#E4E6EA] overflow-hidden group">
                          {item.file_url.endsWith('.mp4') || item.file_url.endsWith('.mov') ? (
                            <video src={item.file_url} controls className="w-full h-full object-cover" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.file_url} alt="Media asset" className="w-full h-full object-cover" />
                          )}

                          {/* Day & Type Pill */}
                          <div className="absolute top-3 left-3 bg-[#0866FF] text-white text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider shadow-sm flex items-center gap-1.5">
                            <span>Day {item.day_number}</span>
                            <span className="opacity-60">•</span>
                            <span>{item.type}</span>
                          </div>

                          {/* Client Approval Status Badge */}
                          <div className="absolute top-3 right-3">
                            {isApproved && (
                              <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approved by Client
                              </span>
                            )}
                            {isEditRequested && (
                              <span className="bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                                <AlertCircle className="w-3.5 h-3.5" /> Edit Requested
                              </span>
                            )}
                            {isPending && (
                              <span className="bg-slate-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                                <Clock className="w-3.5 h-3.5 text-slate-300" /> Pending Review
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Caption & Hashtags */}
                        <div className="p-4 space-y-3">
                          <p className="text-xs text-[#050505] leading-relaxed whitespace-pre-wrap">{item.caption}</p>
                          {item.hashtags && (
                            <p className="text-xs font-semibold text-[#0866FF] break-words">{item.hashtags}</p>
                          )}

                          {/* Client Feedback Note if Edit Requested */}
                          {item.client_note && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                              <span className="font-bold text-amber-700">Client Note:</span>
                              <p className="italic">&quot;{item.client_note}&quot;</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Admin Edit Controls */}
                      <div className="p-4 border-t border-[#E4E6EA] bg-[#F0F2F5]/30">
                        <button
                          onClick={() => openEditModal(item)}
                          className="w-full py-2.5 bg-white border border-[#E4E6EA] hover:bg-[#F0F2F5] text-[#050505] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Edit3 className="w-4 h-4 text-[#0866FF]" /> Edit Picture / Caption
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Admin Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E6EA] rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E6EA] pb-3">
              <h3 className="font-bold text-base text-[#050505]">
                Edit Content Asset — Day {editingItem.day_number} [{editingItem.type.toUpperCase()}]
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-1 rounded text-[#65676B] hover:bg-[#F0F2F5]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5">
                  Media Asset (Image / Video)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-[#E4E6EA] bg-black shrink-0">
                    {editFileUrl ? (
                      editFileUrl.endsWith('.mp4') ? (
                        <video src={editFileUrl} className="w-full h-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={editFileUrl} alt="Preview" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xs">No media</div>
                    )}
                  </div>

                  <label className="px-4 py-2 bg-white border border-[#E4E6EA] hover:bg-[#F0F2F5] rounded-lg text-xs font-semibold text-[#050505] cursor-pointer transition-colors flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#0866FF]" /> Replace Media Image/Video
                    <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1">
                  Caption Text
                </label>
                <textarea
                  rows={4}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full p-3 border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1">
                  Hashtags
                </label>
                <input
                  type="text"
                  value={editHashtags}
                  onChange={(e) => setEditHashtags(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E4E6EA] rounded-lg text-sm text-[#0866FF] font-medium focus:outline-none focus:border-[#0866FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4E6EA]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-[#F0F2F5] text-[#050505] rounded-lg text-xs font-semibold hover:bg-[#E4E6EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#0866FF] hover:bg-[#0055D4] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save & Update Picture Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
