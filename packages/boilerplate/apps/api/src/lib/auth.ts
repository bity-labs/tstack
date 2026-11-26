import { BetterAuth } from '@alchemy.run/better-auth';
import { expo } from '@better-auth/expo';
import { APIError } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins';
import { Context, Effect, Layer, Redacted } from 'effect';

export interface AuthOptions {
  // Omit only in Alchemy deployments to use its state-backed native secret.
  secret?: string | Redacted.Redacted<string>;
  baseURL: string;
  webOrigin: string;
  migrate?: boolean;
  sendEmail?: (message: {
    to: string;
    subject: string;
    text: string;
  }) => Promise<void>;
}

export const authOptions = (options: AuthOptions) => ({
  secret: options.secret,
  baseURL: options.baseURL,
  basePath: '/api/auth',
  trustedOrigins: [options.webOrigin, 'tstack://'],
  emailAndPassword: { enabled: true, minPasswordLength: 12 },
  advanced: {
    disableOriginCheck: false,
    disableCSRFCheck: false,
    // Cloudflare supplies this header at public ingress. Never trust a
    // caller-controlled X-Forwarded-For chain for authentication rate limits.
    ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  rateLimit: { enabled: true, storage: 'database' as const },
  plugins: [
    expo(),
    {
      id: 'await-email-delivery',
      init: () => ({
        context: {
          // The native default catches delivery errors, even without a
          // background handler. Propagate them before acknowledging a send.
          async runInBackgroundOrAwait(promise: Promise<unknown> | void) {
            await promise;
          },
        },
      }),
    },
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      storeOTP: 'hashed',
      resendStrategy: 'rotate',
      rateLimit: { window: 60, max: 3 },
      async sendVerificationOTP({ email, otp, type }) {
        const subjects = {
          'sign-in': 'Your sign-in code',
          'email-verification': 'Verify your email address',
          'forget-password': 'Reset your password',
          'change-email': 'Confirm your email change',
        };
        try {
          if (!options.sendEmail) throw new Error('Missing email transport');
          await options.sendEmail({
            to: email,
            subject: subjects[type],
            text: `Your code is ${otp}. It expires in 5 minutes. If you did not request this code, ignore this email.`,
          });
        } catch {
          throw new APIError('SERVICE_UNAVAILABLE', {
            message: 'Email delivery is unavailable. Please try again later.',
          });
        }
      },
    }),
  ],
  migrate: options.migrate ?? false,
});

const makeAuth = (options: AuthOptions) => BetterAuth(authOptions(options));

export class Auth extends Context.Service<
  Auth,
  Effect.Success<ReturnType<typeof makeAuth>>
>()('api/Auth') {}

export const authLayer = (options: AuthOptions) =>
  Layer.effect(Auth, makeAuth(options));
