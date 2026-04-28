import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "./db";
import * as schema from "./db/schema";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  trustedOrigins: ["http://localhost:3000"],
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
        const result = await resend.emails.send({
          from: "Merch Drop <noreply@resend.dev>",
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
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
