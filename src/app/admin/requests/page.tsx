'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Upload, MessageSquare, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

function RequestsContent() {
  const searchParams = useSearchParams();
  const highlightItemId = searchParams.get('item_id');

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [replacementFile, setReplacementFile] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [newHashtags, setNewHashtags] = useState('');
  const [resolving, setResolving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/edit-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        if (highlightItemId && data.requests) {
          const match = data.requests.find((r: any) => r.content_item_id === highlightItemId);
          if (match) openResolveModal(match);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [highlightItemId]);

  const openResolveModal = (req: any) => {
    setActiveRequest(req);
    setReplacementFile(req.file_url || '');
    setNewCaption(req.caption || '');
    setNewHashtags(req.hashtags || '');
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
        setReplacementFile(data.file_url);
      }
    } catch (err) {
      console.error('File upload failed', err);
    }
  };

  const handleMarkDone = async () => {
    if (!activeRequest) return;
    setResolving(true);
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/edit-requests/${activeRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'done',
          replacement_file_url: replacementFile,
          new_caption: newCaption,
          new_hashtags: newHashtags,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update request');
      }

      setSuccessMsg(`Edit request for ${activeRequest.client_name} marked as DONE! In-app notification sent to client.`);
      setActiveRequest(null);
      fetchRequests();
    } catch (err: any) {
      console.error(err);
    } finally {
      setResolving(false);
    }
  };

  const openRequests = requests.filter((r) => r.status !== 'done');
  const doneRequests = requests.filter((r) => r.status === 'done');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#050505] tracking-tight">Client Edit Requests</h1>
        <p className="text-sm text-[#65676B] mt-1">
          Review client feedback notes, upload replacement assets, and mark edits as completed.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-xs text-emerald-600 hover:underline font-medium">Dismiss</button>
        </div>
      )}

      {/* Open Requests */}
      <div className="bg-white border border-[#E4E6EA] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E4E6EA] bg-white flex items-center justify-between">
          <h2 className="font-bold text-sm text-[#050505] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" /> Open Requests ({openRequests.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[#65676B]">Loading edit requests...</div>
        ) : openRequests.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#65676B]">No open edit requests! All caught up 🎉</div>
        ) : (
          <div className="divide-y divide-[#E4E6EA]">
            {openRequests.map((req) => (
              <div key={req.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F0F2F5]/50 transition-colors">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-[#050505]">{req.client_name}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#0866FF]/10 text-[#0866FF] text-xs font-bold capitalize">
                      Day {req.day_number} [{req.type}]
                    </span>
                  </div>

                  <div className="p-3 bg-[#F0F2F5] rounded-lg border border-[#E4E6EA] text-xs text-[#050505] flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-[#0866FF] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#65676B]">Client Note: </span>
                      &quot;{req.client_note}&quot;
                    </div>
                  </div>

                  <p className="text-[11px] text-[#65676B]">Requested: {new Date(req.created_at).toLocaleString()}</p>
                </div>

                <button
                  onClick={() => openResolveModal(req)}
                  className="px-4 py-2.5 bg-[#0866FF] hover:bg-[#0055D4] text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> Re-upload & Resolve
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Done Requests History */}
      {doneRequests.length > 0 && (
        <div className="bg-white border border-[#E4E6EA] rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E4E6EA] bg-white">
            <h2 className="font-bold text-sm text-[#050505] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Resolved Requests History ({doneRequests.length})
            </h2>
          </div>
          <div className="divide-y divide-[#E4E6EA]">
            {doneRequests.map((req) => (
              <div key={req.id} className="p-4 text-xs text-[#65676B] flex items-center justify-between">
                <div>
                  <strong className="text-[#050505]">{req.client_name}</strong> — Day {req.day_number} [{req.type}]
                  <p className="mt-0.5 text-[11px] text-[#65676B]">Note: &quot;{req.client_note}&quot;</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  Resolved
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-upload & Resolve Modal */}
      {activeRequest && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E6EA] rounded-xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E6EA] pb-3">
              <div>
                <h3 className="font-bold text-lg text-[#050505]">
                  Resolve Edit Request: {activeRequest.client_name}
                </h3>
                <p className="text-xs text-[#65676B]">
                  Day {activeRequest.day_number} [{activeRequest.type}]
                </p>
              </div>
              <button onClick={() => setActiveRequest(null)} className="text-xs text-[#65676B] hover:underline">
                Close
              </button>
            </div>

            <div className="p-3 bg-[#F0F2F5] rounded-lg border border-[#E4E6EA] text-xs text-[#050505] space-y-1">
              <p className="font-bold text-[#0866FF]">Client&apos;s Feedback Note:</p>
              <p className="italic">&quot;{activeRequest.client_note}&quot;</p>
            </div>

            <div className="space-y-4">
              {/* Media File Replacement */}
              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5">
                  Replacement Media Asset
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-[#E4E6EA] bg-black shrink-0">
                    {replacementFile ? (
                      replacementFile.endsWith('.mp4') ? (
                        <video src={replacementFile} className="w-full h-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={replacementFile} alt="Preview" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-[10px]">No file</div>
                    )}
                  </div>
                  <label className="px-4 py-2 bg-white border border-[#E4E6EA] hover:bg-[#F0F2F5] rounded-lg text-xs font-semibold text-[#050505] cursor-pointer transition-colors flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#0866FF]" /> Upload Replacement File
                    <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1">
                  Updated Caption
                </label>
                <textarea
                  rows={3}
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  className="w-full p-3 border border-[#E4E6EA] rounded-lg text-sm text-[#050505]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1">
                  Updated Hashtags
                </label>
                <input
                  type="text"
                  value={newHashtags}
                  onChange={(e) => setNewHashtags(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E4E6EA] rounded-lg text-sm text-[#0866FF] font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4E6EA]">
              <button
                type="button"
                onClick={() => setActiveRequest(null)}
                className="px-4 py-2 bg-[#F0F2F5] text-[#050505] rounded-lg text-sm font-semibold hover:bg-[#E4E6EA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkDone}
                disabled={resolving}
                className="px-5 py-2 bg-[#0866FF] hover:bg-[#0055D4] text-white font-semibold rounded-lg text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {resolving ? 'Updating...' : 'Mark Done & Notify Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminRequestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#65676B]">Loading requests...</div>}>
      <RequestsContent />
    </Suspense>
  );
}
