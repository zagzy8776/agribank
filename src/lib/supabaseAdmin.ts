import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Get Supabase client with service role token (admin powers)
 */
export const getAdminClient = async (serviceToken: string): Promise<SupabaseClient> => {
  if (adminClient && adminClient.auth.getSession()?.data?.session?.access_token === serviceToken) {
    return adminClient;
  }

  adminClient = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    serviceToken,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  return adminClient;
};

/**
 * Admin RPC helper - call Edge functions securely
 */
export const adminRPC = async (
  fnName: string,
  params: any,
  serviceToken: string
): Promise<any> => {
  const admin = await getAdminClient(serviceToken);
  const { data, error } = await admin.functions.invoke(fnName, params);
  
  if (error) throw new Error(error.message);
  return data;
};

