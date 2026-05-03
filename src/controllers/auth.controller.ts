import { Request, Response } from 'express';
import { registerUser, loginUser, verifyEmail } from '../services/auth.service';
import { generateToken } from '../middleware/auth.middleware';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, username, password, email, phone } = req.body;

    if (!fullName || !username || !password || !email || !phone) {
      res.status(400).json({ success: false, message: 'All fields are required: fullName, username, password, email, phone' });
      return;
    }

    const result = await registerUser({ fullName, username, password, email, phone });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: result
    });
  } catch (error: unknown) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Registration failed'
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      res.status(400).json({ success: false, message: 'Username/email and password are required' });
      return;
    }

    const { user, requiresTwoFactor } = await loginUser(usernameOrEmail, password);

    if (requiresTwoFactor) {
      const partialToken = generateToken(user.id, 'partial');

      const methods: string[] = [];
      if (user.totp_enabled) methods.push('totp');
      if (user.sms_2fa_enabled) methods.push('sms');
      if (user.email_2fa_enabled) methods.push('email');

      res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        partialToken,
        availableMethods: methods,
        message: 'Password verified. Please complete 2FA.'
      });
      return;
    }

    const token = generateToken(user.id, 'authenticated');
    res.status(200).json({ success: true, token, user });
  } catch (error: unknown) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Invalid credentials'
    });
  }
};

export const verifyEmailHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.params.token as string;
    await verifyEmail(token);
    res.status(200).json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (error: unknown) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Email verification failed'
    });
  }
};
