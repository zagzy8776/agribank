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

    const { userId, action, amount, reason, kycId, accountId, txId, transaction } = await req.json()

    const { data: targetUser } = userId
      ? await supabase.auth.admin.getUserById(userId)
      : { data: { user: null } }

    if (action !== 'admin_snapshot') {
      // 📝 LOG EVERY ACTION BEFORE IT HAPPENS
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        admin_email: user.email,
        action: action,
        target_user_id: userId,
        target_email: targetUser?.user?.email ?? null,
        amount: amount,
        reason: reason,
        ip_address: req.headers.get('x-forwarded-for')
      })
    }

    const result: Record<string, unknown> = {}

    // PROCESS ADMIN ACTIONS
    switch (action) {
      case 'admin_snapshot': {
        const [{ data: profiles }, { data: accounts }, { data: transactions }, { data: kyc }, { data: logs }] = await Promise.all([
          supabase.from('profiles').select('user_id, full_name, email, kyc_status'),
          supabase.from('accounts').select('id, user_id, name, currency, balance_cents, is_primary').order('created_at', { ascending: false }),
          supabase.from('transactions').select('id, user_id, account_id, direction, amount_cents, currency, description, status, created_at').order('created_at', { ascending: false }).limit(250),
          supabase.from('kyc_verifications').select('id, user_id, document_type, document_country, city, country, status, submitted_at').order('submitted_at', { ascending: false }).limit(80),
          supabase.from('admin_audit_logs').select('id, action, admin_email, target_email, amount, reason, created_at').order('created_at', { ascending: false }).limit(80),
        ])

        result.snapshot = {
          profiles: profiles ?? [],
          accounts: accounts ?? [],
          transactions: transactions ?? [],
          kyc: kyc ?? [],
          logs: logs ?? [],
        }
        break
      }

      case 'add_balance': {
        const deltaCents = Number(amount || 0)
        if (!Number.isFinite(deltaCents) || deltaCents <= 0) throw new Error('Invalid amount')

        const { data: account, error: accountErr } = await supabase
          .from('accounts')
          .select('id, balance_cents, currency')
          .eq('user_id', userId)
          .eq('is_primary', true)
          .maybeSingle()
        if (accountErr || !account) throw new Error('Primary account not found')

        const newBalance = Number(account.balance_cents) + deltaCents
        const { error: balErr } = await supabase
          .from('accounts')
          .update({ balance_cents: newBalance })
          .eq('id', account.id)
        if (balErr) throw balErr

        const { error: txErr } = await supabase.from('transactions').insert({
          user_id: userId,
          account_id: account.id,
          direction: 'credit',
          amount_cents: deltaCents,
          currency: account.currency,
          description: reason || 'Admin balance adjustment',
          category: 'Admin',
          network: 'internal',
          status: 'completed',
        })
        if (txErr) throw txErr

        result.balance_cents = newBalance
        break
      }

      case 'debit_balance': {
        const deltaCents = Number(amount || 0)
        if (!Number.isFinite(deltaCents) || deltaCents <= 0) throw new Error('Invalid amount')

        const { data: account, error: accountErr } = await supabase
          .from('accounts')
          .select('id, balance_cents, currency')
          .eq('user_id', userId)
          .eq('is_primary', true)
          .maybeSingle()
        if (accountErr || !account) throw new Error('Primary account not found')

        const newBalance = Number(account.balance_cents) - deltaCents
        if (newBalance < 0) throw new Error('Insufficient account balance')
        const { error: balErr } = await supabase
          .from('accounts')
          .update({ balance_cents: newBalance })
          .eq('id', account.id)
        if (balErr) throw balErr

        const { error: txErr } = await supabase.from('transactions').insert({
          user_id: userId,
          account_id: account.id,
          direction: 'debit',
          amount_cents: deltaCents,
          currency: account.currency,
          description: reason || 'Admin balance debit',
          category: 'Admin',
          network: 'internal',
          status: 'completed',
        })
        if (txErr) throw txErr

        result.balance_cents = newBalance
        break
      }

      case 'set_balance': {
        const desiredCents = Number(amount || 0)
        if (!Number.isFinite(desiredCents) || desiredCents < 0) throw new Error('Invalid amount')

        const { data: account, error: accountErr } = await supabase
          .from('accounts')
          .select('id, balance_cents, currency')
          .eq('user_id', userId)
          .eq('is_primary', true)
          .maybeSingle()
        if (accountErr || !account) throw new Error('Primary account not found')

        const deltaCents = desiredCents - Number(account.balance_cents)
        const { error: balErr } = await supabase
          .from('accounts')
          .update({ balance_cents: desiredCents })
          .eq('id', account.id)
        if (balErr) throw balErr

        if (deltaCents !== 0) {
          const { error: txErr } = await supabase.from('transactions').insert({
            user_id: userId,
            account_id: account.id,
            direction: deltaCents > 0 ? 'credit' : 'debit',
            amount_cents: Math.abs(deltaCents),
            currency: account.currency,
            description: reason || 'Admin set balance adjustment',
            category: 'Admin',
            network: 'internal',
            status: 'completed',
          })
          if (txErr) throw txErr
        }

        result.balance_cents = desiredCents
        break
      }

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

      case 'approve_kyc': {
        if (!kycId) throw new Error('kycId is required')
        const { error: kErr } = await supabase
          .from('kyc_verifications')
          .update({ status: 'verified', reviewed_at: new Date().toISOString() })
          .eq('id', kycId)
          .eq('user_id', userId)
        if (kErr) throw kErr

        const { error: pErr } = await supabase
          .from('profiles')
          .update({ kyc_status: 'verified' })
          .eq('user_id', userId)
        if (pErr) throw pErr
        break
      }

      case 'reject_kyc': {
        if (!kycId) throw new Error('kycId is required')
        const { error: kErr } = await supabase
          .from('kyc_verifications')
          .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
          .eq('id', kycId)
          .eq('user_id', userId)
        if (kErr) throw kErr

        const { error: pErr } = await supabase
          .from('profiles')
          .update({ kyc_status: 'rejected' })
          .eq('user_id', userId)
        if (pErr) throw pErr
        break
      }

      case 'create_transaction': {
        if (!transaction) throw new Error('transaction payload is required')

        const txPayload = {
          user_id: userId,
          account_id: accountId,
          direction: transaction.direction,
          amount_cents: Number(transaction.amount_cents || 0),
          currency: transaction.currency,
          description: transaction.description,
          category: transaction.category || 'Manual',
          counterparty_name: transaction.counterparty_name || null,
          network: transaction.network || 'internal',
          status: transaction.status || 'completed',
          reference: transaction.reference || null,
        }
        if (!txPayload.account_id || !txPayload.description || txPayload.amount_cents <= 0) {
          throw new Error('Invalid transaction payload')
        }

        const { data: inserted, error: txErr } = await supabase
          .from('transactions')
          .insert(txPayload)
          .select('id')
          .single()
        if (txErr) throw txErr

        if (transaction.apply_balance === true) {
          const { data: account, error: accountErr } = await supabase
            .from('accounts')
            .select('balance_cents')
            .eq('id', accountId)
            .eq('user_id', userId)
            .single()
          if (accountErr || !account) throw new Error('Account not found for balance apply')

          const nextBalance = txPayload.direction === 'credit'
            ? Number(account.balance_cents) + txPayload.amount_cents
            : Number(account.balance_cents) - txPayload.amount_cents
          if (nextBalance < 0) throw new Error('Balance cannot be negative')

          const { error: balErr } = await supabase
            .from('accounts')
            .update({ balance_cents: nextBalance })
            .eq('id', accountId)
          if (balErr) throw balErr
        }

        result.tx_id = inserted.id
        break
      }

      case 'update_transaction_status': {
        if (!txId) throw new Error('txId is required')
        const nextStatus = transaction?.status
        if (!nextStatus) throw new Error('status is required')
        const { error: txErr } = await supabase
          .from('transactions')
          .update({ status: nextStatus })
          .eq('id', txId)
          .eq('user_id', userId)
        if (txErr) throw txErr
        break
      }

      default:
        throw new Error('Unsupported action')
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