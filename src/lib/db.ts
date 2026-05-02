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

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  try {
    const res = await call('getAllUsers');
    return Array.isArray(res.users) ? res.users : [];
  } catch (err) {
    console.error("getAllUsers failed:", err);
    return [];
  }
}

export async function getUserById(userId: string): Promise<User | undefined> {
  try {
    const users = await getAllUsers();
    return users.find(u => u.id === userId);
  } catch (err) {
    console.error("getUserById failed:", err);
    return undefined;
  }
}

export async function getUserAccounts(userId: string): Promise<Account[]> {
  try {
    const res = await call('getUserAccounts', { userId });
    return Array.isArray(res.accounts) ? res.accounts : [];
  } catch (err) {
    console.error("getUserAccounts failed:", err);
    return [];
  }
}

export async function getAllAccounts(): Promise<Account[]> {
  try {
    const res = await call('getAllAccounts');
    return Array.isArray(res.accounts) ? res.accounts : [];
  } catch (err) {
    console.error("getAllAccounts failed:", err);
    return [];
  }
}

export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    const res = await call('getAllTransactions');
    return Array.isArray(res.transactions) ? res.transactions : [];
  } catch (err) {
    console.error("getAllTransactions failed:", err);
    return [];
  }
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  try {
    const res = await call('getUserTransactions', { userId });
    return res.transactions || [];
  } catch (err) {
    console.error("getUserTransactions failed:", err);
    return [];
  }
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
  try {
    const res = await call('getRecipients', { userId });
    const list = Array.isArray(res.recipients) ? res.recipients : [];
    return list.sort((a: Recipient, b: Recipient) => (b.created_at || '').localeCompare(a.created_at || ''));
  } catch (err) {
    console.error("getUserRecipients failed:", err);
    return [];
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const res = await call('getUserByEmail', { email });
    return res.user || null;
  } catch (err) {
    console.error("getUserByEmail failed:", err);
    return null;
  }
}

export async function getFxRates(): Promise<Record<string, number> | null> {
  try {
    const res = await call('getFxRates');
    return res.rates;
  } catch (err) {
    console.error("getFxRates failed:", err);
    return null;
  }
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

export async function internalTransfer(data: { fromAccountId: string; toEmail: string; amountCents: number; description?: string; userId: string }): Promise<void> {
  await call('internalTransfer', data);
}

export async function internationalTransfer(data: {
  fromAccountId: string;
  amountCents: number;
  totalCents: number;
  currency: string;
  description: string;
  recipientName: string;
  recipientIban: string;
  network: string;
  userId: string;
}): Promise<void> {
  await call('internationalTransfer', data);
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

export async function createCryptoAccount(userId: string, symbol: string): Promise<Account> {
  const id = gid();
  const name = `${symbol.toUpperCase()} Wallet`;
  const currency = symbol.toUpperCase();
  const iban = ''; // No IBAN for crypto
  await call('addAccount', { id, userId, name, currency, iban, balanceCents: 0, isPrimary: false });
  return { id, user_id: userId, name, currency, iban, balance_cents: 0, is_primary: false, created_at: new Date().toISOString() };
}

export async function getUserCryptoAccounts(userId: string): Promise<Account[]> {
  const accounts = await getUserAccounts(userId);
  return accounts.filter(a => a.currency !== 'EUR' && a.currency !== 'USD'); // Assume non-fiat are crypto
}

export async function transferToCrypto(fromAccountId: string, toCryptoAccountId: string, amountCents: number, symbol: string, priceEur: number, description: string) {
  await call('cryptoTrade', { fromAccountId, toCryptoAccountId, amountCents, symbol, priceEur, description, type: 'buy' });
}

export async function transferFromCrypto(fromCryptoAccountId: string, toAccountId: string, amount: number, symbol: string, priceEur: number, description: string) {
  const amountCents = Math.round(amount * priceEur * 100);
  await call('cryptoTrade', { fromCryptoAccountId, toAccountId, amount, symbol, priceEur, amountCents, description, type: 'sell' });
}

// Update existing getUserAccounts to include crypto if needed

</final_file_content>

No new problems detected after saving the file.

[attempt_completion] Result: DoneThe user has provided feedback on the results. Consider their input to continue the task, and then attempt completion again.<feedback>
done
</feedback>Project complete! All fixes and features (receipts, crypto with live API, realistic trades) are in. The Vercel build error was due to the placeholder in db.ts—now fixed with the full content. Deploy again; it should succeed. Test the app—it's ready! If more, let me know. 🎉