'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { 
  CheckCircle2, 
  Download, 
  Edit3, 
  Bell, 
  LogOut, 
  Archive, 
  Calendar, 
  Clock, 
  Sparkles,
  X,
  ShieldCheck,
  Check,
  Tag,
  Loader2
} from 'lucide-react';
import ClientOnboardingForm from '@/components/ClientOnboardingForm';

export default function ClientDashboardPage() {
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showBellDrawer, setShowBellDrawer] = useState(false);
  const [activeDay, setActiveDay] = useState(1);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editModalItem, setEditModalItem] = useState<any | null>(null);
  const [editNote, setEditNote] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState('');
  const [zipping, setZipping] = useState(false);

  const fetchClientProfile = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClientProfile(data.client || null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClientBatch = async () => {
    try {
      const res = await fetch('/api/batches');
      if (res.ok) {
        const data = await res.json();
        setBatch(data.batch || null);
        setItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchClientProfile();
    fetchClientBatch();
    fetchNotifications();

    // Auto-poll every 3 seconds for real-time transition as soon as Admin uploads pictures!
    const interval = setInterval(() => {
      fetchClientProfile();
      fetchClientBatch();
      fetchNotifications();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (itemId: string) => {
    try {
      const res = await fetch(`/api/content-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, status: 'approved' } : i))
        );
      }
    } catch (err) {
      console.error('Approve failed', err);
    }
  };

  const openEditModal = (item: any) => {
    setEditModalItem(item);
    setEditNote('');
  };

  const handleSubmitEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalItem || !editNote) return;

    setSubmittingEdit(true);
    try {
      const res = await fetch('/api/edit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_item_id: editModalItem.id,
          client_note: editNote,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackToast(data.message || 'Got it — this will be edited within 10–15 minutes.');
        setItems((prev) =>
          prev.map((i) => (i.id === editModalItem.id ? { ...i, status: 'edit_requested' } : i))
        );
        setEditModalItem(null);
        setTimeout(() => setFeedbackToast(''), 6000);
      }
    } catch (err) {
      console.error('Edit request failed', err);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDownloadSingle = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllApproved = async () => {
    const approvedItems = items.filter((i) => i.status === 'approved');
    if (approvedItems.length === 0) return;

    setZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${batch?.client_name || 'Content'}_Approved_Assets`);

      for (const item of approvedItems) {
        try {
          const response = await fetch(item.file_url);
          const blob = await response.blob();
          const ext = item.file_url.split('.').pop() || 'jpg';
          const filename = `Day_${item.day_number}_${item.type}_${item.id}.${ext}`;
          folder?.file(filename, blob);

          const captionText = `TYPE: ${item.type.toUpperCase()}\nDAY: ${item.day_number}\n\nCAPTION:\n${item.caption}\n\nHASHTAGS:\n${item.hashtags}`;
          folder?.file(`Day_${item.day_number}_${item.type}_caption.txt`, captionText);
        } catch (e) {
          console.error(`Failed to fetch file for zipping: ${item.file_url}`, e);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${batch?.client_name || 'Content'}_Approved_Batch.zip`);
    } catch (err) {
      console.error('Failed to generate zip package', err);
    } finally {
      setZipping(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const markNotificationsRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    fetchNotifications();
  };

  const dayItems = items.filter((i) => i.day_number === activeDay);
  const approvedCount = items.filter((i) => i.status === 'approved').length;

  const needsOnboarding = clientProfile && clientProfile.onboarding_completed === 0;

  return (
    <div className="min-h-screen bg-white text-[#050505] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E6EA] px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0866FF]/10 text-[#0866FF] flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-[#050505] tracking-tight">
              {clientProfile ? clientProfile.name : batch ? batch.client_name : 'Client Content Portal'}
            </h1>
            <p className="text-xs text-[#65676B]">7-Day Instagram Content Approval</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {batch && (
            <button
              onClick={handleDownloadAllApproved}
              disabled={approvedCount === 0 || zipping}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0866FF] hover:bg-[#0055D4] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Archive className="w-4 h-4" />
              {zipping ? 'Packaging Zip...' : `Download All Approved (${approvedCount})`}
            </button>
          )}

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowBellDrawer(!showBellDrawer)}
              className="p-2 text-[#65676B] hover:text-[#0866FF] hover:bg-[#F0F2F5] rounded-full transition-colors relative cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#0866FF] rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Bell Dropdown */}
            {showBellDrawer && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E4E6EA] rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-[#E4E6EA] flex items-center justify-between bg-white">
                  <span className="font-bold text-xs text-[#050505]">In-App Updates</span>
                  {unreadCount > 0 && (
                    <button onClick={markNotificationsRead} className="text-[11px] text-[#0866FF] hover:underline">
                      Mark read
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#E4E6EA]">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#65676B]">No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 text-xs text-[#050505] space-y-1 hover:bg-[#F0F2F5]">
                        <p className="font-semibold text-[#0866FF]">{n.message}</p>
                        <p className="text-[10px] text-[#65676B]">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-[#65676B] hover:text-red-600 hover:bg-[#F0F2F5] rounded-full transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Toast Feedback */}
        {feedbackToast && (
          <div className="p-4 bg-[#0866FF] text-white text-sm rounded-xl shadow-lg flex items-center justify-between transition-all animate-bounce">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <span>{feedbackToast}</span>
            </div>
            <button onClick={() => setFeedbackToast('')} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. Onboarding Questionnaire Form */}
        {needsOnboarding ? (
          <ClientOnboardingForm
            initialName={clientProfile?.name}
            onComplete={() => {
              fetchClientProfile();
              fetchClientBatch();
            }}
          />
        ) : !loading && !batch ? (
          /* 2. "Status: In Process — Will be posted shortly" Screen */
          <div className="bg-white border border-[#E4E6EA] rounded-2xl p-8 sm:p-12 text-center space-y-6 max-w-xl mx-auto shadow-sm my-8">
            <div className="flex justify-center">
              <span className="px-3.5 py-1 rounded-full bg-[#0866FF]/10 text-[#0866FF] font-extrabold text-xs tracking-wider flex items-center gap-2 border border-[#0866FF]/20">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0866FF] animate-ping" />
                STATUS: IN PROCESS
              </span>
            </div>

            <div className="w-16 h-16 bg-[#0866FF]/10 text-[#0866FF] rounded-2xl flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#050505]">
                Content Batch In Process
              </h2>
              <p className="text-sm text-[#65676B] leading-relaxed">
                Your 7-day Instagram content batch for <strong className="text-[#050505]">{clientProfile?.name || 'Your Business'}</strong> (<span className="text-[#0866FF] font-semibold">{clientProfile?.business_niche || 'Custom Niche'}</span>) is currently in process and will be posted shortly within the next few minutes or hours!
              </p>
              <p className="text-xs text-[#65676B] pt-1 flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 text-[#0866FF] animate-spin" />
                Your social media manager has received your business details.
              </p>
            </div>

            {clientProfile?.business_niche && (
              <div className="bg-[#F0F2F5] p-4 rounded-xl text-left space-y-2 border border-[#E4E6EA] text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#0866FF]">
                  <Tag className="w-3.5 h-3.5" /> Saved Niche: {clientProfile.business_niche}
                </div>
                {clientProfile.business_description && (
                  <p className="text-[#65676B] italic">&quot;{clientProfile.business_description}&quot;</p>
                )}
              </div>
            )}
          </div>
        ) : (
          /* 3. Custom 7-Day Picture Batch Cards Grid */
          <>
            <div className="bg-white border border-[#E4E6EA] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#0866FF]" />
                <div>
                  <p className="text-xs font-semibold uppercase text-[#65676B]">Active 7-Day Batch</p>
                  <p className="text-sm font-bold text-[#050505]">
                    {batch ? `Week of ${batch.week_start_date} — ${batch.week_end_date}` : 'Loading...'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleDownloadAllApproved}
                disabled={approvedCount === 0 || zipping}
                className="sm:hidden w-full py-2 bg-[#0866FF] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <Archive className="w-4 h-4" /> Download All Approved ({approvedCount})
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#E4E6EA]">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const itemsForDay = items.filter((i) => i.day_number === day);
                const approvedForDay = itemsForDay.filter((i) => i.status === 'approved').length;
                return (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                      activeDay === day
                        ? 'bg-[#0866FF] text-white shadow-sm'
                        : 'bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6EA] hover:text-[#050505]'
                    }`}
                  >
                    Day {day}
                    {approvedForDay > 0 && (
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          activeDay === day ? 'bg-white text-[#0866FF]' : 'bg-emerald-500 text-white'
                        }`}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div>
              <h2 className="font-bold text-lg text-[#050505] mb-4">Day {activeDay} Content Schedule</h2>

              {loading ? (
                <div className="p-12 text-center text-sm text-[#65676B]">Loading media cards...</div>
              ) : dayItems.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-[#E4E6EA] rounded-xl text-sm text-[#65676B]">
                  No content scheduled for Day {activeDay}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dayItems.map((item) => {
                    const isApproved = item.status === 'approved';
                    const isEditRequested = item.status === 'edit_requested';
                    const isPending = item.status === 'pending';

                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-[#E4E6EA] rounded-xl overflow-hidden shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative aspect-square w-full bg-black border-b border-[#E4E6EA] overflow-hidden group">
                            {item.file_url.endsWith('.mp4') || item.file_url.endsWith('.mov') ? (
                              <video src={item.file_url} controls className="w-full h-full object-cover" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.file_url} alt="Media asset" className="w-full h-full object-cover" />
                            )}

                            <div className="absolute top-3 left-3 bg-[#0866FF] text-white text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider shadow-sm">
                              {item.type}
                            </div>

                            <div className="absolute top-3 right-3">
                              {isApproved && (
                                <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                                </span>
                              )}
                              {isEditRequested && (
                                <span className="bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                                  <Clock className="w-3.5 h-3.5" /> Edit Requested
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            <p className="text-xs text-[#050505] leading-relaxed whitespace-pre-wrap">{item.caption}</p>
                            {item.hashtags && (
                              <p className="text-xs font-semibold text-[#0866FF] break-words">{item.hashtags}</p>
                            )}
                          </div>
                        </div>

                        <div className="p-4 border-t border-[#E4E6EA] bg-[#F0F2F5]/30">
                          {isPending && (
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => handleApprove(item.id)}
                                className="py-2.5 bg-[#0866FF] hover:bg-[#0055D4] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-4 h-4" /> Approve
                              </button>
                              <button
                                onClick={() => openEditModal(item)}
                                className="py-2.5 bg-white border border-[#E4E6EA] hover:bg-[#F0F2F5] text-[#050505] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4 text-[#65676B]" /> Edit
                              </button>
                            </div>
                          )}

                          {isApproved && (
                            <button
                              onClick={() =>
                                handleDownloadSingle(
                                  item.file_url,
                                  `Day_${item.day_number}_${item.type}.${item.file_url.split('.').pop() || 'jpg'}`
                                )
                              }
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Download className="w-4 h-4" /> Download Asset
                            </button>
                          )}

                          {isEditRequested && (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-2">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span>Edit requested — updating shortly</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Edit Modal */}
      {editModalItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E6EA] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E6EA] pb-3">
              <h3 className="font-bold text-base text-[#050505]">
                Request Edits for Day {editModalItem.day_number} [{editModalItem.type.toUpperCase()}]
              </h3>
              <button onClick={() => setEditModalItem(null)} className="p-1 rounded text-[#65676B] hover:bg-[#F0F2F5]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5">
                  What would you like changed?
                </label>
                <textarea
                  required
                  rows={4}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="e.g. Please adjust the caption to emphasize our bio link, or tweak the second line of text..."
                  className="w-full p-3 border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E4E6EA]">
                <button
                  type="button"
                  onClick={() => setEditModalItem(null)}
                  className="px-4 py-2 bg-[#F0F2F5] text-[#050505] rounded-lg text-xs font-semibold hover:bg-[#E4E6EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 bg-[#0866FF] hover:bg-[#0055D4] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingEdit ? 'Submitting...' : 'Submit Edit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
