/**
 * Centralized mock data store — shared across all "users" via localStorage.
 * Acts as a fake in-memory database for offline testing.
 * 
 * All dashboard & admin pages read/write here until Supabase is wired up.
 */

const DB_KEY = 'agribank_mock_db';

// ---------- types ----------
export interface MockUser {
  id: string;
  email: string;
  fullName: string;
  password: string;
  frozen: boolean;
  createdAt: string;
}

export interface MockAccount {
  id: string;
  userId: string;
  name: string;
  type: 'current' | 'savings' | 'crypto';
  currency: 'EUR' | 'GBP' | 'USD' | 'CHF' | 'PLN';
  iban: string;
  balanceCents: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface MockTransaction {
  id: string;
  userId: string;
  accountId: string;
  direction: 'credit' | 'debit';
  amountCents: number;
  currency: string;
  description: string;
  category?: string;
  counterpartyName?: string;
  counterpartyIban?: string;
  network?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface MockKyc {
  id: string;
  userId: string;
  documentType: string | null;
  documentCountry: string | null;
  city: string | null;
  country: string | null;
  status: 'not_started' | 'pending' | 'verified' | 'rejected';
  submittedAt: string;
}

export interface MockAuditLog {
  id: string;
  action: string;
  adminEmail: string;
  targetEmail: string | null;
  amount: number | null;
  reason: string | null;
  createdAt: string;
}

export interface MockRecipient {
  id: string;
  userId: string;
  name: string;
  iban?: string;
  swiftBic?: string;
  bankName?: string;
  country?: string;
  currency: string;
  isFavorite: boolean;
  createdAt: string;
}

interface MockDB {
  users: MockUser[];
  accounts: MockAccount[];
  transactions: MockTransaction[];
  kyc: MockKyc[];
  auditLogs: MockAuditLog[];
  recipients: MockRecipient[];
}

// ---------- helpers ----------
function generateId(): string {
  return crypto.randomUUID?.() ?? 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
}

function generateIban(): string {
  let s = 'DE89';
  for (let i = 0; i < 14; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function getDB(): MockDB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { users: [], accounts: [], transactions: [], kyc: [], auditLogs: [], recipients: [] };
}

function saveDB(db: MockDB): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ---------- public API ----------

/** Register a new user — creates profile + EUR + USD accounts + welcome bonus */
export function registerUser(email: string, password: string, fullName?: string): MockUser {
  const db = getDB();

  // Check dupes
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('A user with this email already exists');
  }

  const userId = generateId();
  const eurAccountId = generateId();
  const usdAccountId = generateId();
  const now = new Date().toISOString();

  const user: MockUser = {
    id: userId,
    email: email.toLowerCase(),
    fullName: fullName || email.split('@')[0],
    password,
    frozen: false,
    createdAt: now,
  };

  const eurAccount: MockAccount = {
    id: eurAccountId,
    userId,
    name: 'Main account',
    type: 'current',
    currency: 'EUR',
    iban: generateIban(),
    balanceCents: 250000,
    isPrimary: true,
    createdAt: now,
  };

  const usdAccount: MockAccount = {
    id: usdAccountId,
    userId,
    name: 'USD account',
    type: 'current',
    currency: 'USD',
    iban: generateIban(),
    balanceCents: 100000,
    isPrimary: false,
    createdAt: now,
  };

  const welcomeTx: MockTransaction = {
    id: generateId(),
    userId,
    accountId: eurAccountId,
    direction: 'credit',
    amountCents: 250000,
    currency: 'EUR',
    description: 'Welcome bonus',
    category: 'Bonus',
    status: 'completed',
    createdAt: now,
  };

  db.users.push(user);
  db.accounts.push(eurAccount);
  db.accounts.push(usdAccount);
  db.transactions.push(welcomeTx);

  saveDB(db);
  return user;
}

/** Sign in — returns user if credentials match */
export function signInUser(email: string, password: string): MockUser {
  const db = getDB();
  const user = db.users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) throw new Error('Invalid email or password');
  return user;
}

// ---- queries ----

export function getAllUsers(): MockUser[] {
  return getDB().users;
}

export function getUserAccounts(userId: string): MockAccount[] {
  return getDB().accounts.filter(a => a.userId === userId);
}

export function getAllAccounts(): MockAccount[] {
  return getDB().accounts;
}

export function getUserTransactions(userId: string, limit = 5): MockTransaction[] {
  return getDB()
    .transactions
    .filter(t => t.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getAllTransactions(): MockTransaction[] {
  return getDB()
    .transactions
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getAllKyc(): MockKyc[] {
  return getDB().kyc;
}

export function getAllAuditLogs(): MockAuditLog[] {
  return getDB().auditLogs;
}

export function getUserById(userId: string): MockUser | undefined {
  return getDB().users.find(u => u.id === userId);
}

// ---- recipients ----

export function getUserRecipients(userId: string): MockRecipient[] {
  return getDB()
    .recipients
    .filter(r => r.userId === userId)
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
}

export function addRecipient(recipient: Omit<MockRecipient, 'id' | 'createdAt'>): MockRecipient {
  const db = getDB();
  const r: MockRecipient = {
    ...recipient,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  db.recipients.push(r);
  saveDB(db);
  return r;
}

export function toggleRecipientFavorite(id: string, userId: string): void {
  const db = getDB();
  const r = db.recipients.find(rec => rec.id === id && rec.userId === userId);
  if (r) {
    r.isFavorite = !r.isFavorite;
    saveDB(db);
  }
}

export function deleteRecipient(id: string, userId: string): void {
  const db = getDB();
  db.recipients = db.recipients.filter(r => !(r.id === id && r.userId === userId));
  saveDB(db);
}

// ---- mutations (admin) ----

export function addAuditLog(log: Omit<MockAuditLog, 'id' | 'createdAt'>): void {
  const db = getDB();
  db.auditLogs.push({
    ...log,
    id: generateId(),
    createdAt: new Date().toISOString(),
  });
  saveDB(db);
}

export function updateBalance(accountId: string, newBalanceCents: number): MockAccount | null {
  const db = getDB();
  const account = db.accounts.find(a => a.id === accountId);
  if (!account) return null;
  account.balanceCents = newBalanceCents;
  saveDB(db);
  return account;
}

export function addTransaction(tx: Omit<MockTransaction, 'id' | 'createdAt'>): MockTransaction {
  const db = getDB();
  const fullTx: MockTransaction = {
    ...tx,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  db.transactions.push(fullTx);
  saveDB(db);
  return fullTx;
}

export function updateTransactionStatus(txId: string, status: MockTransaction['status']): MockTransaction | null {
  const db = getDB();
  const tx = db.transactions.find(t => t.id === txId);
  if (!tx) return null;
  tx.status = status;
  saveDB(db);
  return tx;
}

export function submitKyc(kyc: Omit<MockKyc, 'id' | 'submittedAt' | 'status'>): MockKyc {
  const db = getDB();
  const newKyc: MockKyc = {
    ...kyc,
    id: generateId(),
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };
  db.kyc.push(newKyc);
  saveDB(db);
  return newKyc;
}

export function updateKycStatus(kycId: string, status: MockKyc['status']): void {
  const db = getDB();
  const kyc = db.kyc.find(k => k.id === kycId);
  if (kyc) kyc.status = status;
  saveDB(db);
}

export function toggleUserFreeze(userId: string): MockUser | null {
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return null;
  user.frozen = !user.frozen;
  saveDB(db);
  return user;
}

export function deleteUser(userId: string): void {
  const db = getDB();
  db.users = db.users.filter(u => u.id !== userId);
  db.accounts = db.accounts.filter(a => a.userId !== userId);
  db.transactions = db.transactions.filter(t => t.userId !== userId);
  db.kyc = db.kyc.filter(k => k.userId !== userId);
  saveDB(db);
}

export function isUserFrozen(userId: string): boolean {
  const user = getDB().users.find(u => u.id === userId);
  return user?.frozen ?? false;
}

export function getPrimaryAccount(userId: string): MockAccount | undefined {
  return getDB().accounts.find(a => a.userId === userId && a.isPrimary);
}

// ---- crypto prices (mock) ----
export interface MockCryptoCoin {
  id: string;
  symbol: string;
  name: string;
  price_eur: number;
  change_24h: number;
}

export function getMockCryptoPrices(): MockCryptoCoin[] {
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
