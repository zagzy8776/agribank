// Vercel serverless function — connects to Render PostgreSQL
// Deploy with Node.js runtime, not Edge

const DATABASE_URL = process.env.DATABASE_URL || '';

async function query(sql: string, params: any[] = []): Promise<any[]> {
  // Use fetch-based SQL over HTTP for serverless compatibility
  // Render doesn't expose HTTP SQL endpoint, so we use pg directly
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 8000,
    connectionTimeoutMillis: 5000,
  });
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } finally {
    await pool.end();
  }
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { action, data } = req.body;

    switch (action) {
      // ---- MIGRATE ----
      case 'migrate': {
        await query(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            password TEXT NOT NULL,
            frozen BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now()
          )
        `);
        await query(`
          CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            currency TEXT DEFAULT 'EUR',
            iban TEXT,
            balance_cents BIGINT DEFAULT 0,
            is_primary BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now()
          )
        `);
        await query(`
          CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
            direction TEXT NOT NULL,
            amount_cents BIGINT NOT NULL,
            currency TEXT DEFAULT 'EUR',
            description TEXT,
            category TEXT,
            counterparty_name TEXT,
            counterparty_iban TEXT,
            network TEXT,
            status TEXT DEFAULT 'completed',
            created_at TIMESTAMPTZ DEFAULT now()
          )
        `);
        await query(`
          CREATE TABLE IF NOT EXISTS kyc_verifications (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            document_type TEXT,
            document_country TEXT,
            city TEXT,
            country TEXT,
            status TEXT DEFAULT 'pending',
            submitted_at TIMESTAMPTZ DEFAULT now()
          )
        `);
        await query(`
          CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            admin_email TEXT NOT NULL,
            target_email TEXT,
            amount BIGINT DEFAULT 0,
            reason TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
          )
        `);
        await query(`
          CREATE TABLE IF NOT EXISTS recipients (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            iban TEXT,
            swift_bic TEXT,
            bank_name TEXT,
            country TEXT,
            currency TEXT DEFAULT 'EUR',
            is_favorite BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now()
          )
        `);
        return res.json({ success: true, message: 'Tables created' });
      }

      // ---- REGISTER ----
      case 'register': {
        const { id, email, fullName, password } = data;
        await query(`INSERT INTO users (id, email, full_name, password) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING`, [id, email, fullName, password]);
        // Create EUR account
        const acctId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
        const iban = 'DE89' + Array.from({length:14}, () => Math.floor(Math.random()*10)).join('');
        await query(`INSERT INTO accounts (id, user_id, name, currency, iban, balance_cents, is_primary) VALUES ($1,$2,'Main account','EUR',$3,250000,true)`, [acctId, id, iban]);
        // Create USD account
        const usdId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
        const usdIban = 'DE89' + Array.from({length:14}, () => Math.floor(Math.random()*10)).join('');
        await query(`INSERT INTO accounts (id, user_id, name, currency, iban, balance_cents, is_primary) VALUES ($1,$2,'USD account','USD',$3,100000,false)`, [usdId, id, usdIban]);
        // Welcome tx
        await query(`INSERT INTO transactions (id, user_id, account_id, direction, amount_cents, currency, description, category, status) VALUES ($1,$2,$3,'credit',250000,'EUR','Welcome bonus','Bonus','completed')`, [crypto.randomUUID?.() || Math.random().toString(36).slice(2), id, acctId]);
        return res.json({ success: true });
      }

      // ---- ADMIN LOGIN ----
      case 'adminLogin': {
        const { email, password } = data;
        const rows = await query(`SELECT * FROM users WHERE email = $1 AND password = $2`, [email, password]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid admin credentials' });
        return res.json({ success: true, user: rows[0] });
      }

      // ---- SIGN IN ----
      case 'signin': {
        const { email, password } = data;
        const rows = await query(`SELECT * FROM users WHERE email = $1 AND password = $2`, [email, password]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        return res.json({ user: rows[0] });
      }

      // ---- GET ALL USERS ----
      case 'getAllUsers': {
        const rows = await query(`SELECT * FROM users ORDER BY created_at DESC`);
        return res.json({ users: rows });
      }

      // ---- GET USER ACCOUNTS ----
      case 'getUserAccounts': {
        const rows = await query(`SELECT * FROM accounts WHERE user_id = $1`, [data.userId]);
        return res.json({ accounts: rows });
      }

      // ---- GET ALL ACCOUNTS ----
      case 'getAllAccounts': {
        const rows = await query(`SELECT * FROM accounts`);
        return res.json({ accounts: rows });
      }

      // ---- GET ALL TRANSACTIONS ----
      case 'getAllTransactions': {
        const rows = await query(`SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100`);
        return res.json({ transactions: rows });
      }

      // ---- GET ALL KYC ----
      case 'getAllKyc': {
        const rows = await query(`SELECT * FROM kyc_verifications ORDER BY submitted_at DESC`);
        return res.json({ kyc: rows });
      }

      // ---- GET AUDIT LOGS ----
      case 'getAuditLogs': {
        const rows = await query(`SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100`);
        return res.json({ logs: rows });
      }

      // ---- UPDATE BALANCE ----
      case 'updateBalance': {
        await query(`UPDATE accounts SET balance_cents = $1 WHERE id = $2`, [data.balanceCents, data.accountId]);
        return res.json({ success: true });
      }

      // ---- ADD TRANSACTION ----
      case 'addTransaction': {
        const { id, userId, accountId, direction, amountCents, currency, description, category, counterpartyName, counterpartyIban, network, status } = data;
        await query(`INSERT INTO transactions (id, user_id, account_id, direction, amount_cents, currency, description, category, counterparty_name, counterparty_iban, network, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [id, userId, accountId, direction, amountCents, currency, description, category, counterpartyName, counterpartyIban, network, status || 'completed']);
        return res.json({ success: true });
      }

      // ---- ADD AUDIT LOG ----
      case 'addAuditLog': {
        const { id, action, adminEmail, targetEmail, amount, reason } = data;
        await query(`INSERT INTO admin_audit_logs (id, action, admin_email, target_email, amount, reason) VALUES ($1,$2,$3,$4,$5,$6)`, [id, action, adminEmail, targetEmail, amount || 0, reason]);
        return res.json({ success: true });
      }

      // ---- TOGGLE FREEZE ----
      case 'toggleFreeze': {
        const { userId } = data;
        const rows = await query(`UPDATE users SET frozen = NOT frozen WHERE id = $1 RETURNING *`, [userId]);
        return res.json({ user: rows[0] });
      }

      // ---- DELETE USER ----
      case 'deleteUser': {
        await query(`DELETE FROM users WHERE id = $1`, [data.userId]);
        return res.json({ success: true });
      }

      // ---- UPDATE KYC STATUS ----
      case 'updateKycStatus': {
        await query(`UPDATE kyc_verifications SET status = $1 WHERE id = $2`, [data.status, data.kycId]);
        return res.json({ success: true });
      }

      // ---- SUBMIT KYC ----
      case 'submitKyc': {
        const { id, userId, documentType, documentCountry, city, country } = data;
        await query(`INSERT INTO kyc_verifications (id, user_id, document_type, document_country, city, country, status) VALUES ($1,$2,$3,$4,$5,$6,'pending')`, [id, userId, documentType, documentCountry, city, country]);
        return res.json({ success: true });
      }

      // ---- ADD RECIPIENT ----
      case 'addRecipient': {
        const { id, userId, name, iban, swiftBic, bankName, country, currency } = data;
        await query(`INSERT INTO recipients (id, user_id, name, iban, swift_bic, bank_name, country, currency) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [id, userId, name, iban, swiftBic, bankName, country, currency || 'EUR']);
        return res.json({ success: true });
      }

      // ---- GET RECIPIENTS ----
      case 'getRecipients': {
        const rows = await query(`SELECT * FROM recipients WHERE user_id = $1 ORDER BY is_favorite DESC, created_at DESC`, [data.userId]);
        return res.json({ recipients: rows });
      }

      default:
        return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}