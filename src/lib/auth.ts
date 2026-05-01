import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { nextCookies } from "better-auth/next-js";
import { dash } from "@better-auth/infra";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendEmail, EMAIL_FROM } from "./email";

const trustedOrigins = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

export const auth = betterAuth({
  trustedOrigins: [trustedOrigins],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    additionalFields: {
      slug: {
        type: "string",
        required: false,
        unique: true,
      },
      stripeAccountId: {
        type: "string",
        required: false,
      },
      chargesEnabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const subject =
          type === "sign-in"
            ? "Your Merch Drop login code"
            : "Verify your email";
        await sendEmail({
          from: EMAIL_FROM,
          to: email,
          subject,
          text: `Your verification code is: ${otp}\n\nExpires in 5 minutes.`,
        });
      },
      otpLength: 6,
      expiresIn: 300,
      disableSignUp: false,
    }),
    nextCookies(),
    dash(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
