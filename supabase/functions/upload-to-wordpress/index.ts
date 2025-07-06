
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('WordPress upload function called');
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header found');
      throw new Error('No authorization header');
    }

    // Create Supabase client to verify the user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      throw new Error('User not authenticated');
    }

    console.log('User authenticated:', user.email);

    const requestData = await req.json();
    const { headline, article, excerpt } = requestData;

    if (!headline || !article || !excerpt) {
      console.error('Missing required fields:', { headline: !!headline, article: !!article, excerpt: !!excerpt });
      throw new Error('Missing required fields: headline, article, or excerpt');
    }

    console.log('Request data received, preparing WordPress API call');

    // Get WordPress credentials from environment
    const wpUsername = Deno.env.get('WORDPRESS_USERNAME');
    const wpPassword = Deno.env.get('WORDPRESS_APP_PASSWORD');
    
    if (!wpUsername || !wpPassword) {
      console.error('WordPress credentials not configured');
      throw new Error('WordPress credentials not configured');
    }

    console.log('WordPress credentials found, making API call');

    // Create the WordPress post data
    const wordpressPostData = {
      title: headline,
      content: article,
      excerpt: excerpt,
      status: 'draft',
      author: 1, // Default to admin user
    };

    // Make the request to WordPress REST API
    const wpResponse = await fetch('https://hospitalityfn.com/wp-json/wp/v2/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${wpUsername}:${wpPassword}`)
      },
      body: JSON.stringify(wordpressPostData)
    });

    console.log('WordPress API response status:', wpResponse.status);

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error('WordPress API Error:', wpResponse.status, errorText);
      throw new Error(`WordPress API error: ${wpResponse.status} - ${errorText}`);
    }

    const wpResult = await wpResponse.json();
    
    console.log(`WordPress post created successfully for user: ${user.email}, Post ID: ${wpResult.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      postId: wpResult.id,
      editUrl: `https://hospitalityfn.com/wp-admin/post.php?post=${wpResult.id}&action=edit`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error uploading to WordPress:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Failed to upload to WordPress'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
