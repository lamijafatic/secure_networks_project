import { Router } from 'express';
import {
  sendCode,
  verifyCode,
  setupTotp,
  verifyTotpSetup,
  setupSms,
  setupEmail,
  disableTotpHandler,
  disableSmsHandler,
  disableEmailHandler
} from '../controllers/twofa.controller';
import { requireAuth, requirePartialAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * @openapi
 * /2fa/send:
 *   post:
 *     summary: Send a 2FA code via SMS or Email (during login)
 *     tags:
 *       - 2FA
 *     security:
 *       - partialBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [method]
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [sms, email]
 *                 example: sms
 *     responses:
 *       200:
 *         description: Code sent successfully
 *       400:
 *         description: Method not enabled or invalid
 *       401:
 *         description: Invalid or missing partial token
 */
router.post('/2fa/send', requirePartialAuth, sendCode);

/**
 * @openapi
 * /2fa/verify:
 *   post:
 *     summary: Verify 2FA code during login — returns full auth token
 *     tags:
 *       - 2FA
 *     security:
 *       - partialBearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, method]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *               method:
 *                 type: string
 *                 enum: [totp, sms, email]
 *     responses:
 *       200:
 *         description: 2FA verified — returns full auth token and user data
 *       401:
 *         description: Invalid or expired code
 */
router.post('/2fa/verify', requirePartialAuth, verifyCode);

/**
 * @openapi
 * /2fa/setup/totp:
 *   post:
 *     summary: Initiate TOTP setup — returns QR code
 *     tags:
 *       - 2FA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR code (data URL) and secret for scanning
 */
router.post('/2fa/setup/totp', requireAuth, setupTotp);

/**
 * @openapi
 * /2fa/setup/totp/verify:
 *   post:
 *     summary: Verify TOTP code and enable Google Authenticator
 *     tags:
 *       - 2FA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: TOTP enabled successfully
 *       401:
 *         description: Invalid code
 */
router.post('/2fa/setup/totp/verify', requireAuth, verifyTotpSetup);

/**
 * @openapi
 * /2fa/setup/sms:
 *   post:
 *     summary: Enable SMS 2FA
 *     tags:
 *       - 2FA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SMS 2FA enabled
 */
router.post('/2fa/setup/sms', requireAuth, setupSms);

/**
 * @openapi
 * /2fa/setup/email:
 *   post:
 *     summary: Enable Email 2FA
 *     tags:
 *       - 2FA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email 2FA enabled
 */
router.post('/2fa/setup/email', requireAuth, setupEmail);

/**
 * @openapi
 * /2fa/setup/totp:
 *   delete:
 *     summary: Disable TOTP
 *     tags:
 *       - 2FA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: TOTP disabled
 */
router.delete('/2fa/setup/totp', requireAuth, disableTotpHandler);

/**
 * @openapi
 * /2fa/setup/sms:
 *   delete:
 *     summary: Disable SMS 2FA
 *     tags:
 *       - 2FA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SMS 2FA disabled
 */
router.delete('/2fa/setup/sms', requireAuth, disableSmsHandler);

/**
 * @openapi
 * /2fa/setup/email:
 *   delete:
 *     summary: Disable Email 2FA
 *     tags:
 *       - 2FA
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email 2FA disabled
 */
router.delete('/2fa/setup/email', requireAuth, disableEmailHandler);

export default router;
