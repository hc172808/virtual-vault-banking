import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: 'CLIENT' | 'AGENT' | 'ADMIN';
  initial_balance?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth token to verify they're authenticated
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminUserId = claimsData.claims.sub;

    // Check if the requesting user is an admin
    const { data: adminProfile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('user_id', adminUserId)
      .single();

    if (profileError || adminProfile?.role !== 'ADMIN') {
      return new Response(
        JSON.stringify({ success: false, error: 'Only administrators can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, password, full_name, role, initial_balance = 0 } = body;

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: email, password, full_name, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    if (!['CLIENT', 'AGENT', 'ADMIN'].includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid role. Must be CLIENT, AGENT, or ADMIN' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key to create users
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user already exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'A user with this email already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the user in auth.users using service role
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        full_name,
        role,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create profile for the new user
    const { error: profileInsertError } = await adminClient
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        email,
        full_name,
        role,
        balance: initial_balance,
      });

    if (profileInsertError) {
      console.error('Error creating profile:', profileInsertError);
      // Note: User was created in auth.users but profile failed
      // This is a partial failure state
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User created but profile setup failed: ' + profileInsertError.message,
          user_id: newUser.user.id
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create wallet vault for the new user
    const { error: vaultError } = await adminClient
      .from('wallet_vault')
      .insert({
        user_id: newUser.user.id,
      });

    if (vaultError) {
      console.error('Error creating wallet vault:', vaultError);
      // Non-critical, user can set up wallet later
    }

    // Log the admin action
    await adminClient.from('activity_logs').insert({
      user_id: adminUserId,
      action_type: 'ADMIN_USER_CREATED',
      description: `Admin created new user: ${email} with role ${role}${initial_balance > 0 ? ` and initial balance ${initial_balance}` : ''}`,
    });

    // Add to user_roles table for RLS compatibility
    const roleMap: Record<string, string> = {
      'CLIENT': 'client',
      'AGENT': 'agent',
      'ADMIN': 'admin',
    };

    await adminClient.from('user_roles').insert({
      user_id: newUser.user.id,
      role: roleMap[role] as 'admin' | 'agent' | 'client',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${email} created successfully`,
        user_id: newUser.user.id,
        email,
        role,
        initial_balance,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Admin create user error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
