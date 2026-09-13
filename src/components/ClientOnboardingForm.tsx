'use client';

import { useState } from 'react';
import { Building2, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Tag, MessageSquare, Megaphone } from 'lucide-react';

interface Props {
  initialName?: string;
  onComplete: () => void;
}

export default function ClientOnboardingForm({ initialName = '', onComplete }: Props) {
  const [businessName, setBusinessName] = useState(initialName);
  const [niche, setNiche] = useState('');
  const [description, setDescription] = useState('');
  const [tone, setTone] = useState('Professional, Modern & Tech-savvy');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !niche || !description) {
      setError('Please fill in all business details.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName,
          business_niche: niche,
          business_description: description,
          brand_tone: tone,
          onboarding_completed: 1,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save business profile');
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Error saving business profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white border border-[#E4E6EA] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 my-6">
      <div className="text-center space-y-2 border-b border-[#E4E6EA] pb-6">
        <div className="w-14 h-14 bg-[#0866FF]/10 text-[#0866FF] rounded-2xl flex items-center justify-center mx-auto mb-2">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-[#050505] tracking-tight">Tell Us About Your Business</h2>
        <p className="text-sm text-[#65676B] max-w-md mx-auto">
          Help your social media manager create perfectly tailored Instagram posts, reels, and captions for your brand.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#0866FF]" /> Business / Brand Name
          </label>
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Velocity / Acme Studio"
            className="w-full px-4 py-2.5 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#0866FF]" /> Business Niche / Industry
          </label>
          <input
            type="text"
            required
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="e.g. Website & Digital Agency / Fitness Studio / Skincare Brand"
            className="w-full px-4 py-2.5 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#0866FF]" /> What Does Your Business Do?
          </label>
          <textarea
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your products, services, or core mission (e.g. We build custom websites, branding, and digital marketing strategies for high-growth startups)..."
            className="w-full p-3.5 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#050505] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Megaphone className="w-3.5 h-3.5 text-[#0866FF]" /> Brand Tone of Voice
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-[#E4E6EA] rounded-lg text-sm text-[#050505] focus:outline-none focus:border-[#0866FF]"
          >
            <option value="Professional, Modern & Tech-savvy">Professional, Modern & Tech-savvy</option>
            <option value="Warm, Friendly & Welcoming">Warm, Friendly & Welcoming</option>
            <option value="Energetic, Motivational & Bold">Energetic, Motivational & Bold</option>
            <option value="Sophisticated, Elegant & Minimalist">Sophisticated, Elegant & Minimalist</option>
            <option value="Playful, Creative & Casual">Playful, Creative & Casual</option>
          </select>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-[#0866FF] hover:bg-[#0055D4] text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              'Saving Business Profile...'
            ) : (
              <>
                Save Profile & Send to Admin <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
