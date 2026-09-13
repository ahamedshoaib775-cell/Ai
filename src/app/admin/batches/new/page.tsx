'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Upload, Plus, Trash2, Tag, Megaphone } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface BatchItem {
  id: string;
  day_number: number;
  type: 'post' | 'reel' | 'story';
  file_url: string;
  file_preview?: string;
  caption: string;
  hashtags: string;
}

function NewBatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramClientId = searchParams.get('client_id');

  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(paramClientId || '');
  const [weekStartDate, setWeekStartDate] = useState('2026-09-15');
  const [weekEndDate, setWeekEndDate] = useState('2026-09-21');
  const [activeDay, setActiveDay] = useState(1);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // AI Modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTargetItemId, setAiTargetItemId] = useState('');
  const [aiNiche, setAiNiche] = useState('');
  const [aiTone, setAiTone] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch('/api/clients');
        if (res.ok) {
          const data = await res.json();
          setClients(data.clients || []);
          if (data.clients && data.clients.length > 0) {
            if (paramClientId && data.clients.some((c: any) => c.id === paramClientId)) {
              setSelectedClientId(paramClientId);
            } else if (!selectedClientId) {
              setSelectedClientId(data.clients[0].id);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingClients(false);
      }
    }
    loadClients();

    const initialItems: BatchItem[] = [];
    for (let day = 1; day <= 7; day++) {
      initialItems.push({
        id: `item_day_${day}_1`,
        day_number: day,
        type: 'post',
        file_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
        caption: `Day ${day} custom post caption...`,
        hashtags: `#Day${day} #SocialMediaStrategy`,
      });
    }
    setItems(initialItems);
  }, [paramClientId]);

  const handleFileUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, file_url: data.file_url } : item))
        );
      }
    } catch (err) {
      console.error('File upload failed', err);
    }
  };

  const addItemToDay = (day: number) => {
    const newItem: BatchItem = {
      id: `item_day_${day}_${Date.now()}`,
      day_number: day,
      type: 'story',
      file_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
      caption: '',
      hashtags: '',
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const openAiModal = (itemId: string) => {
    setAiTargetItemId(itemId);
    const item = items.find((i) => i.id === itemId);

    if (selectedClient) {
      setAiNiche(selectedClient.business_niche || 'Digital Agency');
      setAiTone(selectedClient.brand_tone || 'Professional & Modern');
      setAiDescription(
        selectedClient.business_description || `Visual concept for Day ${item?.day_number} ${item?.type}`
      );
    } else {
      setAiNiche('Digital Agency');
      setAiTone('Professional & Modern');
      setAiDescription(`Visual concept for Day ${item?.day_number} ${item?.type}`);
    }

    setAiModalOpen(true);
  };

  const generateAiCaption = async () => {
    if (!aiDescription) return;
    setAiGenerating(true);

    try {
      const item = items.find((i) => i.id === aiTargetItemId);
      const res = await fetch('/api/ai/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: aiNiche,
          tone: aiTone,
          description: aiDescription,
          itemType: item?.type || 'post',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((i) =>
            i.id === aiTargetItemId
              ? { ...i, caption: data.caption || i.caption, hashtags: data.hashtags || i.hashtags }
              : i
          )
        );
        setAiModalOpen(false);
      }
    } catch (err) {
      console.error('AI generation error', err);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveBatch = async () => {
    if (!selectedClientId) {
      setError('Please select a client');
      return;
    }
    if (items.length === 0) {
      setError('Batch must contain at least one content item');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClientId,
          week_start_date: weekStartDate,
          week_end_date: weekEndDate,
          items: items.map(({ day_number, type, file_url, caption, hashtags }) => ({
            day_number,
            type,
            file_url,
            caption,
            hashtags,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create batch');
      }

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Error saving batch');
    } finally {
      setSaving(false);
    }
  };

  const currentDayItems = items.filter((i) => i.day_number === activeDay);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E6EA] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#050505] tracking-tight">7-Day Batch Builder</h1>
          <p className="text-sm text-[#65676B] mt-1">Upload custom 7-day picture content for client review & approval.</p>
        </div>

        <button
          onClick={handleSaveBatch}
          disabled={saving}
          className="px-6 py-2.5 bg-[#0866FF] hover:bg-[#0055D4] text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Publishing Pictures...' : 'Save & Publish Batch to Client'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Batch Metadata Form */}
      <div className="bg-white border border-[#E4E6EA] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5">
              Target Client
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
            >
              {loadingClients ? (
                <option>Loading clients...</option>
              ) : (
                clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5">
              Week Start Date
            </label>
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5">
              Week End Date
            </label>
            <input
              type="date"
              value={weekEndDate}
              onChange={(e) => setWeekEndDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
            />
          </div>
        </div>

        {/* Saved Client Business Info Banner */}
        {selectedClient && selectedClient.business_niche && (
          <div className="p-3 bg-[#0866FF]/5 border border-[#0866FF]/20 rounded-lg text-xs text-[#050505] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0866FF] shrink-0" />
              <span>
                Submitted Business Profile: <strong className="text-[#0866FF]">{selectedClient.business_niche}</strong> ({selectedClient.brand_tone || 'Standard Tone'})
              </span>
            </div>
            {selectedClient.business_description && (
              <span className="text-[#65676B] text-[11px] italic truncate max-w-sm">&quot;{selectedClient.business_description}&quot;</span>
            )}
          </div>
        )}
      </div>

      {/* Day Selector Pill Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const count = items.filter((i) => i.day_number === day).length;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeDay === day
                  ? 'bg-[#0866FF] text-white shadow-sm'
                  : 'bg-[#F0F2F5] text-[#65676B] hover:bg-[#E4E6EA] hover:text-[#050505]'
              }`}
            >
              Day {day}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeDay === day ? 'bg-white/20 text-white' : 'bg-black/10 text-[#050505]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Day Content Items */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-[#050505]">Content for Day {activeDay}</h2>
          <button
            onClick={() => addItemToDay(activeDay)}
            className="px-3 py-1.5 bg-[#F0F2F5] hover:bg-[#E4E6EA] text-[#0866FF] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Item to Day {activeDay}
          </button>
        </div>

        {currentDayItems.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#E4E6EA] rounded-xl text-sm text-[#65676B]">
            No content added for Day {activeDay} yet. Click &quot;Add Item to Day {activeDay}&quot; above.
          </div>
        ) : (
          currentDayItems.map((item, idx) => (
            <div key={item.id} className="bg-white border border-[#E4E6EA] rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E4E6EA] pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#65676B]">Item #{idx + 1}</span>
                  <div className="flex bg-[#F0F2F5] p-1 rounded-lg">
                    {(['post', 'reel', 'story'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setItems((prev) =>
                            prev.map((i) => (i.id === item.id ? { ...i, type: t } : i))
                          )
                        }
                        className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition-colors cursor-pointer ${
                          item.type === t
                            ? 'bg-[#0866FF] text-white shadow-xs'
                            : 'text-[#65676B] hover:text-[#050505]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 text-[#65676B] hover:text-red-600 hover:bg-[#F0F2F5] rounded-lg transition-colors cursor-pointer"
                  title="Remove Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider">
                    Media File (Image / Video)
                  </label>
                  <div className="border border-[#E4E6EA] rounded-lg p-3 text-center space-y-3 bg-[#F0F2F5]/30">
                    {item.file_url ? (
                      <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-[#E4E6EA] bg-black">
                        {item.file_url.endsWith('.mp4') || item.file_url.endsWith('.mov') ? (
                          <video src={item.file_url} controls className="w-full h-full object-cover" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.file_url} alt="Preview" className="w-full h-full object-cover" />
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-xs text-[#65676B]">No file uploaded yet</div>
                    )}

                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E4E6EA] hover:bg-[#F0F2F5] rounded-lg text-xs font-semibold text-[#050505] cursor-pointer transition-colors w-full justify-center">
                      <Upload className="w-3.5 h-3.5 text-[#0866FF]" /> Replace Media File
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => handleFileUpload(item.id, e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider">
                      Caption Text
                    </label>
                    <button
                      type="button"
                      onClick={() => openAiModal(item.id)}
                      className="px-2.5 py-1 bg-[#0866FF]/10 text-[#0866FF] hover:bg-[#0866FF]/20 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Generate Caption & Hashtags
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={item.caption}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((i) => (i.id === item.id ? { ...i, caption: e.target.value } : i))
                      )
                    }
                    placeholder="Write Instagram caption..."
                    className="w-full p-3 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
                  />

                  <div>
                    <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1">
                      Hashtags
                    </label>
                    <input
                      type="text"
                      value={item.hashtags}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, hashtags: e.target.value } : i))
                        )
                      }
                      placeholder="#DigitalAgency #BrandStrategy #WebDesign"
                      className="w-full px-3 py-2 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#0866FF] font-medium focus:outline-none focus:border-[#0866FF]"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Assistant Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E6EA] rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E6EA] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0866FF]" />
                <h3 className="font-bold text-lg text-[#050505]">AI Caption & Hashtag Assistant</h3>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="text-xs text-[#65676B] hover:underline">
                Close
              </button>
            </div>

            {selectedClient?.business_niche && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 font-medium">
                ✓ Auto-filled from {selectedClient.name}&apos;s submitted business profile!
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1">
                  Business Niche / Industry
                </label>
                <input
                  type="text"
                  value={aiNiche}
                  onChange={(e) => setAiNiche(e.target.value)}
                  placeholder="e.g. Website & Digital Agency"
                  className="w-full px-3.5 py-2 border border-[#E4E6EA] rounded-lg text-sm text-[#050505]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1">
                  Brand Tone of Voice
                </label>
                <input
                  type="text"
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  placeholder="e.g. Professional, Modern & Tech-savvy"
                  className="w-full px-3.5 py-2 border border-[#E4E6EA] rounded-lg text-sm text-[#050505]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1">
                  Image / Visual Concept Description
                </label>
                <textarea
                  rows={3}
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="e.g. Showcase our modern web design dashboard mockup for clients"
                  className="w-full p-3 border border-[#E4E6EA] rounded-lg text-sm text-[#050505]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="px-4 py-2 bg-[#F0F2F5] text-[#050505] rounded-lg text-sm font-semibold hover:bg-[#E4E6EA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={generateAiCaption}
                disabled={aiGenerating}
                className="px-5 py-2 bg-[#0866FF] hover:bg-[#0055D4] text-white font-semibold rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {aiGenerating ? (
                  'Generating...'
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Pre-fill Caption & Hashtags
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminNewBatchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#65676B]">Loading batch builder...</div>}>
      <NewBatchContent />
    </Suspense>
  );
}
