
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting storage (in-memory for demo, use Redis in production)
const rateLimitStore = new Map();
const RATE_LIMIT_PER_MINUTE = 5;
const RATE_LIMIT_PER_DAY = 20;
const MAX_PAYLOAD_SIZE = 10240; // 10KB

// Enhanced content filtering patterns
const inappropriatePatterns = [
  /\b(fuck|shit|damn|hell|ass|bitch|bastard|cunt|cock|dick)\b/gi,
  /\b(kill|murder|death|violence|harm|hurt|attack|assault|rape)\b/gi,
  /\b(illegal|drugs|cocaine|marijuana|heroin|meth|crack|cannabis)\b/gi,
  /\b(hate|racism|sexism|discrimination|nazi|terrorist|bomb)\b/gi,
  /\b(sexual|porn|explicit|nude|xxx|sex|orgasm|masturbat)\b/gi,
  /\b(suicide|self-harm|cutting|overdose)\b/gi,
  /\b(scam|fraud|phishing|hack|exploit|malware)\b/gi
];

const allowedArticleTypes = ['breaking-news', 'guest-relations', 'industry-deep-dives', 'travel-tourism'];

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('cf-connecting-ip') || 
         'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const minuteKey = `${ip}:${Math.floor(now / 60000)}`;
  const dayKey = `${ip}:${Math.floor(now / 86400000)}`;
  
  // Clean old entries
  for (const [key] of rateLimitStore) {
    const [, timestamp] = key.split(':');
    if (now - parseInt(timestamp) * 60000 > 86400000) {
      rateLimitStore.delete(key);
    }
  }
  
  const minuteCount = rateLimitStore.get(minuteKey) || 0;
  const dayCount = rateLimitStore.get(dayKey) || 0;
  
  if (minuteCount >= RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, resetTime: Math.ceil(now / 60000) * 60000 };
  }
  
  if (dayCount >= RATE_LIMIT_PER_DAY) {
    return { allowed: false, resetTime: Math.ceil(now / 86400000) * 86400000 };
  }
  
  rateLimitStore.set(minuteKey, minuteCount + 1);
  rateLimitStore.set(dayKey, dayCount + 1);
  
  return { allowed: true };
}

function validateInput(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!data.idea || typeof data.idea !== 'string') {
    errors.push('Idea is required and must be a string');
  }
  
  if (!data.articleType || typeof data.articleType !== 'string') {
    errors.push('Article type is required and must be a string');
  }
  
  // Validate idea length
  if (data.idea && (data.idea.length < 100 || data.idea.length > 5000)) {
    errors.push('Idea must be between 100 and 5000 characters');
  }
  
  // Validate article type
  if (data.articleType && !allowedArticleTypes.includes(data.articleType)) {
    errors.push('Invalid article type');
  }
  
  return { valid: errors.length === 0, errors };
}

function checkContentAppropriate(text: string): { appropriate: boolean; violations: string[] } {
  const violations: string[] = [];
  
  for (const pattern of inappropriatePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      violations.push(`Inappropriate content detected: ${matches[0]}`);
    }
  }
  
  // Additional checks for suspicious patterns
  if (text.includes('http://') || text.includes('https://')) {
    violations.push('URLs not allowed in content');
  }
  
  if (text.match(/\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/)) {
    violations.push('Credit card patterns not allowed');
  }
  
  if (text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)) {
    violations.push('Email addresses not allowed');
  }
  
  return { appropriate: violations.length === 0, violations };
}

function sanitizeError(error: any): string {
  // Return generic error messages to avoid information disclosure
  if (error.message?.includes('API')) {
    return 'External service temporarily unavailable';
  }
  if (error.message?.includes('parse') || error.message?.includes('JSON')) {
    return 'Content generation failed';
  }
  return 'An error occurred while processing your request';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = getClientIP(req);
  console.log(`Request from IP: ${clientIP}`);

  try {
    // Check content length before parsing
    const contentLength = parseInt(req.headers.get('content-length') || '0');
    if (contentLength > MAX_PAYLOAD_SIZE) {
      console.log(`Request rejected: payload too large (${contentLength} bytes) from IP: ${clientIP}`);
      return new Response(JSON.stringify({ 
        error: 'Request payload too large',
        code: 'PAYLOAD_TOO_LARGE'
      }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting check
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      console.log(`Request rejected: rate limit exceeded for IP: ${clientIP}`);
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        resetTime: rateLimitResult.resetTime
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '60'
        },
      });
    }

    const requestData = await req.json();
    
    // Input validation
    const validation = validateInput(requestData);
    if (!validation.valid) {
      console.log(`Request rejected: validation failed for IP: ${clientIP}`, validation.errors);
      return new Response(JSON.stringify({ 
        error: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: validation.errors
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { idea, articleType } = requestData;

    // Content appropriateness check
    const contentCheck = checkContentAppropriate(idea);
    if (!contentCheck.appropriate) {
      console.log(`Request rejected: inappropriate content from IP: ${clientIP}`, contentCheck.violations);
      return new Response(JSON.stringify({ 
        error: 'Content does not meet community guidelines',
        code: 'CONTENT_VIOLATION'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // API key check
    if (!geminiApiKey) {
      console.error('Gemini API key not configured');
      return new Response(JSON.stringify({ 
        error: 'Service configuration error',
        code: 'SERVICE_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const typePrompts = {
      'breaking-news': 'Create a satirical breaking news article about the hospitality industry. Focus on fake industry announcements, satirical trends, or parody press releases.',
      'guest-relations': 'Create a satirical guest relations article about the hospitality industry. Focus on fictional customer complaints, satirical reviews, or "overheard at the front desk" scenarios.',
      'industry-deep-dives': 'Create a satirical industry deep dive article about the hospitality industry. Focus on fake investigations, satirical profiles, or parody trend analyses.',
      'travel-tourism': 'Create a satirical travel & tourism article. Focus on fake destination guides, satirical travel advisories, or parody announcements.'
    };

    const prompt = `You are a professional satirical writer for "Hospitality FN," a humor publication about the hospitality industry. 

Based on this user idea: "${idea.substring(0, 1000)}" // Truncate for safety

${typePrompts[articleType as keyof typeof typePrompts]}

Create a satirical article that:
- Uses the user's idea as the foundation for all content
- Is professional satire suitable for a public publication
- Contains NO profanity, violence, illegal content, or discriminatory language
- Does NOT reference real companies or people
- Uses hospitality industry terminology and SEO-friendly keywords
- Is at least 250 words, but no more than 350 words

Respond with a JSON object containing:
{
  "headline": "A catchy, satirical headline based on the user's idea",
  "article": "The full article (350 words max) based on the user's idea",
  "excerpt": "A 50-word excerpt summarizing the article",
  "socialCaption": "A social media caption with relevant hashtags"
}

Keep the tone satirical but professional. Make it obviously fake/satirical while being entertaining.`;

    console.log(`Generating content for IP: ${clientIP}, type: ${articleType}`);

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
      console.error(`Gemini API error: ${response.status}`);
      throw new Error(`External API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Parse and validate the JSON response
    let articleData;
    try {
      const cleanedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
      articleData = JSON.parse(cleanedText);
      
      // Validate generated content structure
      if (!articleData.headline || !articleData.article || !articleData.excerpt || !articleData.socialCaption) {
        throw new Error('Generated content missing required fields');
      }
      
      // Final content check on generated content
      const generatedContentCheck = checkContentAppropriate(JSON.stringify(articleData));
      if (!generatedContentCheck.appropriate) {
        console.log(`Generated content rejected for IP: ${clientIP}`, generatedContentCheck.violations);
        throw new Error('Generated content inappropriate');
      }
      
    } catch (parseError) {
      console.error('Content generation or parsing failed:', parseError);
      throw new Error('Content generation failed');
    }

    console.log(`Content successfully generated for IP: ${clientIP}`);
    return new Response(JSON.stringify(articleData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-article function:', error);
    const sanitizedError = sanitizeError(error);
    
    return new Response(JSON.stringify({ 
      error: sanitizedError,
      code: 'GENERATION_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
