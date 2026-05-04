import * as otplib from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { pool } from '../config/database';
import { sendTwoFaCodeEmail } from './email.service';
import { sendSms } from './sms.service';

const CODE_TTL_MS = 5 * 60 * 1000;

export const generateTotpSecret = async (
  username: string
): Promise<{ secret: string; otpauthUrl: string }> => {
  const secret = await otplib.generateSecret();
  const issuer = process.env.APP_NAME || 'AuthSystem';
  const otpauthUrl = await otplib.generateURI({
    secret,
    issuer,
    label: `${issuer}:${username}`
  });
  return { secret, otpauthUrl };
};

export const generateTotpQrCode = async (otpauthUrl: string): Promise<string> => {
  return QRCode.toDataURL(otpauthUrl);
};

export const verifyTotpCode = async (token: string, secret: string): Promise<boolean> => {
  try {
    const result = await otplib.verify({ strategy: 'totp', secret, token });
    return result.valid;
  } catch {
    return false;
  }
};

export const enableTotp = async (userId: number, secret: string): Promise<void> => {
  await pool.query(
    'UPDATE users SET totp_secret = ?, totp_enabled = TRUE WHERE id = ?',
    [secret, userId]
  );
};

export const disableTotp = async (userId: number): Promise<void> => {
  await pool.query(
    'UPDATE users SET totp_secret = NULL, totp_enabled = FALSE WHERE id = ?',
    [userId]
  );
};

export const sendSmsCode = async (userId: number, phone: string): Promise<void> => {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await pool.query(
    'UPDATE two_fa_codes SET used = TRUE WHERE user_id = ? AND method = ? AND used = FALSE',
    [userId, 'sms']
  );
  await pool.query(
    'INSERT INTO two_fa_codes (user_id, code, method, expires_at) VALUES (?, ?, ?, ?)',
    [userId, code, 'sms', expiresAt]
  );

  await sendSms(phone, code);
};

export const enableSms2FA = async (userId: number): Promise<void> => {
  await pool.query('UPDATE users SET sms_2fa_enabled = TRUE WHERE id = ?', [userId]);
};

export const disableSms2FA = async (userId: number): Promise<void> => {
  await pool.query('UPDATE users SET sms_2fa_enabled = FALSE WHERE id = ?', [userId]);
};

export const sendEmailCode = async (userId: number, email: string): Promise<void> => {
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await pool.query(
    'UPDATE two_fa_codes SET used = TRUE WHERE user_id = ? AND method = ? AND used = FALSE',
    [userId, 'email']
  );
  await pool.query(
    'INSERT INTO two_fa_codes (user_id, code, method, expires_at) VALUES (?, ?, ?, ?)',
    [userId, code, 'email', expiresAt]
  );

  await sendTwoFaCodeEmail(email, code);
};

export const enableEmail2FA = async (userId: number): Promise<void> => {
  await pool.query('UPDATE users SET email_2fa_enabled = TRUE WHERE id = ?', [userId]);
};

export const disableEmail2FA = async (userId: number): Promise<void> => {
  await pool.query('UPDATE users SET email_2fa_enabled = FALSE WHERE id = ?', [userId]);
};

export const verifySmsOrEmailCode = async (
  userId: number,
  code: string,
  method: 'sms' | 'email'
): Promise<boolean> => {
  const [rows] = await pool.query<any[]>(
    `SELECT * FROM two_fa_codes
     WHERE user_id = ? AND method = ? AND used = FALSE
     ORDER BY created_at DESC LIMIT 1`,
    [userId, method]
  );

  if (rows.length === 0) return false;
  const record = rows[0];
  if (new Date() > new Date(record.expires_at)) return false;
  if (record.code !== code) return false;

  await pool.query('UPDATE two_fa_codes SET used = TRUE WHERE id = ?', [record.id]);
  return true;
};
