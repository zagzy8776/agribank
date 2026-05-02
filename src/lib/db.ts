/**
 * Database API layer — connects to Render PostgreSQL via Vercel.
 * All banking data flows through /api/db endpoint.
 */

const API = '/api/db';

function gid(): string {
  return crypto.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call(action: string, data?: Record<string, unknown>): Promise<any> {
  let res: Response;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data: data || {} }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Backend unreachable (${msg}). Is the API server running?`);
  }
  const text = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Backend returned invalid response (status ${res.status}). Expected JSON, got: ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(json.error || `API error (status ${res.status})`);
  return json;
}

// ---- types ----
export type User = { id: string; email: string; full_name: string; frozen: boolean; created_at: string };
export type Account = { id: string; user_id: string; name: string; currency: string; iban: string; balance_cents: number; is_primary: boolean; created_at: string };
export type Transaction = { id: string; user_id: string; account_id: string; direction: string; amount_cents: number; currency: string; description: string; category: string; counterparty_name?: string; counterparty_iban?: string; network?: string; status: string; created_at: string };
export type Kyc = { id: string; user_id: string; document_type: string | null; document_country: string | null; city: string | null; country: string | null; status: string; submitted_at: string };
export type AuditLog = { id: string; action: string; admin_email: string; target_email: string | null; amount: number | null; reason: string | null; created_at: string };
export type Recipient = { id: string; user_id: string; name: string; iban: string; swift_bic: string; bank_name: string; country: string; currency: string; is_favorite: boolean; created_at: string };

// ---- Auth ----
export async function registerUser(email: string, password: string, fullName?: string): Promise<User> {
  const id = gid();
  await call('register', { id, email: email.toLowerCase(), fullName: fullName || email.split('@')[0], password });
  return { id, email: email.toLowerCase(), full_name: fullName || email.split('@')[0], frozen: false, created_at: new Date().toISOString() };
}

export async function signInUser(email: string, password: string): Promise<User> {
  const res = await call('signin', { email: email.toLowerCase(), password });
  return res.user;
}

// ---- Queries ----
export async function getAllUsers(): Promise<User[]> {
  const res = await call('getAllUsers');
  return res.users || [];
}

export async function getUserById(userId: string): Promise<User | undefined> {
  const users = await getAllUsers();
  return users.find(u => u.id === userId);
}

export async function getUserAccounts(userId: string): Promise<Account[]> {
  const res = await call('getUserAccounts', { userId });
  return res.accounts || [];
}

export async function getAllAccounts(): Promise<Account[]> {
  const res = await call('getAllAccounts');
  return res.accounts || [];
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const res = await call('getAllTransactions');
  return res.transactions || [];
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const all = await getAllTransactions();
  return all.filter(t => t.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getAllKyc(): Promise<Kyc[]> {
  const res = await call('getAllKyc');
  return res.kyc || [];
}

export async function getAllAuditLogs(): Promise<AuditLog[]> {
  const res = await call('getAuditLogs');
  return res.logs || [];
}

export async function getUserRecipients(userId: string): Promise<Recipient[]> {
  const res = await call('getRecipients', { userId });
  return (res.recipients || []).sort((a: Recipient, b: Recipient) => b.created_at.localeCompare(a.created_at));
}

// ---- Mutations ----
export async function createAccount(userId: string, name: string, currency: string): Promise<Account> {
  const id = gid();
  const iban = 'DE89' + Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join('');
  await call('addAccount', { id, userId, name, currency, iban, balanceCents: 0, isPrimary: false });
  return { id, user_id: userId, name, currency, iban, balance_cents: 0, is_primary: false, created_at: new Date().toISOString() };
}

export async function updateBalance(accountId: string, balanceCents: number): Promise<void> {
  await call('updateBalance', { accountId, balanceCents });
}

export async function addTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<void> {
  await call('addTransaction', { id: gid(), ...tx });
}

export async function addAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void> {
  await call('addAuditLog', { id: gid(), ...log });
}

export async function toggleUserFreeze(userId: string): Promise<User | null> {
  const res = await call('toggleFreeze', { userId });
  return res.user || null;
}

export async function deleteUser(userId: string): Promise<void> {
  await call('deleteUser', { userId });
}

export async function updateKycStatus(kycId: string, status: string): Promise<void> {
  await call('updateKycStatus', { kycId, status });
}

export async function submitKyc(kyc: { userId: string; documentType: string; documentCountry: string; city: string; country: string }): Promise<void> {
  await call('submitKyc', { id: gid(), ...kyc });
}

export async function addRecipient(r: { userId: string; name: string; iban: string; swiftBic?: string; bankName?: string; country?: string; currency: string }): Promise<void> {
  await call('addRecipient', { id: gid(), ...r });
}

export async function isUserFrozen(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  return user?.frozen ?? false;
}

export async function getPrimaryAccount(userId: string): Promise<Account | undefined> {
  const accts = await getUserAccounts(userId);
  return accts.find(a => a.is_primary) || accts[0];
}

// ---- Crypto mock ----
export function getMockCryptoPrices() {
  return [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price_eur: 63245.82, change_24h: 2.34 },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price_eur: 2947.15, change_24h: -1.12 },
    { id: 'solana', symbol: 'SOL', name: 'Solana', price_eur: 142.68, change_24h: 5.67 },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', price_eur: 0.3841, change_24h: -0.45 },
    { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', price_eur: 6.28, change_24h: 1.89 },
    { id: 'matic', symbol: 'MATIC', name: 'Polygon', price_eur: 0.5293, change_24h: 3.21 },
    { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', price_eur: 13.87, change_24h: -2.03 },
    { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', price_eur: 7.64, change_24h: 0.78 },
  ];
}