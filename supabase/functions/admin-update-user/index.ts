// SERVER SIDE EDGE FUNCTION - RUNS ON SUPABASE
// THIS IS THE ONLY SAFE WAY TO MODIFY USER BALANCES
// CLIENT CAN NEVER MODIFY BALANCES DIRECTLY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get admin user from token
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)

    // 🔐 CHECK IF THIS USER IS ACTUALLY ADMIN
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const { userId, action, amount, reason } = await req.json()

    // 📝 LOG EVERY ACTION BEFORE IT HAPPENS
    await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: action,
      target_user_id: userId,
      amount: amount,
      reason: reason,
      ip_address: req.headers.get('x-forwarded-for')
    })

    let result: any = {}

    // PROCESS ADMIN ACTIONS
    switch (action) {
      case 'add_balance':
        const { data: updatedUser } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { 
            balance: () => `balance + ${amount}` 
          }
        })
        result.user = updatedUser
        break

      case 'freeze_account':
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { frozen: true }
        })
        break

      case 'unfreeze_account':
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { frozen: false }
        })
        break
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})