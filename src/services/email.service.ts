import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const mailgunClient = axios.create({
  baseURL: `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}`,
  auth: {
    username: 'api',
    password: process.env.MAILGUN_API_KEY || ''
  }
});

const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  const params = new URLSearchParams();
  params.append('from', process.env.EMAIL_FROM || `postmaster@${process.env.MAILGUN_DOMAIN}`);
  params.append('to', to);
  params.append('subject', subject);
  params.append('html', html);

  await mailgunClient.post('/messages', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
};

export const sendVerificationEmail = async (to: string, token: string): Promise<void> => {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/api/verify-email/${token}`;

  await sendEmail(to, 'Verify your email address', `
    <h2>Email Verification</h2>
    <p>Click the link below to verify your email address. This link expires in <strong>15 minutes</strong>.</p>
    <a href="${verifyUrl}" style="background:#4F46E5;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;">
      Verify Email
    </a>
    <p>Or copy this link: <code>${verifyUrl}</code></p>
    <p>If you did not register, please ignore this email.</p>
  `);
};

export const sendTwoFaCodeEmail = async (to: string, code: string): Promise<void> => {
  await sendEmail(to, 'Your 2FA verification code', `
    <h2>Two-Factor Authentication Code</h2>
    <p>Your verification code is:</p>
    <h1 style="letter-spacing:8px;font-family:monospace;">${code}</h1>
    <p>This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
  `);
};
