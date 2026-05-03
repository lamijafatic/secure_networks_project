export interface RegisterData {
  fullName: string;
  username: string;
  password: string;
  email: string;
  phone: string;
}

export interface User {
  id?: number;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  passwordHash?: string;
  isVerified?: boolean;
  isBlocked?: boolean;
  createdAt?: Date;
}

export interface DbUser {
  id: number;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  password_hash: string;
  is_verified: boolean;
  is_blocked: boolean;
  totp_secret: string | null;
  totp_enabled: boolean;
  sms_2fa_enabled: boolean;
  email_2fa_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface JwtPayload {
  userId: number;
  type: 'partial' | 'authenticated';
}
