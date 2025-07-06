
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
      throw new Error('User not authenticated');
    }

    const requestData = await req.json();
    const { headline, article, excerpt } = requestData;

    if (!headline || !article || !excerpt) {
      throw new Error('Missing required fields: headline, article, or excerpt');
    }

    // For WordPress API, we'll need to use Application Passwords since Google OAuth 
    // integration with WordPress requires specific setup on the WordPress side.
    // The user will need to generate an Application Password in their WordPress admin.
    
    const wpUsername = Deno.env.get('WORDPRESS_USERNAME');
    const wpPassword = Deno.env.get('WORDPRESS_APP_PASSWORD'); // Application Password, not regular password
    
    if (!wpUsername || !wpPassword) {
      throw new Error('WordPress credentials not configured');
    }

    // Create the WordPress post data
    const wordpressPostData = {
      title: headline,
      content: article,
      excerpt: excerpt,
      status: 'draft',
      author: 1, // Default to admin user, can be made configurable
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
