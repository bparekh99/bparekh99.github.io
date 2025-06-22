
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, articleType } = await req.json();

    const typePrompts = {
      'breaking-news': 'Create a satirical breaking news article about the hospitality industry. Focus on fake industry announcements, satirical trends, or parody press releases.',
      'guest-relations': 'Create a satirical guest relations article about the hospitality industry. Focus on fictional customer complaints, satirical reviews, or "overheard at the front desk" scenarios.',
      'industry-deep-dives': 'Create a satirical industry deep dive article about the hospitality industry. Focus on fake investigations, satirical profiles, or parody trend analyses.',
      'travel-tourism': 'Create a satirical travel & tourism article. Focus on fake destination guides, satirical travel advisories, or parody announcements.'
    };

    const prompt = `You are a professional satirical writer for "Hospitality FN," a humor publication about the hospitality industry. 

Based on this user idea: "${idea}"

${typePrompts[articleType as keyof typeof typePrompts]}

Create a satirical article that:
- Uses the user's idea as the foundation for all content
- Is professional satire suitable for a public publication
- Contains NO profanity, violence, illegal content, or discriminatory language
- Does NOT reference real companies or people
- Uses hospitality industry terminology and SEO-friendly keywords
- Is exactly 250-350 words

Respond with a JSON object containing:
{
  "headline": "A catchy, satirical headline based on the user's idea",
  "article": "The full article (350 words max) based on the user's idea",
  "excerpt": "A 50-word excerpt summarizing the article",
  "socialCaption": "A social media caption with relevant hashtags"
}

Keep the tone satirical but professional. Make it obviously fake/satirical while being entertaining.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Parse the JSON response from Gemini
    let articleData;
    try {
      // Remove any markdown code blocks if present
      const cleanedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
      articleData = JSON.parse(cleanedText);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      throw new Error('Failed to parse generated content');
    }

    return new Response(JSON.stringify(articleData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-article function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
