import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { pool } from '../config/database';
import { RegisterData, User, DbUser } from '../types/user.types';
import {
  validateFullName,
  validateUsername,
  validatePassword,
  validateEmail,
  validatePhone,
  checkPasswordPwned
} from '../utils/validation.utils';
import { sendVerificationEmail } from './email.service';

const generateToken = (): string => crypto.randomBytes(32).toString('hex');

export const registerUser = async (data: RegisterData): Promise<Omit<User, 'passwordHash'>> => {
  const { fullName, username, password, email, phone } = data;

  const fullNameError = validateFullName(fullName);
  if (fullNameError) throw new Error(fullNameError);

  const [reservedRows] = await pool.query<any[]>('SELECT username FROM reserved_usernames');
  const reservedList: string[] = reservedRows.map((r: any) => r.username);
  const usernameError = validateUsername(username, reservedList);
  if (usernameError) throw new Error(usernameError);

  const [existingUsername] = await pool.query<any[]>(
    'SELECT id FROM users WHERE username = ?', [username]
  );
  if (existingUsername.length > 0) throw new Error('Username already exists');

  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  const isPwned = await checkPasswordPwned(password);
  if (isPwned) throw new Error('This password has been found in a data breach. Please choose a different password.');

  const emailError = await validateEmail(email);
  if (emailError) throw new Error(emailError);

  const [existingEmail] = await pool.query<any[]>(
    'SELECT id FROM users WHERE email = ?', [email]
  );
  if (existingEmail.length > 0) throw new Error('Email already exists');

  const phoneError = validatePhone(phone);
  if (phoneError) throw new Error(phoneError);

  const [existingPhone] = await pool.query<any[]>(
    'SELECT id FROM users WHERE phone = ?', [phone]
  );
  if (existingPhone.length > 0) throw new Error('Phone number already exists');

  const passwordHash = await bcrypt.hash(password, 12);

  const [result] = await pool.query<any>(
    `INSERT INTO users (full_name, username, email, phone, password_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [fullName.trim(), username, email.toLowerCase(), phone, passwordHash]
  );

  const userId: number = result.insertId;

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await pool.query(
    'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );

  await sendVerificationEmail(email, token);

  return {
    id: userId,
    fullName: fullName.trim(),
    username,
    email: email.toLowerCase(),
    phone,
    isVerified: false,
    isBlocked: false,
    createdAt: new Date()
  };
};

export const verifyEmail = async (token: string): Promise<void> => {
  const [rows] = await pool.query<any[]>(
    'SELECT * FROM email_verification_tokens WHERE token = ? AND used = FALSE',
    [token]
  );

  if (rows.length === 0) throw new Error('Invalid or already used verification link');

  const record = rows[0];
  if (new Date() > new Date(record.expires_at)) {
    throw new Error('Verification link has expired. Please register again.');
  }

  await pool.query('UPDATE email_verification_tokens SET used = TRUE WHERE id = ?', [record.id]);
  await pool.query('UPDATE users SET is_verified = TRUE WHERE id = ?', [record.user_id]);
};

export const loginUser = async (
  usernameOrEmail: string,
  password: string
): Promise<{ user: Omit<DbUser, 'password_hash'>; requiresTwoFactor: boolean }> => {
  const [rows] = await pool.query<any[]>(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [usernameOrEmail, usernameOrEmail]
  );

  if (rows.length === 0) throw new Error('Invalid credentials');

  const user: DbUser = rows[0];

  if (!user.is_verified) throw new Error('Please verify your email before logging in');
  if (user.is_blocked) throw new Error('Your account has been blocked. Please contact support.');

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) throw new Error('Invalid credentials');

  const has2FA = user.totp_enabled || user.sms_2fa_enabled || user.email_2fa_enabled;

  const { password_hash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, requiresTwoFactor: has2FA };
};

export const getUserById = async (id: number): Promise<DbUser | null> => {
  const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
};
