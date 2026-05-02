... (existing content)

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
