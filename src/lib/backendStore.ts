/**
 * Direct API calls to Render PostgreSQL backend.
 * Used by admin panel and auth to ensure global data sharing.
 */
const API = '/api/db';

async function post(action: string, data: any = {}) {
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'API error');
  return json;
}

export async function apiRegister(email: string, password: string, fullName?: string) {
  const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  await post('register', { id, email: email.toLowerCase(), fullName: fullName || email.split('@')[0], password });
  return { id, email: email.toLowerCase(), fullName: fullName || email.split('@')[0], frozen: false };
}

export async function apiSignIn(email: string, password: string): Promise<any> {
  const res = await post('signin', { email: email.toLowerCase(), password });
  return res.user;
}

export async function apiGetAllUsers(): Promise<any[]> {
  const res = await post('getAllUsers');
  return res.users || [];
}

export async function apiGetAllAccounts(): Promise<any[]> {
  const res = await post('getAllAccounts');
  return res.accounts || [];
}

export async function apiGetAllTransactions(): Promise<any[]> {
  const res = await post('getAllTransactions');
  return res.transactions || [];
}

export async function apiGetAllKyc(): Promise<any[]> {
  const res = await post('getAllKyc');
  return res.kyc || [];
}

export async function apiGetAuditLogs(): Promise<any[]> {
  const res = await post('getAuditLogs');
  return res.logs || [];
}

export async function apiUpdateBalance(accountId: string, balanceCents: number) {
  return post('updateBalance', { accountId, balanceCents });
}

export async function apiAddTransaction(tx: any) {
  const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  return post('addTransaction', { id, ...tx });
}

export async function apiAddAuditLog(log: any) {
  const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  return post('addAuditLog', { id, ...log });
}

export async function apiToggleFreeze(userId: string) {
  const res = await post('toggleFreeze', { userId });
  return res.user;
}

export async function apiDeleteUser(userId: string) {
  return post('deleteUser', { userId });
}

export async function apiUpdateKyc(kycId: string, status: string) {
  return post('updateKycStatus', { kycId, status });
}