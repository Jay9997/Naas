import mysql from 'mysql2/promise';
import type { Wallet } from '@/types/wallet';

// Create connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function getWallets(): Promise<Wallet[]> {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM wallets ORDER BY created_at DESC'
    );
    return (rows as any[]).map(row => ({
      address: row.address,
      label: row.label,
      hasLicenses: Boolean(row.has_licenses),
      verified: Boolean(row.verified),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    }));
  } catch (error) {
    console.error('Error fetching wallets:', error);
    throw error;
  }
}

export async function getWalletByAddress(address: string): Promise<Wallet | null> {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM wallets WHERE LOWER(address) = LOWER(?)',
      [address]
    );
    
    if (!(rows as any[]).length) return null;
    
    const row = (rows as any[])[0];
    return {
      address: row.address,
      label: row.label,
      hasLicenses: Boolean(row.has_licenses),
      verified: Boolean(row.verified),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  } catch (error) {
    console.error('Error fetching wallet:', error);
    throw error;
  }
}

export async function createWallet(wallet: {
  address: string;
  label: string;
  has_licenses?: boolean;
  verified?: boolean;
}): Promise<Wallet> {
  try {
    const [result] = await pool.execute(
      'INSERT INTO wallets (address, label, has_licenses, verified) VALUES (LOWER(?), ?, ?, ?)',
      [
        wallet.address,
        wallet.label,
        wallet.has_licenses || false,
        wallet.verified || false
      ]
    );
    
    return getWalletByAddress(wallet.address) as Promise<Wallet>;
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw error;
  }
}

export async function updateWallet(
  address: string,
  updates: { label?: string; has_licenses?: boolean; verified?: boolean }
): Promise<Wallet> {
  try {
    const setClause = [];
    const values = [];

    if (updates.label !== undefined) {
      setClause.push('label = ?');
      values.push(updates.label);
    }
    if (updates.has_licenses !== undefined) {
      setClause.push('has_licenses = ?');
      values.push(updates.has_licenses);
    }
    if (updates.verified !== undefined) {
      setClause.push('verified = ?');
      values.push(updates.verified);
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(address.toLowerCase());

    await pool.execute(
      `UPDATE wallets SET ${setClause.join(', ')} WHERE LOWER(address) = LOWER(?)`,
      values
    );
    
    return getWalletByAddress(address) as Promise<Wallet>;
  } catch (error) {
    console.error('Error updating wallet:', error);
    throw error;
  }
}