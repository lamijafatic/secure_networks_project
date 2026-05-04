import { Router } from 'express';
import { register, login, verifyEmailHandler } from '../controllers/auth.controller';

const router = Router();

/**
 * @openapi
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, username, password, email, phone]
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: "Jane Doe"
 *               username:
 *                 type: string
 *                 minLength: 4
 *                 example: "janedoe"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "SecurePass1!"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *               phone:
 *                 type: string
 *                 example: "+38761000000"
 *     responses:
 *       201:
 *         description: Registration successful — verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Registration successful. Please check your email to verify your account."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     username: { type: string }
 *                     email: { type: string }
 *                     isVerified: { type: boolean }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 message: { type: string, example: "Password must contain at least 1 special character" }
 */
router.post('/register', register);

/**
 * @openapi
 * /login:
 *   post:
 *     summary: Login with username or email
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usernameOrEmail, password]
 *             properties:
 *               usernameOrEmail:
 *                 type: string
 *                 example: "janedoe"
 *               password:
 *                 type: string
 *                 example: "SecurePass1!"
 *     responses:
 *       200:
 *         description: Login successful (or 2FA required)
 *         content:
 *           application/json:
 *             examples:
 *               noTwoFactor:
 *                 summary: Login success (no 2FA)
 *                 value:
 *                   success: true
 *                   token: "eyJ..."
 *                   user: { id: 1, username: "janedoe", email: "jane@example.com" }
 *               twoFactorRequired:
 *                 summary: 2FA required
 *                 value:
 *                   success: true
 *                   requiresTwoFactor: true
 *                   partialToken: "eyJ..."
 *                   availableMethods: ["sms", "totp"]
 *                   message: "Password verified. Please complete 2FA."
 *       400:
 *         description: Missing fields
 *       401:
 *         description: Invalid credentials / unverified / blocked
 */
router.post('/login', login);

/**
 * @openapi
 * /verify-email/{token}:
 *   get:
 *     summary: Verify email address via link sent after registration
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token (single-use, expires 15 min)
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Email verified successfully. You can now log in." }
 *       400:
 *         description: Invalid, used, or expired token
 */
router.get('/verify-email/:token', verifyEmailHandler);

export default router;
