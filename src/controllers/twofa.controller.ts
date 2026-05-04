import { Request, Response } from 'express';
import { getUserById } from '../services/auth.service';
import {
  generateTotpSecret,
  generateTotpQrCode,
  verifyTotpCode,
  enableTotp,
  disableTotp,
  sendSmsCode,
  enableSms2FA,
  disableSms2FA,
  sendEmailCode,
  enableEmail2FA,
  disableEmail2FA,
  verifySmsOrEmailCode
} from '../services/twofa.service';
import { generateToken } from '../middleware/auth.middleware';

export const sendCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = (req as any).user;
    const { method } = req.body;

    if (!method || !['sms', 'email'].includes(method)) {
      res.status(400).json({ success: false, message: 'method must be "sms" or "email"' });
      return;
    }

    const user = await getUserById(userId);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    if (method === 'sms') {
      if (!user.sms_2fa_enabled) {
        res.status(400).json({ success: false, message: 'SMS 2FA is not enabled for this account' });
        return;
      }
      await sendSmsCode(userId, user.phone);
    } else {
      if (!user.email_2fa_enabled) {
        res.status(400).json({ success: false, message: 'Email 2FA is not enabled for this account' });
        return;
      }
      await sendEmailCode(userId, user.email);
    }

    res.json({ success: true, message: `Verification code sent via ${method}` });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed to send code' });
  }
};

export const verifyCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = (req as any).user;
    const { code, method } = req.body;

    if (!code || !method) {
      res.status(400).json({ success: false, message: 'code and method are required' });
      return;
    }

    const user = await getUserById(userId);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    let isValid = false;

    if (method === 'totp') {
      if (!user.totp_enabled || !user.totp_secret) {
        res.status(400).json({ success: false, message: 'TOTP is not enabled for this account' });
        return;
      }
      isValid = await verifyTotpCode(code, user.totp_secret);
    } else if (method === 'sms' || method === 'email') {
      isValid = await verifySmsOrEmailCode(userId, code, method);
    } else {
      res.status(400).json({ success: false, message: 'method must be "totp", "sms", or "email"' });
      return;
    }

    if (!isValid) {
      res.status(401).json({ success: false, message: 'Invalid or expired verification code' });
      return;
    }

    const token = generateToken(userId, 'authenticated');
    const { password_hash, totp_secret, ...safeUser } = user;

    res.json({ success: true, token, user: safeUser });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : '2FA verification failed' });
  }
};

export const setupTotp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = (req as any).user;
    const user = await getUserById(userId);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    const { secret, otpauthUrl } = await generateTotpSecret(user.username);
    const qrCode = await generateTotpQrCode(otpauthUrl);

    const { pool } = await import('../config/database');
    await pool.query('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, userId]);

    res.json({ success: true, qrCode, secret, message: 'Scan QR code with your authenticator app, then call /api/2fa/setup/totp/verify' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'TOTP setup failed' });
  }
};

export const verifyTotpSetup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = (req as any).user;
    const { code } = req.body;

    if (!code) { res.status(400).json({ success: false, message: 'code is required' }); return; }

    const user = await getUserById(userId);
    if (!user || !user.totp_secret) {
      res.status(400).json({ success: false, message: 'TOTP setup not initiated. Call /api/2fa/setup/totp first.' });
      return;
    }

    const isValid = await verifyTotpCode(code, user.totp_secret);
    if (!isValid) {
      res.status(401).json({ success: false, message: 'Invalid TOTP code' });
      return;
    }

    await enableTotp(userId, user.totp_secret);
    res.json({ success: true, message: 'TOTP (Google Authenticator) enabled successfully' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'TOTP verification failed' });
  }
};

export const setupSms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = (req as any).user;
    await enableSms2FA(userId);
    res.json({ success: true, message: 'SMS 2FA enabled successfully' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'SMS 2FA setup failed' });
  }
};

export const setupEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = (req as any).user;
    await enableEmail2FA(userId);
    res.json({ success: true, message: 'Email 2FA enabled successfully' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Email 2FA setup failed' });
  }
};

export const disableTotpHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = (req as any).user;
    await disableTotp(userId);
    res.json({ success: true, message: 'TOTP disabled' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed' });
  }
};

export const disableSmsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = (req as any).user;
    await disableSms2FA(userId);
    res.json({ success: true, message: 'SMS 2FA disabled' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed' });
  }
};

export const disableEmailHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = (req as any).user;
    await disableEmail2FA(userId);
    res.json({ success: true, message: 'Email 2FA disabled' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Failed' });
  }
};
