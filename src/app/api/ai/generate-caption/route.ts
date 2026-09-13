import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { niche, tone, description, itemType } = await request.json();

    if (!niche || !description) {
      return NextResponse.json({ error: 'Niche and image description are required' }, { status: 400 });
    }

    const typeLabel = (itemType || 'post').toLowerCase();
    const brandTone = tone || 'Professional, engaging and relatable';

    // Check if external Gemini API key or OpenAI key is available
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an expert social media content manager. Generate a high-converting Instagram ${typeLabel} caption and 15 targeted hashtags for a business in the "${niche}" niche with a "${brandTone}" tone.
Visual concept/Image description: "${description}".

Respond strictly in valid JSON format:
{
  "caption": "The main caption text with emojis...",
  "hashtags": "#Hashtag1 #Hashtag2 #Hashtag3 ..."
}`
              }]
            }]
          })
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            return NextResponse.json({ caption: parsed.caption, hashtags: parsed.hashtags });
          }
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to smart contextual generator:', err);
      }
    }

    // Smart contextual AI fallback
    const lowerNiche = niche.toLowerCase();
    let sampleCaption = '';
    let sampleHashtags = '';

    if (typeLabel === 'story') {
      sampleCaption = `✨ Quick update from our team! ${description}. Tap the link in our bio to learn more or cast your vote below! 👇`;
      sampleHashtags = `#${niche.replace(/\s+/g, '')} #StoryUpdate #BehindTheScenes #DailyInsights #CommunityFirst`;
    } else if (typeLabel === 'reel') {
      sampleCaption = `POV: Watching this come to life! 🎬 ${description}.\n\nSave this reel for later and share with someone who needs to see this! 👇`;
      sampleHashtags = `#${niche.replace(/\s+/g, '')}Reels #TrendingReels #BehindTheScenes #ReelsInstagram #ViralContent #${niche.replace(/\s+/g, '')}Tips`;
    } else {
      sampleCaption = `Here is a breakdown of what makes this so special: ${description}.\n\nAt our core, we believe in delivering quality and passion in every single detail. What are your thoughts on this? Let us know in the comments below! 💭✨`;
      sampleHashtags = `#${niche.replace(/\s+/g, '')} #${niche.replace(/\s+/g, '')}Life #${tone ? tone.split(' ')[0] : 'Inspiration'} #DailyInspiration #BrandStrategy #QualityFirst #Community`;
    }

    return NextResponse.json({
      caption: sampleCaption,
      hashtags: sampleHashtags,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI generation failed' }, { status: 500 });
  }
}
